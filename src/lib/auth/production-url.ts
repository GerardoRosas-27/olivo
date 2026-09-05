/**
 * Resolve this app's public origin for Better Auth in production deploys.
 *
 * Prefer an explicit `BETTER_AUTH_URL`. On Railway, fall back to
 * `RAILWAY_PUBLIC_DOMAIN` / `RAILWAY_STATIC_URL` so OAuth redirect_uri and
 * trustedOrigins match the live host even when the deployer forgot the
 * dedicated Better Auth var.
 *
 * Pure helpers — safe to unit-test without loading Better Auth / pg.
 */

/** Read an env var, treating empty/whitespace as unset. */
export function readEnv(
  key: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

/** Normalize a public origin (no trailing slash). */
export function normalizeOrigin(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Public https origin for this deploy, or undefined when it cannot be known
 * statically (local / live-preview dynamic host).
 */
export function resolvePublicOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const explicit = readEnv("BETTER_AUTH_URL", env);
  if (explicit) return normalizeOrigin(explicit);

  const railwayStatic = readEnv("RAILWAY_STATIC_URL", env);
  if (railwayStatic) {
    try {
      return normalizeOrigin(new URL(railwayStatic).origin);
    } catch {
      return normalizeOrigin(railwayStatic);
    }
  }

  const railwayDomain = readEnv("RAILWAY_PUBLIC_DOMAIN", env);
  if (railwayDomain) {
    const host = railwayDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${host}`;
  }

  return undefined;
}

/** Host wildcards that dynamic baseURL / trustedOrigins must accept in prod. */
export const PRODUCTION_ALLOWED_HOSTS = ["*.up.railway.app"] as const;
