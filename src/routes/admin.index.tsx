import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, DoorOpen, Eye, Pencil, Send, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  const items: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "Invitados", value: stats.guests, icon: Users },
    { label: "Enviados", value: stats.sent, icon: Send },
    { label: "Vistos", value: stats.viewed, icon: Eye },
    { label: "Confirmados", value: stats.confirmed, icon: CheckCircle2 },
    { label: "En puerta", value: stats.checkedIn, icon: DoorOpen },
    { label: "Clones", value: stats.clones, icon: Copy },
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
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <p className="inline-flex items-center gap-1.5 text-xs tracking-wide text-muted uppercase">
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                {item.label}
              </p>
              <p className="font-display mt-1 text-3xl tabular-nums">{item.value}</p>
            </Card>
          );
        })}
      </div>
      <p className="text-sm text-muted">Aforo esperado: {stats.expected} personas.</p>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/admin/invitados"
          className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] bg-primary px-4 text-sm text-primary-foreground"
        >
          <Users className="size-4" aria-hidden="true" />
          Lista de invitados
        </Link>
        <Link
          to="/admin/boda"
          className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] border border-border px-4 text-sm"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Editar la boda
        </Link>
      </div>
    </div>
  );
}
