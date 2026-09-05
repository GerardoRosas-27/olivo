import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  confirmVerificationNip,
  getTrialStatus,
  sendVerificationNip,
} from "@/lib/auth/trial.server";

export const Route = createFileRoute("/admin/cuenta")({ component: AdminCuenta });

function AdminCuenta() {
  const queryClient = useQueryClient();
  const trial = useQuery({ queryKey: ["trial-status"], queryFn: () => getTrialStatus() });
  const [nip, setNip] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () => sendVerificationNip(),
    onSuccess: (res) => {
      setError(null);
      setMessage(
        res.delivered === "console"
          ? "NIP generado. Sin RESEND_API_KEY se imprimió en los logs del servidor."
          : "Te enviamos un NIP de 6 dígitos a tu correo.",
      );
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof Error ? err.message : "No se pudo enviar el NIP");
    },
  });

  const confirm = useMutation({
    mutationFn: () => confirmVerificationNip({ data: { nip } }),
    onSuccess: async () => {
      setError(null);
      setMessage("Correo verificado. Ya puedes usar todo el panel.");
      setNip("");
      await queryClient.invalidateQueries({ queryKey: ["trial-status"] });
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof Error ? err.message : "NIP incorrecto");
    },
  });

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
        <h1 className="font-display text-4xl italic">Verificar correo</h1>
        <p className="mt-1 text-sm text-muted">
          {status.email ?? "Sin correo"} · prueba y verificación
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="inline-flex items-center gap-1.5 text-xs tracking-wide text-muted uppercase">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Prueba
          </p>
          {status.nipVerified ? (
            <p className="mt-2 text-sm">Cuenta verificada — la prueba ya no aplica.</p>
          ) : status.trialActive ? (
            <p className="mt-2 text-sm">
              Te quedan <strong>{status.daysRemaining}</strong> día
              {status.daysRemaining === 1 ? "" : "s"} (hasta el {endsLabel}).
            </p>
          ) : (
            <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
              La prueba de 15 días terminó el {endsLabel}. Verifica tu correo para
              continuar.
            </p>
          )}
        </Card>
        <Card>
          <p className="inline-flex items-center gap-1.5 text-xs tracking-wide text-muted uppercase">
            <Mail className="size-3.5" aria-hidden="true" />
            Estado del correo
          </p>
          <p className="mt-2 text-sm">
            {status.nipVerified ? "Verificado" : "Pendiente de verificación con NIP"}
          </p>
        </Card>
      </div>

      {status.nipVerified ? (
        <p className="text-sm text-olive">Todo listo. Tu cuenta tiene acceso completo.</p>
      ) : (
        <Card className="space-y-4">
          <div>
            <h2 className="font-medium">Verificar con NIP</h2>
            <p className="mt-1 text-sm text-muted">
              Te enviamos un código de 6 dígitos al correo de la cuenta. Caduca en
              20 minutos.
            </p>
          </div>
          <button
            type="button"
            disabled={send.isPending}
            onClick={() => {
              setError(null);
              setMessage(null);
              send.mutate();
            }}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] border border-border bg-olive px-4 text-sm text-white disabled:opacity-60"
          >
            <Mail className="size-4" aria-hidden="true" />
            {send.isPending ? "Enviando…" : "Enviar NIP al correo"}
          </button>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              confirm.mutate();
            }}
          >
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-muted">NIP</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                value={nip}
                onChange={(e) => setNip(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-11 rounded-[var(--radius)] border border-border bg-surface px-3 tracking-[0.3em] tabular-nums"
                placeholder="000000"
              />
            </label>
            <button
              type="submit"
              disabled={confirm.isPending || nip.length !== 6}
              className="h-11 rounded-[var(--radius)] border border-border px-4 text-sm disabled:opacity-60"
            >
              {confirm.isPending ? "Confirmando…" : "Confirmar NIP"}
            </button>
          </form>
          {message ? <p className="text-sm text-olive">{message}</p> : null}
          {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
        </Card>
      )}
    </div>
  );
}
