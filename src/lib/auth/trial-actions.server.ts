/**
 * Trial + post-trial email NIP — server-only implementations.
 * Imported dynamically from trial-actions.ts so the client graph never sees
 * `*.server.*` or `node:crypto`.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { sendNipViaEmailServer } from "@/lib/email/send";
import { isEmailVerificationEnabled } from "./email-verification";
import { readEnv } from "./production-url";
import {
  NIP_TTL_MINUTES,
  computeTrialAccess,
  type TrialStatus,
} from "./trial";
import { ensureUserTrial, type TrialRow } from "./trial-db.server";
import { getSessionUser } from "./verify.server";

function nipPepper(): string {
  return readEnv("BETTER_AUTH_SECRET") ?? "olivo-dev-nip-pepper";
}

export function hashNip(nip: string): string {
  return createHash("sha256").update(`${nipPepper()}:${nip}`).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function readUserEmailFlags(userId: string): Promise<{
  email: string | null;
  name: string | null;
  emailVerified: boolean;
}> {
  const sql = await getSql();
  const rows = await sql<{ email: string; name: string; emailVerified: boolean }>`
    select email, name, "emailVerified" as "emailVerified" from "user" where id = ${userId} limit 1
  `;
  const row = rows[0];
  return {
    email: row?.email ?? null,
    name: row?.name ?? null,
    emailVerified: Boolean(row?.emailVerified),
  };
}

function statusFrom(
  row: TrialRow,
  email: string | null,
  emailVerified: boolean,
  verificationEnabled: boolean,
): TrialStatus {
  const access = computeTrialAccess({
    nowMs: Date.now(),
    trialEndsAt: row.trial_ends_at,
    verifiedAt: row.verified_at,
    emailVerified,
  });
  if (!verificationEnabled) {
    return {
      email,
      emailVerified: access.nipVerified,
      trialStartedAt: toIso(row.trial_started_at),
      trialEndsAt: toIso(row.trial_ends_at),
      ...access,
      hasAccess: true,
      locked: false,
      verificationEnabled: false,
    };
  }
  return {
    email,
    emailVerified: access.nipVerified,
    trialStartedAt: toIso(row.trial_started_at),
    trialEndsAt: toIso(row.trial_ends_at),
    ...access,
    verificationEnabled: true,
  };
}

export async function getTrialStatusForUser(userId: string): Promise<TrialStatus> {
  const verificationEnabled = isEmailVerificationEnabled();
  const row = await ensureUserTrial(userId);
  const flags = await readUserEmailFlags(userId);
  if (!flags.email) {
    const sessionUser = await getSessionUser();
    return statusFrom(
      row,
      sessionUser?.email ?? null,
      flags.emailVerified,
      verificationEnabled,
    );
  }
  return statusFrom(row, flags.email, flags.emailVerified, verificationEnabled);
}

export async function sendVerificationNipForUser(
  userId: string,
): Promise<{ ok: true; delivered: "email-server" }> {
  if (!isEmailVerificationEnabled()) {
    throw new Error("La verificación por correo está desactivada");
  }
  const row = await ensureUserTrial(userId);
  if (row.verified_at) {
    throw new Error("Tu correo ya está verificado");
  }
  const flags = await readUserEmailFlags(userId);
  if (!flags.email) throw new Error("No hay correo en tu cuenta");

  const sent = await sendNipViaEmailServer({
    email: flags.email,
    userName: flags.name?.trim() || flags.email.split("@")[0] || "Usuario",
  });
  if (!sent.ok) {
    throw new Error(sent.error || "No se pudo enviar el correo. Intenta de nuevo.");
  }

  // Email server generated the NIP — hash + store only; never return raw NIP.
  const expires = new Date(Date.now() + NIP_TTL_MINUTES * 60 * 1000);
  const sql = await getSql();
  await sql`
    update user_trials
    set nip_hash = ${hashNip(sent.nip)},
        nip_expires_at = ${expires.toISOString()},
        updated_at = now()
    where user_id = ${userId}
  `;

  return { ok: true, delivered: "email-server" };
}

export async function confirmVerificationNipForUser(
  userId: string,
  nip: string,
): Promise<{ ok: true }> {
  if (!isEmailVerificationEnabled()) {
    throw new Error("La verificación por correo está desactivada");
  }
  const row = await ensureUserTrial(userId);
  if (row.verified_at) return { ok: true };

  if (!row.nip_hash || !row.nip_expires_at) {
    throw new Error("Primero solicita un NIP a tu correo");
  }
  if (new Date(row.nip_expires_at).getTime() < Date.now()) {
    throw new Error("El NIP caducó. Solicita uno nuevo");
  }
  if (!safeEqualHex(row.nip_hash, hashNip(nip))) {
    throw new Error("NIP incorrecto");
  }

  const sql = await getSql();
  await sql`
    update user_trials
    set verified_at = now(),
        nip_hash = null,
        nip_expires_at = null,
        updated_at = now()
    where user_id = ${userId}
  `;
  await sql`
    update "user"
    set "emailVerified" = true, "updatedAt" = now()
    where id = ${userId}
  `;
  return { ok: true };
}
