import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import {
  DEFAULT_SCHEDULE,
  DEFAULT_TEMPLATE,
  type AdminStats,
  type DoorScanResult,
  type Guest,
  type InvitationResult,
  type InvitationView,
  type ScanEvent,
  type ScheduleItem,
  type Wedding,
} from "./types";

type WeddingRow = {
  id: string;
  partner_one: string;
  partner_two: string;
  wedding_date: string | null;
  wedding_time: string;
  venue_name: string;
  venue_address: string;
  venue_maps_url: string;
  dress_code: string;
  story: string;
  welcome_note: string;
  schedule: ScheduleItem[] | string;
  whatsapp_template: string;
  rsvp_deadline: string | null;
};

type GuestRow = {
  id: string;
  name: string;
  phone: string;
  party_size: number;
  group_name: string;
  notes: string;
  token: string;
  rsvp: string;
  rsvp_at: string | null;
  sent_at: string | null;
  first_viewed_at: string | null;
  bound_device_id: string | null;
  checked_in_at: string | null;
  clone_flagged_at: string | null;
  discarded_at: string | null;
  scan_count: number;
  created_at: string;
};

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
}

function parseSchedule(value: WeddingRow["schedule"]): ScheduleItem[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value) as ScheduleItem[];
    return Array.isArray(parsed) ? parsed : DEFAULT_SCHEDULE;
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

function toWedding(row: WeddingRow): Wedding {
  return {
    id: row.id,
    partnerOne: row.partner_one,
    partnerTwo: row.partner_two,
    weddingDate: row.wedding_date,
    weddingTime: row.wedding_time,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    venueMapsUrl: row.venue_maps_url,
    dressCode: row.dress_code,
    story: row.story,
    welcomeNote: row.welcome_note,
    schedule: parseSchedule(row.schedule),
    whatsappTemplate: row.whatsapp_template || DEFAULT_TEMPLATE,
    rsvpDeadline: row.rsvp_deadline,
  };
}

function toGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    partySize: Number(row.party_size) || 1,
    groupName: row.group_name,
    notes: row.notes,
    token: row.token,
    rsvp: row.rsvp === "yes" || row.rsvp === "no" ? row.rsvp : "unknown",
    rsvpAt: row.rsvp_at,
    sentAt: row.sent_at,
    firstViewedAt: row.first_viewed_at,
    boundDeviceId: row.bound_device_id,
    checkedInAt: row.checked_in_at,
    cloneFlaggedAt: row.clone_flagged_at,
    discardedAt: row.discarded_at,
    scanCount: Number(row.scan_count) || 0,
    createdAt: row.created_at,
  };
}

function publicWedding(wedding: Wedding): InvitationView["wedding"] {
  const { id: _id, whatsappTemplate: _tpl, ...rest } = wedding;
  void _id;
  void _tpl;
  return rest;
}

async function guestByToken(token: string) {
  const sql = await getSql();
  const rows = await sql<GuestRow & { wedding_id: string }>`
    select id, wedding_id, name, phone, party_size, group_name, notes, token, rsvp, rsvp_at,
           sent_at, first_viewed_at, bound_device_id, checked_in_at, clone_flagged_at,
           discarded_at, scan_count, created_at
    from guests where token = ${token} limit 1
  `;
  return rows[0] ?? null;
}

async function weddingById(id: string) {
  const sql = await getSql();
  const rows = await sql<WeddingRow>`
    select id, partner_one, partner_two, wedding_date, wedding_time, venue_name, venue_address,
           venue_maps_url, dress_code, story, welcome_note, schedule, whatsapp_template, rsvp_deadline
    from weddings where id = ${id} limit 1
  `;
  return rows[0] ? toWedding(rows[0]) : null;
}

async function ensureWedding(userId: string) {
  const sql = await getSql();
  const existing = await sql<WeddingRow>`
    select id, partner_one, partner_two, wedding_date, wedding_time, venue_name, venue_address,
           venue_maps_url, dress_code, story, welcome_note, schedule, whatsapp_template, rsvp_deadline
    from weddings where user_id = ${userId} limit 1
  `;
  if (existing[0]) return toWedding(existing[0]);
  const id = newId("wd");
  await sql`
    insert into weddings (id, user_id, whatsapp_template, schedule)
    values (${id}, ${userId}, ${DEFAULT_TEMPLATE}, ${JSON.stringify(DEFAULT_SCHEDULE)}::jsonb)
  `;
  const created = await sql<WeddingRow>`
    select id, partner_one, partner_two, wedding_date, wedding_time, venue_name, venue_address,
           venue_maps_url, dress_code, story, welcome_note, schedule, whatsapp_template, rsvp_deadline
    from weddings where id = ${id} limit 1
  `;
  return toWedding(created[0]!);
}

async function ownedGuest(userId: string, guestId: string) {
  const sql = await getSql();
  const rows = await sql<GuestRow>`
    select g.id, g.name, g.phone, g.party_size, g.group_name, g.notes, g.token, g.rsvp, g.rsvp_at,
           g.sent_at, g.first_viewed_at, g.bound_device_id, g.checked_in_at, g.clone_flagged_at,
           g.discarded_at, g.scan_count, g.created_at
    from guests g
    join weddings w on w.id = g.wedding_id
    where g.id = ${guestId} and w.user_id = ${userId}
    limit 1
  `;
  return rows[0] ? toGuest(rows[0]) : null;
}

export const peekInvitation = createServerFn({ method: "GET" })
  .validator((token: string) => z.string().min(1).max(80).parse(token))
  .handler(async ({ data: token }): Promise<InvitationResult> => {
    const row = await guestByToken(token);
    if (!row) return { ok: false, reason: "missing" };
    const guest = toGuest(row);
    if (guest.discardedAt) return { ok: false, reason: "discarded" };
    const wedding = await weddingById(row.wedding_id);
    if (!wedding) return { ok: false, reason: "missing" };
    const cloned = Boolean(guest.cloneFlaggedAt);
    return {
      ok: true,
      guestName: guest.name,
      partySize: guest.partySize,
      rsvp: guest.rsvp,
      discarded: false,
      cloned,
      checkedIn: Boolean(guest.checkedInAt),
      wedding: publicWedding(wedding),
    };
  });

export const openInvitation = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ token: z.string().min(1).max(80), deviceId: z.string().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data }): Promise<InvitationResult> => {
    const row = await guestByToken(data.token);
    if (!row) return { ok: false, reason: "missing" };
    const guest = toGuest(row);
    if (guest.discardedAt) return { ok: false, reason: "discarded" };

    const sql = await getSql();
    let cloned = Boolean(guest.cloneFlaggedAt);
    if (guest.boundDeviceId && guest.boundDeviceId !== data.deviceId) {
      cloned = true;
      await sql`
        update guests
        set clone_flagged_at = coalesce(clone_flagged_at, now()),
            scan_count = scan_count + 1
        where id = ${guest.id}
      `;
    } else {
      await sql`
        update guests
        set bound_device_id = coalesce(bound_device_id, ${data.deviceId}),
            first_viewed_at = coalesce(first_viewed_at, now()),
            scan_count = scan_count + 1
        where id = ${guest.id}
      `;
    }
    await sql`
      insert into scan_events (id, guest_id, kind, device_id, outcome)
      values (${newId("sc")}, ${guest.id}, 'invite', ${data.deviceId}, ${cloned ? "cloned" : "viewed"})
    `;
    if (cloned) return { ok: false, reason: "cloned" };

    const wedding = await weddingById(row.wedding_id);
    if (!wedding) return { ok: false, reason: "missing" };
    return {
      ok: true,
      guestName: guest.name,
      partySize: guest.partySize,
      rsvp: guest.rsvp,
      discarded: false,
      cloned: false,
      checkedIn: Boolean(guest.checkedInAt),
      wedding: publicWedding(wedding),
    };
  });

export const submitRsvp = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z
      .object({
        token: z.string().min(1).max(80),
        deviceId: z.string().min(1).max(80),
        rsvp: z.enum(["yes", "no"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const opened = await openInvitation({ data: { token: data.token, deviceId: data.deviceId } });
    if (!opened.ok) return opened;
    const sql = await getSql();
    await sql`
      update guests set rsvp = ${data.rsvp}, rsvp_at = now()
      where token = ${data.token} and discarded_at is null and clone_flagged_at is null
    `;
    return { ...opened, rsvp: data.rsvp };
  });

export const getWedding = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => ensureWedding(context.userId));

const weddingInput = z.object({
  partnerOne: z.string().max(80),
  partnerTwo: z.string().max(80),
  weddingDate: z.string().nullable(),
  weddingTime: z.string().max(20),
  venueName: z.string().max(120),
  venueAddress: z.string().max(200),
  venueMapsUrl: z.string().max(400),
  dressCode: z.string().max(200),
  story: z.string().max(2000),
  welcomeNote: z.string().max(1000),
  schedule: z.array(z.object({ time: z.string().max(20), title: z.string().max(80), detail: z.string().max(160) })),
  whatsappTemplate: z.string().max(2000),
  rsvpDeadline: z.string().nullable(),
});

export const saveWedding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => weddingInput.parse(input))
  .handler(async ({ data, context }) => {
    const wedding = await ensureWedding(context.userId);
    const sql = await getSql();
    await sql`
      update weddings set
        partner_one = ${data.partnerOne.trim()},
        partner_two = ${data.partnerTwo.trim()},
        wedding_date = ${data.weddingDate || null},
        wedding_time = ${data.weddingTime.trim()},
        venue_name = ${data.venueName.trim()},
        venue_address = ${data.venueAddress.trim()},
        venue_maps_url = ${data.venueMapsUrl.trim()},
        dress_code = ${data.dressCode.trim()},
        story = ${data.story.trim()},
        welcome_note = ${data.welcomeNote.trim()},
        schedule = ${JSON.stringify(data.schedule)}::jsonb,
        whatsapp_template = ${data.whatsappTemplate.trim() || DEFAULT_TEMPLATE},
        rsvp_deadline = ${data.rsvpDeadline || null},
        updated_at = now()
      where id = ${wedding.id} and user_id = ${context.userId}
    `;
    return ensureWedding(context.userId);
  });

export const listGuests = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const wedding = await ensureWedding(context.userId);
    const sql = await getSql();
    const rows = await sql<GuestRow>`
      select id, name, phone, party_size, group_name, notes, token, rsvp, rsvp_at,
             sent_at, first_viewed_at, bound_device_id, checked_in_at, clone_flagged_at,
             discarded_at, scan_count, created_at
      from guests where wedding_id = ${wedding.id}
      order by created_at asc
    `;
    return rows.map(toGuest);
  });

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const wedding = await ensureWedding(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      guests: number;
      sent: number;
      viewed: number;
      confirmed: number;
      declined: number;
      checked_in: number;
      clones: number;
      expected: number;
    }>`
      select
        count(*)::int as guests,
        count(*) filter (where sent_at is not null)::int as sent,
        count(*) filter (where first_viewed_at is not null)::int as viewed,
        count(*) filter (where rsvp = 'yes')::int as confirmed,
        count(*) filter (where rsvp = 'no')::int as declined,
        count(*) filter (where checked_in_at is not null)::int as checked_in,
        count(*) filter (where clone_flagged_at is not null)::int as clones,
        coalesce(sum(party_size) filter (where discarded_at is null), 0)::int as expected
      from guests where wedding_id = ${wedding.id}
    `;
    const row = rows[0];
    const stats: AdminStats = {
      guests: row?.guests ?? 0,
      sent: row?.sent ?? 0,
      viewed: row?.viewed ?? 0,
      confirmed: row?.confirmed ?? 0,
      declined: row?.declined ?? 0,
      checkedIn: row?.checked_in ?? 0,
      clones: row?.clones ?? 0,
      expected: row?.expected ?? 0,
    };
    return { wedding, stats };
  });

export const addGuest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        name: z.string().min(1).max(80),
        phone: z.string().max(24),
        partySize: z.number().int().min(1).max(20),
        groupName: z.string().max(80),
        notes: z.string().max(240),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const wedding = await ensureWedding(context.userId);
    const sql = await getSql();
    const id = newId("g");
    const token = newToken();
    await sql`
      insert into guests (id, wedding_id, name, phone, party_size, group_name, notes, token)
      values (
        ${id}, ${wedding.id}, ${data.name.trim()}, ${data.phone.trim()},
        ${data.partySize}, ${data.groupName.trim()}, ${data.notes.trim()}, ${token}
      )
    `;
    return (await ownedGuest(context.userId, id))!;
  });

export const updateGuest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z
      .object({
        id: z.string().min(1),
        name: z.string().min(1).max(80),
        phone: z.string().max(24),
        partySize: z.number().int().min(1).max(20),
        groupName: z.string().max(80),
        notes: z.string().max(240),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const existing = await ownedGuest(context.userId, data.id);
    if (!existing) throw new Error("Invitado no encontrado");
    const sql = await getSql();
    await sql`
      update guests set
        name = ${data.name.trim()},
        phone = ${data.phone.trim()},
        party_size = ${data.partySize},
        group_name = ${data.groupName.trim()},
        notes = ${data.notes.trim()}
      where id = ${data.id}
    `;
    return (await ownedGuest(context.userId, data.id))!;
  });

export const markGuestSent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ ids: z.array(z.string().min(1)).min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const wedding = await ensureWedding(context.userId);
    const sql = await getSql();
    for (const id of data.ids) {
      await sql`
        update guests set sent_at = coalesce(sent_at, now())
        where id = ${id} and wedding_id = ${wedding.id}
      `;
    }
    return { ok: true };
  });

export const discardGuest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const existing = await ownedGuest(context.userId, data.id);
    if (!existing) throw new Error("Invitado no encontrado");
    const sql = await getSql();
    await sql`update guests set discarded_at = now() where id = ${data.id}`;
    await sql`
      insert into scan_events (id, guest_id, kind, device_id, outcome)
      values (${newId("sc")}, ${data.id}, 'discard', 'admin', 'discarded')
    `;
    return (await ownedGuest(context.userId, data.id))!;
  });

export const regenerateToken = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const existing = await ownedGuest(context.userId, data.id);
    if (!existing) throw new Error("Invitado no encontrado");
    const sql = await getSql();
    const token = newToken();
    await sql`
      update guests set
        token = ${token},
        bound_device_id = null,
        clone_flagged_at = null,
        discarded_at = null,
        first_viewed_at = null,
        scan_count = 0
      where id = ${data.id}
    `;
    return (await ownedGuest(context.userId, data.id))!;
  });

export const scanDoor = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) =>
    z.object({ token: z.string().min(1).max(80), deviceId: z.string().min(1).max(80) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<DoorScanResult> => {
    const wedding = await ensureWedding(context.userId);
    const sql = await getSql();
    const rows = await sql<GuestRow>`
      select id, name, phone, party_size, group_name, notes, token, rsvp, rsvp_at,
             sent_at, first_viewed_at, bound_device_id, checked_in_at, clone_flagged_at,
             discarded_at, scan_count, created_at
      from guests where token = ${data.token} and wedding_id = ${wedding.id} limit 1
    `;
    const row = rows[0];
    if (!row) return { outcome: "missing", guest: null };
    const guest = toGuest(row);
    let outcome: DoorScanResult["outcome"] = "checked_in";
    if (guest.discardedAt) outcome = "discarded";
    else if (guest.cloneFlaggedAt) outcome = "cloned";
    else if (guest.checkedInAt) outcome = "already_in";
    else {
      await sql`update guests set checked_in_at = now(), scan_count = scan_count + 1 where id = ${guest.id}`;
      outcome = "checked_in";
    }
    await sql`
      insert into scan_events (id, guest_id, kind, device_id, outcome)
      values (${newId("sc")}, ${guest.id}, 'door', ${data.deviceId}, ${outcome})
    `;
    const latest = (await ownedGuest(context.userId, guest.id))!;
    return {
      outcome,
      guest: {
        id: latest.id,
        name: latest.name,
        partySize: latest.partySize,
        groupName: latest.groupName,
        rsvp: latest.rsvp,
        checkedInAt: latest.checkedInAt,
        cloneFlaggedAt: latest.cloneFlaggedAt,
        discardedAt: latest.discardedAt,
      },
    };
  });

export const markAttendance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const existing = await ownedGuest(context.userId, data.id);
    if (!existing) throw new Error("Invitado no encontrado");
    const sql = await getSql();
    await sql`
      update guests set checked_in_at = coalesce(checked_in_at, now())
      where id = ${data.id}
    `;
    return (await ownedGuest(context.userId, data.id))!;
  });

export const listScanEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const wedding = await ensureWedding(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      guest_id: string;
      guest_name: string;
      kind: string;
      device_id: string;
      outcome: string;
      created_at: string;
    }>`
      select e.id, e.guest_id, g.name as guest_name, e.kind, e.device_id, e.outcome, e.created_at
      from scan_events e
      join guests g on g.id = e.guest_id
      where g.wedding_id = ${wedding.id}
      order by e.created_at desc
      limit 40
    `;
    return rows.map(
      (row): ScanEvent => ({
        id: row.id,
        guestId: row.guest_id,
        guestName: row.guest_name,
        kind: row.kind,
        deviceId: row.device_id,
        outcome: row.outcome,
        createdAt: row.created_at,
      }),
    );
  });
