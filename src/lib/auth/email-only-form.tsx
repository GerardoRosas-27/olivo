import { useState, type FormEvent } from "react";
import { authClient } from "./client";
import { emailOnlyEnabled, isValidEmailFormat, normalizeEmail } from "./email-only";

/**
 * Email-only login: validate locally → server find-or-create → session → /admin.
 * Spanish UI for Olivo (temporary; no OTP / mail server).
 */
export function EmailOnlyForm({ callbackURL = "/admin" }: { callbackURL?: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = normalizeEmail(email);
    if (!trimmed) {
      setError("Escribe tu correo.");
      return;
    }
    if (!isValidEmailFormat(trimmed)) {
      setError("Correo inválido.");
      return;
    }
    setPending(true);
    try {
      // Dynamic path → POST /api/auth/sign-in/email-only (email-only plugin).
      const { error: signInError } = await (
        authClient as unknown as {
          signIn: {
            emailOnly: (body: { email: string }) => Promise<{
              data: unknown;
              error: { message?: string } | null;
            }>;
          };
        }
      ).signIn.emailOnly({ email: trimmed });
      if (signInError) {
        throw new Error(signInError.message ?? "No se pudo iniciar sesión");
      }
      try {
        await authClient.getSession();
      } catch {
        /* cookie set; next navigation recovers */
      }
      window.location.href = callbackURL;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setPending(false);
    }
  }

  if (!emailOnlyEnabled) return null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Correo</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-[var(--radius)] border border-border bg-surface px-3"
          placeholder="tu@correo.com"
          autoFocus
        />
      </label>
      {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-[var(--radius)] border border-border bg-olive text-white disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Continuar"}
      </button>
      <p className="text-xs text-muted">
        Sin contraseña ni código por ahora: escribe tu correo para entrar o crear tu
        cuenta y configurar la invitación.
      </p>
    </form>
  );
}
