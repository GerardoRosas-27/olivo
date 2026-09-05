/**
 * Temporary email-only login (no password, no OTP, no Resend).
 * Local format validation + find-or-create session on the server.
 */
export const emailOnlyEnabled = true;

/** Trim + lowercase. Empty string if missing. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Practical email format check (not full RFC). */
export function isValidEmailFormat(email: string): boolean {
  if (!email || email.length > 254) return false;
  // Single @, local + domain with a dot, no spaces.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
