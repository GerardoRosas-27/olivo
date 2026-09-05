import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { tokenFromScan } from "@/lib/wedding/qr";

export function DoorScanner({ onToken }: { onToken: (token: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onTokenRef = useRef(onToken);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  onTokenRef.current = onToken;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const tick = () => {
          if (stopped) return;
          const canvas = canvasRef.current;
          if (video.readyState >= 2 && canvas) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0);
              const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(image.data, image.width, image.height);
              if (code?.data) onTokenRef.current(tokenFromScan(code.data));
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError("No se pudo abrir la cámara. Pega el enlace a mano.");
      }
    }
    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-ink">
        <video ref={videoRef} className="aspect-[3/4] w-full object-cover" playsInline muted />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error ? <p className="text-sm text-danger">{error}</p> : <p className="text-sm text-muted">Apunta al QR de la invitación.</p>}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) onToken(tokenFromScan(manual));
        }}
      >
        <input
          className="h-11 flex-1 rounded-[var(--radius)] border border-border bg-paper px-3 text-sm"
          placeholder="O pega el enlace /i/…"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button type="submit" className="h-11 rounded-[var(--radius)] bg-primary px-4 text-sm text-primary-foreground">
          Leer
        </button>
      </form>
    </div>
  );
}
