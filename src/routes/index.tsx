import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, LayoutDashboard } from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  return (
    <main className="min-h-screen bg-bg text-fg">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <p className="font-display text-2xl italic">Olivo</p>
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] bg-primary px-4 text-sm text-primary-foreground"
          >
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Panel
          </Link>
          {isPending ? <div className="size-8 animate-pulse rounded-full bg-border" /> : user ? <UserButton /> : null}
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-8 px-5 pb-16 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-[11px] tracking-[0.28em] text-muted uppercase">Invitaciones con sello propio</p>
          <h1 className="font-display mt-3 text-5xl leading-[1.05] text-balance italic md:text-6xl">
            Un QR por invitado. La boda, en una página ligera.
          </h1>
          <p className="mt-4 max-w-md text-pretty text-muted">
            Arma los detalles, envía por WhatsApp y controla la puerta. Cada código está ligado a un nombre; un clon se
            descarta.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/admin"
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] bg-primary px-5 text-sm text-primary-foreground"
            >
              <LayoutDashboard className="size-4" aria-hidden="true" />
              Abrir panel
            </Link>
            <Link
              to="/i/$token"
              params={{ token: "demo-ana" }}
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] border border-border px-5 text-sm"
            >
              <Eye className="size-4" aria-hidden="true" />
              Ver invitación de muestra
            </Link>
          </div>
        </div>
        <img
          src="/images/hero-stationery.jpg"
          alt="Papelería de boda sobre lino marfil"
          className="aspect-[3/2] w-full rounded-[var(--radius-lg)] object-cover"
        />
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-5 pb-20 md:grid-cols-3">
        {[
          { title: "Lista y WhatsApp", body: "Añade invitados con teléfono. Cada uno recibe su QR y un texto que editas tú." },
          { title: "Landing ligera", body: "Al escanear, el invitado ve fecha, lugar, historia e itinerario — sin cuenta." },
          { title: "Puerta", body: "El escáner marca asistencia y avisa si el código ya se usó en otro teléfono." },
        ].map((item) => (
          <article key={item.title} className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
            <h2 className="font-display text-2xl italic">{item.title}</h2>
            <p className="mt-2 text-sm text-muted">{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
