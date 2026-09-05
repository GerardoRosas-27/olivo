/**
 * Minimal transactional email via Resend HTTP API (no SDK).
 * Without RESEND_API_KEY, logs the message (incl. NIP/OTP) for local/dev.
 */

import { readEnv } from "@/lib/auth/production-url";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendEmailResult =
  | { ok: true; mode: "resend" | "console" }
  | { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = readEnv("RESEND_API_KEY");
  const from = readEnv("EMAIL_FROM") ?? "Olivo <onboarding@resend.dev>";

  if (!apiKey) {
    console.info(
      `[email] RESEND_API_KEY unset — console delivery\n` +
        `  to: ${input.to}\n` +
        `  subject: ${input.subject}\n` +
        `  text:\n${input.text}`,
    );
    return { ok: true, mode: "console" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Resend error", res.status, body);
      return { ok: false, error: `Resend HTTP ${res.status}` };
    }
    return { ok: true, mode: "resend" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] send failed", message);
    return { ok: false, error: message };
  }
}

export async function sendOtpEmail(opts: {
  to: string;
  otp: string;
  purpose: "login" | "verify";
}): Promise<SendEmailResult> {
  const isLogin = opts.purpose === "login";
  const subject = isLogin
    ? "Tu código para entrar a Olivo"
    : "Tu NIP para verificar el correo en Olivo";
  const text = isLogin
    ? `Tu código de acceso a Olivo es: ${opts.otp}\n\nCaduca en unos minutos. Si no pediste entrar, ignora este correo.`
    : `Tu NIP de verificación de Olivo es: ${opts.otp}\n\nCaduca en 20 minutos. Si no pediste verificar tu cuenta, ignora este correo.`;
  return sendEmail({ to: opts.to, subject, text });
}
