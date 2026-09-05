import { whatsappDigits } from "./phone";
import type { Guest, Wedding } from "./types";

export function invitationUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/i/${token}`;
}

export function formatWeddingDate(iso: string | null) {
  if (!iso) return "";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function coupleNames(wedding: Pick<Wedding, "partnerOne" | "partnerTwo">) {
  return [wedding.partnerOne, wedding.partnerTwo].filter(Boolean).join(" & ");
}

export function buildGuestMessage(wedding: Wedding, guest: Guest, origin: string) {
  const template = wedding.whatsappTemplate || "";
  const map: Record<string, string> = {
    "{nombre}": guest.name,
    "{novios}": coupleNames(wedding),
    "{fecha}": formatWeddingDate(wedding.weddingDate),
    "{lugar}": wedding.venueName,
    "{enlace}": invitationUrl(origin, guest.token),
  };
  return template.replace(/\{nombre\}|\{novios\}|\{fecha\}|\{lugar\}|\{enlace\}/g, (key) => map[key] ?? key);
}

export function whatsappHref(phone: string, text: string) {
  const digits = whatsappDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
