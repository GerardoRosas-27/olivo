import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getTrialStatus } from "@/lib/auth/trial-actions";

export const Route = createFileRoute("/admin/cuenta")({ component: AdminCuenta });

/**
 * Informational account page — trial days are passive; NIP / email verification
 * UI is hidden until a mail server is available. Access is never blocked.
 */
function AdminCuenta() {
  const trial = useQuery({ queryKey: ["trial-status"], queryFn: () => getTrialStatus() });

  if (trial.isPending || !trial.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <p className="text-sm text-muted">Cargando tu cuenta…</p>
      </div>
    );
  }

  const status = trial.data;
  const endsLabel = new Date(status.trialEndsAt).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.22em] text-muted uppercase">Cuenta</p>
        <h1 className="font-display text-4xl italic">Tu cuenta</h1>
        <p className="mt-1 text-sm text-muted">
          {status.email ?? "Sin correo"} · acceso al panel
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="inline-flex items-center gap-1.5 text-xs tracking-wide text-muted uppercase">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Prueba
          </p>
          {status.trialActive ? (
            <p className="mt-2 text-sm">
              Prueba de 15 días: te quedan <strong>{status.daysRemaining}</strong> día
              {status.daysRemaining === 1 ? "" : "s"} (hasta el {endsLabel}).
            </p>
          ) : (
            <p className="mt-2 text-sm">
              Periodo de prueba de referencia terminó el {endsLabel}. El panel sigue
              disponible.
            </p>
          )}
        </Card>
        <Card>
          <p className="inline-flex items-center gap-1.5 text-xs tracking-wide text-muted uppercase">
            <Mail className="size-3.5" aria-hidden="true" />
            Correo
          </p>
          <p className="mt-2 text-sm">
            Entraste con correo. La verificación por NIP llegará más adelante.
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="font-medium">Verificación por correo próximamente</h2>
        <p className="mt-1 text-sm text-muted">
          Por ahora no enviamos códigos ni NIP (no hay servidor de correo
          configurado). Puedes usar todo el panel con tu correo.
        </p>
      </Card>
    </div>
  );
}
