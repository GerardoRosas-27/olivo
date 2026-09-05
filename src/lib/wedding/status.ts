import type { Guest, RsvpStatus } from "./types";

export function rsvpLabel(status: RsvpStatus) {
  if (status === "yes") return "Confirmado";
  if (status === "no") return "No asiste";
  return "Pendiente";
}

export function guestState(guest: Guest) {
  if (guest.discardedAt) return "Descartado";
  if (guest.cloneFlaggedAt) return "Clon";
  if (guest.checkedInAt) return "En puerta";
  if (guest.rsvp === "yes") return "Confirmado";
  if (guest.rsvp === "no") return "No asiste";
  if (guest.firstViewedAt) return "Visto";
  if (guest.sentAt) return "Enviado";
  return "Nuevo";
}
