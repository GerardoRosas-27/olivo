/**
 * Trial row helpers (DB only — no Better Auth imports, safe from server.ts).
 */
import { getSql } from "@/lib/db";
import { TRIAL_DAYS } from "./trial";

export type TrialRow = {
  user_id: string;
  trial_started_at: string;
  trial_ends_at: string;
  verified_at: string | null;
  nip_hash: string | null;
  nip_expires_at: string | null;
};

/** Ensure a trial row exists for this user (idempotent). */
export async function ensureUserTrial(userId: string): Promise<TrialRow> {
  const sql = await getSql();
  const existing = await sql<TrialRow>`
    select user_id, trial_started_at, trial_ends_at, verified_at, nip_hash, nip_expires_at
    from user_trials where user_id = ${userId} limit 1
  `;
  if (existing[0]) return existing[0];

  const started = new Date();
  const ends = new Date(started.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  await sql`
    insert into user_trials (user_id, trial_started_at, trial_ends_at)
    values (${userId}, ${started.toISOString()}, ${ends.toISOString()})
    on conflict (user_id) do nothing
  `;
  const again = await sql<TrialRow>`
    select user_id, trial_started_at, trial_ends_at, verified_at, nip_hash, nip_expires_at
    from user_trials where user_id = ${userId} limit 1
  `;
  if (!again[0]) throw new Error("No se pudo crear la prueba de 15 días");
  return again[0];
}

/** Keep Better Auth emailVerified false until post-trial NIP verification. */
export async function forceEmailUnverifiedUnlessNip(userId: string): Promise<void> {
  const sql = await getSql();
  await ensureUserTrial(userId);
  await sql`
    update "user" u
    set "emailVerified" = false, "updatedAt" = now()
    from user_trials t
    where u.id = ${userId}
      and t.user_id = u.id
      and t.verified_at is null
      and u."emailVerified" = true
  `;
}
