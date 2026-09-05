import QRCode from "qrcode";

export async function qrDataUrl(text: string) {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 512,
    color: { dark: "#2C2A26", light: "#FBF7F0" },
    errorCorrectionLevel: "M",
  });
}

export function tokenFromScan(raw: string) {
  const trimmed = raw.trim();
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/i\/([^/]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    /* not a URL */
  }
  const path = trimmed.match(/\/i\/([^/?#]+)/);
  if (path?.[1]) return decodeURIComponent(path[1]);
  return trimmed;
}

export function deviceId() {
  if (typeof window === "undefined") return "server";
  const key = "olivo.device";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}
