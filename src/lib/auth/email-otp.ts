/**
 * Passwordless email OTP sign-in (Better Auth emailOTP plugin).
 *
 * Login flow: enter email → receive 6-digit code → enter code → session.
 * New users keep emailVerified=false until they complete the post-trial NIP
 * on /admin/cuenta (see trial.server.ts). Login OTP must not unlock that gate.
 */
export const emailOtpEnabled = true;
