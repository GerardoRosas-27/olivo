/**
 * Feature flag for 15-day trial + email NIP verification.
 * Server-only env: EMAIL_VERIFICATION_ENABLED=true|false (default false).
 * Exposed to the client via getTrialStatus().verificationEnabled.
 */
import { readEnv } from "./production-url";

/** True only when EMAIL_VERIFICATION_ENABLED is explicitly "true" (case-insensitive). */
export function isEmailVerificationEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = readEnv("EMAIL_VERIFICATION_ENABLED", env);
  if (!raw) return false;
  return raw.toLowerCase() === "true" || raw === "1";
}
