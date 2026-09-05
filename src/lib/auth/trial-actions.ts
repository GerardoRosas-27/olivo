/**
 * Trial + post-trial email NIP (server functions).
 *
 * Access rule: verified_at OR within 15-day trial (emailVerified synced on NIP).
 * Login OTP is separate and must not unlock the gate — hooks keep emailVerified
 * false until this NIP succeeds.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email/send";
import { authMiddleware } from "./middleware";
import { readEnv } from "./production-url";
import {
  NIP_TTL_MINUTES,
  computeTrialAccess,
  type TrialStatus,
} from "./trial";
import {
  ensureUserTrial,
  type TrialRow,
} from "./trial-db.server";
import { getSessionUser } from "./verify.server";

export { ensureUserTrial, forceEmailUnverifiedUnlessNip } from "./trial-db.server";

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

function generateNip(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

async function readUserEmailFlags(userId: string): Promise<{
  email: string | null;
  emailVerified: boolean;
}> {
  const sql = await getSql();
  const rows = await sql<{ email: string; emailVerified: boolean }>`
    select email, "emailVerified" as "emailVerified" from "user" where id = ${userId} limit 1
  `;
  const row = rows[0];
  return {
    email: row?.email ?? null,
    emailVerified: Boolean(row?.emailVerified),
  };
}

function statusFrom(row: TrialRow, email: string | null, emailVerified: boolean): TrialStatus {
  const access = computeTrialAccess({
    nowMs: Date.now(),
    trialEndsAt: row.trial_ends_at,
    verifiedAt: row.verified_at,
    emailVerified,
  });
  return {
    email,
    emailVerified: access.nipVerified,
    trialStartedAt: toIso(row.trial_started_at),
    trialEndsAt: toIso(row.trial_ends_at),
    ...access,
  };
}

export const getTrialStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<TrialStatus> => {
    const row = await ensureUserTrial(context.userId);
    const flags = await readUserEmailFlags(context.userId);
    if (!flags.email) {
      const sessionUser = await getSessionUser();
      return statusFrom(row, sessionUser?.email ?? null, flags.emailVerified);
    }
    return statusFrom(row, flags.email, flags.emailVerified);
  });

export const sendVerificationNip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true; delivered: "resend" | "console" }> => {
    const row = await ensureUserTrial(context.userId);
    if (row.verified_at) {
      throw new Error("Tu correo ya está verificado");
    }
    const flags = await readUserEmailFlags(context.userId);
    if (!flags.email) throw new Error("No hay correo en tu cuenta");

    const nip = generateNip();
    const expires = new Date(Date.now() + NIP_TTL_MINUTES * 60 * 1000);
    const sql = await getSql();
    await sql`
      update user_trials
      set nip_hash = ${hashNip(nip)},
          nip_expires_at = ${expires.toISOString()},
          updated_at = now()
      where user_id = ${context.userId}
    `;

    const sent = await sendOtpEmail({
      to: flags.email,
      otp: nip,
      purpose: "verify",
    });
    if (!sent.ok) throw new Error("No se pudo enviar el correo. Intenta de nuevo.");
    return { ok: true, delivered: sent.mode };
  });

export const confirmVerificationNip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ nip: z.string().trim().regex(/^\d{6}$/) }).parse(input),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const row = await ensureUserTrial(context.userId);
    if (row.verified_at) return { ok: true };

    if (!row.nip_hash || !row.nip_expires_at) {
      throw new Error("Primero solicita un NIP a tu correo");
    }
    if (new Date(row.nip_expires_at).getTime() < Date.now()) {
      throw new Error("El NIP caducó. Solicita uno nuevo");
    }
    if (!safeEqualHex(row.nip_hash, hashNip(data.nip))) {
      throw new Error("NIP incorrecto");
    }

    const sql = await getSql();
    await sql`
      update user_trials
      set verified_at = now(),
          nip_hash = null,
          nip_expires_at = null,
          updated_at = now()
      where user_id = ${context.userId}
    `;
    await sql`
      update "user"
      set "emailVerified" = true, "updatedAt" = now()
      where id = ${context.userId}
    `;
    return { ok: true };
  });
