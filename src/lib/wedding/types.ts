export type RsvpStatus = "unknown" | "yes" | "no";

export type ScheduleItem = {
  time: string;
  title: string;
  detail: string;
};

export type Wedding = {
  id: string;
  partnerOne: string;
  partnerTwo: string;
  weddingDate: string | null;
  weddingTime: string;
  venueName: string;
  venueAddress: string;
  venueMapsUrl: string;
  dressCode: string;
  story: string;
  welcomeNote: string;
  schedule: ScheduleItem[];
  whatsappTemplate: string;
  rsvpDeadline: string | null;
};

export type Guest = {
  id: string;
  name: string;
  phone: string;
  partySize: number;
  groupName: string;
  notes: string;
  token: string;
  rsvp: RsvpStatus;
  rsvpAt: string | null;
  sentAt: string | null;
  firstViewedAt: string | null;
  boundDeviceId: string | null;
  checkedInAt: string | null;
  cloneFlaggedAt: string | null;
  discardedAt: string | null;
  scanCount: number;
  createdAt: string;
};

export type ScanEvent = {
  id: string;
  guestId: string;
  guestName: string;
  kind: string;
  deviceId: string;
  outcome: string;
  createdAt: string;
};

export type AdminStats = {
  guests: number;
  sent: number;
  viewed: number;
  confirmed: number;
  declined: number;
  checkedIn: number;
  clones: number;
  expected: number;
};

export type InvitationView = {
  ok: true;
  guestName: string;
  partySize: number;
  rsvp: RsvpStatus;
  discarded: boolean;
  cloned: boolean;
  checkedIn: boolean;
  wedding: Omit<Wedding, "id" | "whatsappTemplate">;
};

export type InvitationBlocked = {
  ok: false;
  reason: "missing" | "discarded" | "cloned";
};

export type InvitationResult = InvitationView | InvitationBlocked;

export type DoorScanResult = {
  outcome: "checked_in" | "already_in" | "cloned" | "discarded" | "missing";
  guest: Pick<
    Guest,
    "id" | "name" | "partySize" | "groupName" | "rsvp" | "checkedInAt" | "cloneFlaggedAt" | "discardedAt"
  > | null;
};

export const DEFAULT_TEMPLATE = `Hola {nombre},

Con mucho cariño te invitamos a nuestra boda.

{novios}
{fecha} · {lugar}

Tu invitación personal está aquí:
{enlace}

Esperamos verte.`;

export const DEFAULT_SCHEDULE: ScheduleItem[] = [
  { time: "16:00", title: "Ceremonia", detail: "Jardín principal" },
  { time: "17:30", title: "Brindis", detail: "Terraza" },
  { time: "19:00", title: "Cena", detail: "Salón de naranjos" },
  { time: "21:00", title: "Baile", detail: "Hasta que el cuerpo aguante" },
];
