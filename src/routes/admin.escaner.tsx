import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { DoorScanner } from "@/components/door-scanner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deviceId } from "@/lib/wedding/qr";
import { discardGuest, listScanEvents, markAttendance, scanDoor } from "@/lib/wedding/server";
import type { DoorScanResult } from "@/lib/wedding/types";

export const Route = createFileRoute("/admin/escaner")({ component: ScannerPage });

function ScannerPage() {
  const queryClient = useQueryClient();
  const eventsQuery = useQuery({ queryKey: ["scans"], queryFn: () => listScanEvents() });
  const [last, setLast] = useState<DoorScanResult | null>(null);
  const [busyToken, setBusyToken] = useState("");

  const scan = useMutation({
    mutationFn: (token: string) => scanDoor({ data: { token, deviceId: deviceId() } }),
    onSuccess: (result) => {
      setLast(result);
      const labels = {
        checked_in: "Asistencia marcada",
        already_in: "Ya había pasado",
        cloned: "QR clonado",
        discarded: "QR descartado",
        missing: "No está en tu lista",
      };
      toast.message(labels[result.outcome]);
      void queryClient.invalidateQueries({ queryKey: ["scans"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  const onToken = useCallback(
    (token: string) => {
      if (!token || token === busyToken || scan.isPending) return;
      setBusyToken(token);
      scan.mutate(token);
      window.setTimeout(() => setBusyToken(""), 2500);
    },
    [busyToken, scan],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="text-[11px] tracking-[0.22em] text-muted uppercase">Puerta</p>
        <h1 className="font-display text-4xl italic">Escáner</h1>
        <div className="mt-4">
          <DoorScanner onToken={onToken} />
        </div>
      </div>
      <div className="space-y-4">
        {last?.guest ? (
          <Card>
            <p className="text-xs tracking-wide text-muted uppercase">{last.outcome}</p>
            <h2 className="font-display mt-1 text-3xl italic">{last.guest.name}</h2>
            <p className="text-sm text-muted">
              {last.guest.partySize} pases · {last.guest.groupName || "Sin grupo"}
            </p>
            {last.outcome === "cloned" ? (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  onClick={() =>
                    discardGuest({ data: { id: last.guest!.id } }).then(() => toast.success("QR descartado"))
                  }
                >
                  Descartar clon
                </Button>
                <Button
                  variant="secondary"
                  onClick={() =>
                    markAttendance({ data: { id: last.guest!.id } }).then(() => toast.success("Asistencia marcada"))
                  }
                >
                  Pasar de todos modos
                </Button>
              </div>
            ) : null}
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-muted">El último QR leído aparece aquí, con nombre y aforo.</p>
          </Card>
        )}
        <section>
          <h2 className="font-display text-2xl">Últimas lecturas</h2>
          <ul className="mt-3 divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-surface">
            {(eventsQuery.data ?? []).length === 0 ? (
              <li className="px-4 py-3 text-sm text-muted">Todavía no hay lecturas.</li>
            ) : (
              (eventsQuery.data ?? []).map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="truncate">{event.guestName}</span>
                  <span className="text-subtle">{event.outcome}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
