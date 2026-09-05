/**
 * Self-hosted Better Auth for THIS app (server-only).
 *
 * Passwordless email OTP is the primary login path. Optional Google/X (native or
 * Grok broker) when credentials are set. Grok preview broker is never used once
 * DATABASE_URL is set (Railway).
 *
 * NEVER import this from client code — it pulls in `pg` + the preview secret +
 * server-only Better Auth internals. The client uses `@/lib/auth/client`.
 */
import { betterAuth } from "better-auth";
import { bearer, emailOTP, genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { sendOtpEmail } from "../email/send";
import { emailOtpEnabled } from "./email-otp";
import { GATE_PROVIDER_ID, gateIdentitySessions } from "./gate-session.server";
import { GROK_PROVIDERS } from "./providers";
import { pgliteDialect } from "./pglite-dialect";
import {
  GROK_ISSUER_DEFAULT,
  PREVIEW_ALLOWED_HOSTS,
  PREVIEW_CLIENT_ID,
  PREVIEW_CLIENT_SECRET,
} from "./preview";
import {
  PRODUCTION_ALLOWED_HOSTS,
  readEnv,
  resolvePublicOrigin,
} from "./production-url";
import {
  ensureUserTrial,
  forceEmailUnverifiedUnlessNip,
} from "./trial-db.server";

// Kick (and share) PGLite bootstrap as soon as the auth server module loads.
void ensureDbReady();

/**
 * Preview secret must outlive module reloads: PGLite (and its session rows) is
 * stored on `globalThis`, so an HMR re-eval of this file must NOT mint a new
 * signing secret or every existing session becomes invalid mid-dev. Process
 * restart clears both the secret and PGLite together.
 */
const globalAuthRef = globalThis as typeof globalThis & {
  __grokAuthPreviewSecret__?: string;
};
function previewAuthSecret(): string {
  globalAuthRef.__grokAuthPreviewSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__grokAuthPreviewSecret__;
}

/** Read an env var, treating empty/whitespace as unset. */
const env = (key: string): string | undefined => readEnv(key);

// Explicit off-switch. The deployer sets `VITE_AUTH_ENABLED=true` when it
// provisions auth; set it to "false" to force auth off everywhere (dev user).
const authDisabled = env("VITE_AUTH_ENABLED") === "false";

const databaseUrl = env("DATABASE_URL");

// Two deploy paths (see README + `./providers`):
//   * Grok broker: explicit GROK_AUTH_CLIENT_ID + GROK_AUTH_CLIENT_SECRET
//     (or baked preview client when there is NO Postgres URL — live preview).
//   * Native social: GOOGLE_CLIENT_* / TWITTER_CLIENT_* (Railway / self-host).
// Never fall back to the preview broker client once DATABASE_URL is set —
// that client only allows *.grok-sandbox.com callbacks and 500s on Railway.
const explicitGrokClientId = env("GROK_AUTH_CLIENT_ID");
const explicitGrokClientSecret = env("GROK_AUTH_CLIENT_SECRET");
const explicitBroker = Boolean(explicitGrokClientId && explicitGrokClientSecret);

const googleClientId = env("GOOGLE_CLIENT_ID");
const googleClientSecret = env("GOOGLE_CLIENT_SECRET");
const twitterClientId = env("TWITTER_CLIENT_ID");
const twitterClientSecret = env("TWITTER_CLIENT_SECRET");
const googleSocial = Boolean(googleClientId && googleClientSecret);
const twitterSocial = Boolean(twitterClientId && twitterClientSecret);
const hasNativeSocial = googleSocial || twitterSocial;

const usePreviewBroker =
  !authDisabled && !explicitBroker && !hasNativeSocial && !databaseUrl;

const brokerActive = !authDisabled && (explicitBroker || usePreviewBroker);
const grokIssuer = env("GROK_AUTH_ISSUER") ?? GROK_ISSUER_DEFAULT;
const grokClientId = explicitBroker
  ? (explicitGrokClientId as string)
  : usePreviewBroker
    ? PREVIEW_CLIENT_ID
    : undefined;
const grokClientSecret = explicitBroker
  ? (explicitGrokClientSecret as string)
  : usePreviewBroker
    ? PREVIEW_CLIENT_SECRET
    : undefined;

/** True when federated / social / email-OTP sign-in is active (real auth enforced). */
export const authConfigured =
  !authDisabled &&
  (brokerActive || hasNativeSocial || emailOtpEnabled);

// This app's own Better Auth origin. When deployed the deployer injects the
// public URL. In the sandbox live preview there's no fixed URL (each preview gets
// a dynamic `*.grok-sandbox.com` host), so we hand Better Auth a dynamic baseURL.
const explicitBaseURL = resolvePublicOrigin();
const previewAllowedHosts: string[] = [...PREVIEW_ALLOWED_HOSTS];
const productionAllowedHosts: string[] = [...PRODUCTION_ALLOWED_HOSTS];
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];
const baseURL = explicitBaseURL ?? {
  allowedHosts: [
    ...previewAllowedHosts,
    ...productionAllowedHosts,
    "localhost",
    "127.0.0.1",
    "[::1]",
  ],
  protocol: "auto" as const,
  fallback: "http://localhost:8080",
};

const trustedOrigins: string[] = [
  ...(explicitBaseURL ? [explicitBaseURL] : []),
  ...previewAllowedHosts,
  ...productionAllowedHosts,
  ...previewAllowedHosts.flatMap((host) => [`https://${host}`, `http://${host}`]),
  ...productionAllowedHosts.flatMap((host) => [`https://${host}`, `http://${host}`]),
  ...LOCAL_DEV_ORIGINS,
];

if (databaseUrl && !authDisabled) {
  const problems: string[] = [];
  if (!env("BETTER_AUTH_SECRET")) {
    problems.push(
      "BETTER_AUTH_SECRET is unset — set a long random secret in the host env.",
    );
  }
  if (!explicitBaseURL) {
    problems.push(
      "BETTER_AUTH_URL is unset (and no RAILWAY_PUBLIC_DOMAIN / RAILWAY_STATIC_URL). " +
        "Set BETTER_AUTH_URL to the public https origin, e.g. " +
        "https://olivo-production.up.railway.app",
    );
  }
  if (!authConfigured) {
    problems.push(
      "No sign-in path: enable email OTP, or set GOOGLE_CLIENT_* / GROK_AUTH_*.",
    );
  }
  for (const msg of problems) {
    console.error(`[auth] ${msg}`);
  }
}

const issuerBase = grokIssuer.replace(/\/+$/, "");
const grokAuthorizationUrl = `${issuerBase}/api/auth/oauth2/authorize`;
const grokTokenUrl = `${issuerBase}/api/auth/oauth2/token`;
const grokUserInfoUrl = `${issuerBase}/api/auth/oauth2/userinfo`;

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

/** Session token cookie name — also read by the live-preview popup completion page. */
export const SESSION_TOKEN_COOKIE = "__Host-grok-auth.session_token";

const grokOAuthPlugin = brokerActive && grokClientId && grokClientSecret
  ? genericOAuth({
      config: GROK_PROVIDERS.map(({ providerId, idp }) => ({
        providerId,
        clientId: grokClientId,
        clientSecret: grokClientSecret,
        authorizationUrl: grokAuthorizationUrl,
        tokenUrl: grokTokenUrl,
        userInfoUrl: grokUserInfoUrl,
        scopes: ["openid", "profile", "email"],
        authorizationUrlParams: { idp, prompt: "login" },
      })),
    })
  : null;

const emailOtpPlugin = emailOtpEnabled
  ? emailOTP({
      otpLength: 6,
      expiresIn: 600,
      storeOTP: "hashed",
      // Login OTP proves mailbox control for sign-in only. Post-trial unlock uses
      // a separate NIP in user_trials (see trial.server.ts).
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in") {
          console.info(`[auth] ignoring email OTP type=${type} for ${email}`);
          return;
        }
        const sent = await sendOtpEmail({ to: email, otp, purpose: "login" });
        if (!sent.ok) {
          console.error("[auth] login OTP email failed", sent.error);
        }
      },
    })
  : null;

export const auth = betterAuth({
  baseURL,
  secret: env("BETTER_AUTH_SECRET") ?? previewAuthSecret(),
  database,
  trustedOrigins,

  ...(hasNativeSocial
    ? {
        socialProviders: {
          ...(googleSocial
            ? {
                google: {
                  clientId: googleClientId as string,
                  clientSecret: googleClientSecret as string,
                },
              }
            : {}),
          ...(twitterSocial
            ? {
                twitter: {
                  clientId: twitterClientId as string,
                  clientSecret: twitterClientSecret as string,
                },
              }
            : {}),
        },
      }
    : {}),

  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: [
        ...(brokerActive ? GROK_PROVIDERS.map((p) => p.providerId) : []),
        ...(googleSocial ? (["google"] as const) : []),
        ...(twitterSocial ? (["twitter"] as const) : []),
        GATE_PROVIDER_ID,
      ],
      requireLocalEmailVerified: false,
    },
  },

  session: { cookieCache: { enabled: true, maxAge: 300 } },

  // Better Auth emailOTP sets emailVerified=true on sign-in; we roll that back
  // until the post-trial NIP confirms (user_trials.verified_at).
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await ensureUserTrial(user.id);
            await forceEmailUnverifiedUnlessNip(user.id);
          } catch (err) {
            console.error("[auth] trial bootstrap failed", err);
          }
        },
      },
      update: {
        after: async (user) => {
          try {
            await ensureUserTrial(user.id);
            await forceEmailUnverifiedUnlessNip(user.id);
          } catch (err) {
            console.error("[auth] trial sync failed", err);
          }
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          try {
            await ensureUserTrial(session.userId);
          } catch (err) {
            console.error("[auth] trial on session failed", err);
          }
        },
      },
    },
  },

  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-grok-auth.session_data" },
      account_data: { name: "__Host-grok-auth.account_data" },
      dont_remember: { name: "__Host-grok-auth.dont_remember" },
    },
  },

  plugins: [
    gateIdentitySessions(),
    ...(grokOAuthPlugin ? [grokOAuthPlugin] : []),
    ...(emailOtpPlugin ? [emailOtpPlugin] : []),
    bearer(),
    tanstackStartCookies(),
  ],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

export { GROK_PROVIDERS } from "./providers";
