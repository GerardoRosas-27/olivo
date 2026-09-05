import { useMutation } from "@tanstack/react-query";
import { submitRsvp } from "@/lib/wedding/server";
import { coupleNames, formatWeddingDate } from "@/lib/wedding/message";
import { deviceId } from "@/lib/wedding/qr";
import type { InvitationView, RsvpStatus } from "@/lib/wedding/types";

export function GuestLanding({ token, view }: { token: string; view: InvitationView }) {
  const rsvp = useMutation({
    mutationFn: (status: RsvpStatus) =>
      submitRsvp({ data: { token, deviceId: deviceId(), rsvp: status === "unknown" ? "yes" : status } }),
  });
  const current = rsvp.data && rsvp.data.ok ? rsvp.data.rsvp : view.rsvp;
  const { wedding } = view;
  const couple = coupleNames(wedding);
  const date = formatWeddingDate(wedding.weddingDate);

  return (
    <main className="mx-auto min-h-screen max-w-lg bg-bg px-5 pb-16 text-fg">
      <img
        src="/images/hero-stationery.jpg"
        alt=""
        className="mx-auto mt-6 aspect-[3/2] w-full rounded-[var(--radius-lg)] object-cover"
      />
      <p className="mt-8 text-center text-[11px] tracking-[0.28em] text-muted uppercase">Con alegría</p>
      <h1 className="font-display mt-2 text-center text-5xl leading-none text-balance italic">{couple || "Nuestra boda"}</h1>
      <p className="mt-4 text-center text-sm text-muted">
        {date}
        {wedding.weddingTime ? ` · ${wedding.weddingTime}` : ""}
      </p>
      <p className="mt-1 text-center text-sm">{wedding.venueName}</p>
      <p className="text-center text-sm text-subtle">{wedding.venueAddress}</p>

      <section className="mt-8 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <p className="text-[11px] tracking-[0.22em] text-muted uppercase">Para {view.guestName}</p>
        <p className="mt-2 text-pretty leading-relaxed">{wedding.welcomeNote}</p>
        {current === "unknown" ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="h-11 rounded-[var(--radius)] bg-primary text-primary-foreground"
              onClick={() => rsvp.mutate("yes")}
              disabled={rsvp.isPending}
            >
              Confirmar
            </button>
            <button
              type="button"
              className="h-11 rounded-[var(--radius)] border border-border"
              onClick={() => rsvp.mutate("no")}
              disabled={rsvp.isPending}
            >
              No podré
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-olive">
            {current === "yes" ? "Gracias. Te esperamos." : "Lamentamos que no puedas. Te llevamos en el corazón."}
          </p>
        )}
      </section>

      {wedding.story ? (
        <section className="mt-8">
          <h2 className="font-display text-3xl italic">Los novios</h2>
          <p className="mt-2 text-pretty leading-relaxed text-muted">{wedding.story}</p>
        </section>
      ) : null}

      <img src="/images/venue-hacienda.jpg" alt="" className="mt-8 aspect-video w-full rounded-[var(--radius-lg)] object-cover" />

      {wedding.schedule.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-3xl italic">Itinerario</h2>
          <ol className="mt-3 divide-y divide-border border-y border-border">
            {wedding.schedule.map((item) => (
              <li key={`${item.time}-${item.title}`} className="flex gap-4 py-3">
                <span className="w-14 shrink-0 tabular-nums text-sm text-olive">{item.time}</span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-subtle">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {wedding.dressCode ? (
        <section className="mt-8">
          <h2 className="font-display text-3xl italic">Vestimenta</h2>
          <p className="mt-2 text-pretty text-muted">{wedding.dressCode}</p>
        </section>
      ) : null}

      {wedding.venueMapsUrl ? (
        <p className="mt-8 text-center">
          <a href={wedding.venueMapsUrl} className="text-olive underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
            Cómo llegar
          </a>
        </p>
      ) : null}

      <img src="/images/olive-branch.jpg" alt="" className="mx-auto mt-10 h-24 w-40 object-cover opacity-80" />
    </main>
  );
}

export function InvitationBlocked({ reason }: { reason: "missing" | "discarded" | "cloned" }) {
  const copy = {
    missing: "Esta invitación no existe.",
    discarded: "Esta invitación ya no es válida.",
    cloned: "Este código se compartió. Pide el original a los novios.",
  };
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-center text-fg">
      <div>
        <p className="text-[11px] tracking-[0.28em] text-muted uppercase">Olivo</p>
        <h1 className="font-display mt-3 text-4xl italic">Invitación no disponible</h1>
        <p className="mt-3 max-w-sm text-pretty text-muted">{copy[reason]}</p>
      </div>
    </main>
  );
}
