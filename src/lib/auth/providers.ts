/**
 * Sign-in providers for BOTH the server and the client UI.
 *
 * Two paths:
 *   1. **Grok auth broker** (`genericOAuth`) — used in the live preview and when
 *      the deployer injects `GROK_AUTH_*`. Provider ids are `grok-google` /
 *      `grok-x`; callbacks live under `/api/auth/oauth2/callback/<id>`.
 *   2. **Native Better Auth socialProviders** — used on Railway / self-host when
 *      `GOOGLE_CLIENT_*` / `TWITTER_CLIENT_*` are set (see README). Provider ids
 *      are `google` / `twitter`; callbacks live under
 *      `/api/auth/callback/<id>`.
 *
 * Kept dependency-free so the client can import it without pulling `pg` /
 * Better Auth server into the browser bundle.
 */

export type SignInKind = "oauth2" | "social";

export type SignInProvider = {
  /** Better Auth provider id (path segment + client `providerId` / `provider`). */
  providerId: string;
  /** Human label for the sign-in button. */
  label: string;
  /** `oauth2` = broker genericOAuth; `social` = Better Auth socialProviders. */
  kind: SignInKind;
};

/** Broker upstreams (genericOAuth). `idp` is the hint the broker forwards. */
export type GrokProvider = SignInProvider & {
  kind: "oauth2";
  idp: string;
};

export const GROK_PROVIDERS: readonly GrokProvider[] = [
  { providerId: "grok-google", idp: "google", label: "Google", kind: "oauth2" },
  { providerId: "grok-x", idp: "twitter", label: "X", kind: "oauth2" },
];

/** Native Better Auth social providers (README / Railway). */
export const SOCIAL_PROVIDERS: readonly SignInProvider[] = [
  { providerId: "google", label: "Google", kind: "social" },
  { providerId: "twitter", label: "X", kind: "social" },
];

/**
 * Which provider list the login UI should render.
 *
 * - Live preview (`*.grok-sandbox.com`) or `VITE_AUTH_BROKER=true` → broker.
 * - Otherwise (Railway / local with Google env) → native social buttons.
 */
export function resolveUiProviders(opts: {
  livePreview: boolean;
  preferBroker: boolean;
  nativeSocial?: boolean;
}): readonly SignInProvider[] {
  // Real Grok broker only (live preview uses baked preview client; deployed
  // broker needs VITE_AUTH_BROKER=true + real GROK_AUTH_*). Otherwise hide
  // OAuth buttons so Railway users are not sent to sign-in/oauth2 → 500.
  if (opts.livePreview || opts.preferBroker) return GROK_PROVIDERS;
  // Native Google/X buttons only when the build opts in (pair with GOOGLE_* env).
  if (opts.nativeSocial) return SOCIAL_PROVIDERS;
  return [];
}
