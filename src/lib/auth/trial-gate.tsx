import type { ReactNode } from "react";

/**
 * Formerly redirected locked (post-trial, unverified) users to /admin/cuenta.
 * Temporarily a no-op: email verification / NIP is disabled; admin stays open.
 */
export function TrialGate({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
