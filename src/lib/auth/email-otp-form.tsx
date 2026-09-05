import { useState, type FormEvent } from "react";
import { authClient } from "./client";

type Step = "email" | "otp";

/**
 * Passwordless login: email → OTP code → session.
 * Spanish UI for Olivo.
 */
export function EmailOtpForm({ callbackURL = "/admin" }: { callbackURL?: string }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const trimmed = email.trim().toLowerCase();
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
        email: trimmed,
        type: "sign-in",
      });
      if (sendError) throw new Error(sendError.message ?? "No se pudo enviar el código");
      setEmail(trimmed);
      setStep("otp");
      setInfo("Te enviamos un código de 6 dígitos a tu correo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el código");
    } finally {
      setPending(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error: signInError } = await authClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      if (signInError) throw new Error(signInError.message ?? "Código incorrecto");
      window.location.href = callbackURL;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setPending(false);
    }
  }

  if (step === "otp") {
    return (
      <form onSubmit={verifyCode} className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Código enviado a <span className="text-fg">{email}</span>
        </p>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Código de 6 dígitos</span>
          <input
            type="text"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-11 rounded-[var(--radius)] border border-border bg-surface px-3 tracking-[0.3em] tabular-nums"
            autoFocus
          />
        </label>
        {info ? <p className="text-sm text-olive">{info}</p> : null}
        {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={pending || otp.length !== 6}
          className="h-11 rounded-[var(--radius)] border border-border bg-olive text-white disabled:opacity-60"
        >
          {pending ? "Verificando…" : "Entrar"}
        </button>
        <button
          type="button"
          className="text-sm text-olive underline-offset-4 hover:underline"
          disabled={pending}
          onClick={() => void sendCode()}
        >
          Reenviar código
        </button>
        <button
          type="button"
          className="text-sm text-muted underline-offset-4 hover:underline"
          disabled={pending}
          onClick={() => {
            setStep("email");
            setOtp("");
            setError(null);
            setInfo(null);
          }}
        >
          Cambiar correo
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="flex flex-col gap-3">
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
        />
      </label>
      {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-[var(--radius)] border border-border bg-olive text-white disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Continuar"}
      </button>
      <p className="text-xs text-muted">
        Sin contraseña: te enviamos un código al correo para entrar. Las cuentas nuevas
        tienen 15 días de prueba.
      </p>
    </form>
  );
}
