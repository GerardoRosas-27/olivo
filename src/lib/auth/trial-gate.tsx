import { useQuery } from "@tanstack/react-query";
import { Navigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { getTrialStatus } from "./trial-actions";
import { ACCOUNT_PATH } from "./trial";

/**
 * When EMAIL_VERIFICATION_ENABLED is on, after the 15-day trial only
 * /admin/cuenta is allowed until the email NIP verifies the account.
 * When the flag is off (default), this is a no-op pass-through.
 */
export function TrialGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const trial = useQuery({
    queryKey: ["trial-status"],
    queryFn: () => getTrialStatus(),
    staleTime: 30_000,
  });

  if (trial.isPending) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted">Comprobando tu cuenta…</p>
      </div>
    );
  }

  if (trial.isError) {
    // Fail open when status cannot be loaded so a transient error does not
    // brick the whole admin shell (flag off still needs a working panel).
    return <>{children}</>;
  }

  const status = trial.data;
  if (!status.verificationEnabled) {
    return <>{children}</>;
  }

  const onAccountPage =
    pathname === ACCOUNT_PATH || pathname.startsWith(`${ACCOUNT_PATH}/`);

  if (status.locked && !onAccountPage) {
    return <Navigate to={ACCOUNT_PATH} />;
  }

  return (
    <>
      {status.locked ? (
        <div
          role="status"
          className="mb-6 rounded-[var(--radius)] border border-amber-700/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
        >
          Tu prueba de 15 días terminó. Verifica tu correo con el NIP para seguir
          usando el panel.
        </div>
      ) : null}
      {children}
    </>
  );
}
