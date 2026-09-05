/** Shared trial constants (safe for client + server). */

export const TRIAL_DAYS = 15;
export const NIP_TTL_MINUTES = 20;
export const ACCOUNT_PATH = "/admin/cuenta";

export type TrialStatus = {
  email: string | null;
  emailVerified: boolean;
  trialStartedAt: string;
  trialEndsAt: string;
  /** Milliseconds left in trial; 0 when expired. */
  msRemaining: number;
  daysRemaining: number;
  trialActive: boolean;
  /** True when the post-trial NIP was confirmed (or emailVerified synced). */
  nipVerified: boolean;
  /** Full admin access: trial still active OR NIP/email verified. */
  hasAccess: boolean;
  locked: boolean;
  /**
   * Server flag EMAIL_VERIFICATION_ENABLED. When false, TrialGate never blocks
   * and Cuenta hides send/confirm NIP UI.
   */
  verificationEnabled: boolean;
};

export function computeTrialAccess(opts: {
  nowMs: number;
  trialEndsAt: string | Date;
  verifiedAt: string | Date | null;
  /** Synced from Better Auth; unlock still requires verifiedAt or active trial. */
  emailVerified?: boolean;
}): Pick<
  TrialStatus,
  "msRemaining" | "daysRemaining" | "trialActive" | "nipVerified" | "hasAccess" | "locked"
> {
  const ends =
    opts.trialEndsAt instanceof Date
      ? opts.trialEndsAt.getTime()
      : new Date(opts.trialEndsAt).getTime();
  const msRemaining = Math.max(0, ends - opts.nowMs);
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  const trialActive = msRemaining > 0;
  // Post-trial unlock is the NIP flow (user_trials.verified_at), not login OTP.
  const nipVerified = Boolean(opts.verifiedAt);
  const hasAccess = nipVerified || trialActive;
  return {
    msRemaining,
    daysRemaining: trialActive ? Math.max(1, daysRemaining) : 0,
    trialActive,
    nipVerified,
    hasAccess,
    locked: !hasAccess,
  };
}
