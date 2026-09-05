import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { coupleNames, formatWeddingDate } from "@/lib/wedding/message";
import { getAdminOverview } from "@/lib/wedding/server";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const overview = useQuery({ queryKey: ["overview"], queryFn: () => getAdminOverview() });
  if (overview.isPending || !overview.data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <p className="text-sm text-muted">Cargando el resumen de tu boda…</p>
      </div>
    );
  }
  const { wedding, stats } = overview.data;
  const items = [
    { label: "Invitados", value: stats.guests },
    { label: "Enviados", value: stats.sent },
    { label: "Vistos", value: stats.viewed },
    { label: "Confirmados", value: stats.confirmed },
    { label: "En puerta", value: stats.checkedIn },
    { label: "Clones", value: stats.clones },
  ];
  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.22em] text-muted uppercase">Resumen</p>
        <h1 className="font-display text-4xl italic">{coupleNames(wedding) || "Tu boda"}</h1>
        <p className="mt-1 text-sm text-muted">
          {formatWeddingDate(wedding.weddingDate) || "Aún sin fecha"} · {wedding.venueName || "Aún sin lugar"}
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.label}>
            <p className="text-xs tracking-wide text-muted uppercase">{item.label}</p>
            <p className="font-display mt-1 text-3xl tabular-nums">{item.value}</p>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted">Aforo esperado: {stats.expected} personas.</p>
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/invitados" className="inline-flex h-11 items-center rounded-[var(--radius)] bg-primary px-4 text-sm text-primary-foreground">
          Lista de invitados
        </Link>
        <Link to="/admin/boda" className="inline-flex h-11 items-center rounded-[var(--radius)] border border-border px-4 text-sm">
          Editar la boda
        </Link>
      </div>
    </div>
  );
}
