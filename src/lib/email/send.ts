/**
 * Transactional email helpers.
 *
 * NIP verification uses the Railway email-server (`EMAIL_SERVER_URL`):
 * the remote service generates the NIP and emails it; Olivo only hashes/stores it.
 *
 * Optional Resend path remains for generic/console delivery (local/dev).
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

export type SendNipViaServerResult =
  | { ok: true; nip: string; mode: "email-server" }
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

/** Ensure EMAIL_SERVER_URL is an absolute base (trim, no trailing slash, https if missing). */
export function normalizeEmailServerBase(raw: string): string {
  let base = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    base = `https://${base}`;
  }
  return base;
}

/**
 * Ask the Railway email-server to generate + email a NIP.
 * Returns the raw NIP for hashing in Olivo — never send it to the browser.
 */
export async function sendNipViaEmailServer(opts: {
  email: string;
  userName: string;
}): Promise<SendNipViaServerResult> {
  const raw = readEnv("EMAIL_SERVER_URL");
  if (!raw) {
    return {
      ok: false,
      error:
        "EMAIL_SERVER_URL no está configurada. Configúrala en Railway o desactiva EMAIL_VERIFICATION_ENABLED.",
    };
  }

  const url = `${normalizeEmailServerBase(raw)}/send-nip`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: opts.email,
        userName: opts.userName,
      }),
    });
    const body = (await res.json().catch(() => null)) as {
      success?: boolean;
      message?: string;
      nip?: string;
      email?: string;
    } | null;

    if (!res.ok) {
      const msg =
        body?.message ??
        `El servidor de correo respondió HTTP ${res.status}`;
      console.error("[email] email-server /send-nip error", res.status, body);
      return { ok: false, error: msg };
    }

    if (!body?.success || typeof body.nip !== "string" || !body.nip.trim()) {
      console.error("[email] email-server /send-nip missing nip", body);
      return {
        ok: false,
        error: body?.message ?? "El servidor de correo no devolvió un NIP",
      };
    }

    return { ok: true, nip: body.nip.trim(), mode: "email-server" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] email-server /send-nip failed", message);
    return { ok: false, error: message };
  }
}

/** Optional health check against EMAIL_SERVER_URL/health. */
export async function checkEmailServerHealth(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const raw = readEnv("EMAIL_SERVER_URL");
  if (!raw) return { ok: false, error: "EMAIL_SERVER_URL unset" };
  try {
    const res = await fetch(`${normalizeEmailServerBase(raw)}/health`);
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
