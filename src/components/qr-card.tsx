import { useEffect, useState } from "react";
import { invitationUrl } from "@/lib/wedding/message";
import { qrDataUrl } from "@/lib/wedding/qr";

export function QrCard({ token, name }: { token: string; name: string }) {
  const [src, setSrc] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const href = invitationUrl(origin, token);

  useEffect(() => {
    void qrDataUrl(href).then(setSrc);
  }, [href]);

  async function share() {
    if (!src) return;
    const blob = await (await fetch(src)).blob();
    const file = new File([blob], `olivo-${token}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name, text: href });
      return;
    }
    const a = document.createElement("a");
    a.href = src;
    a.download = `olivo-${token}.png`;
    a.click();
  }

  return (
    <div className="grid justify-items-center gap-3">
      {src ? (
        <img src={src} alt={`QR de ${name}`} width={220} height={220} className="rounded-[var(--radius)] bg-paper" />
      ) : (
        <div className="size-[220px] animate-pulse rounded-[var(--radius)] bg-paper" />
      )}
      <p className="max-w-[220px] truncate text-center text-xs text-subtle">{href}</p>
      <button type="button" className="text-sm text-olive underline-offset-4 hover:underline" onClick={() => void share()}>
        Descargar o compartir QR
      </button>
    </div>
  );
}
