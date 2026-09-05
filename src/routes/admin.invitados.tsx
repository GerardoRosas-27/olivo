import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { QrCard } from "@/components/qr-card";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buildGuestMessage, invitationUrl, whatsappHref } from "@/lib/wedding/message";
import { addGuest, discardGuest, getWedding, listGuests, markGuestSent, regenerateToken, updateGuest } from "@/lib/wedding/server";
import { guestState } from "@/lib/wedding/status";
import type { Guest } from "@/lib/wedding/types";

export const Route = createFileRoute("/admin/invitados")({ component: GuestsPage });

const emptyForm = { name: "", phone: "", partySize: 1, groupName: "", notes: "" };

function GuestsPage() {
  const queryClient = useQueryClient();
  const guestsQuery = useQuery({ queryKey: ["guests"], queryFn: () => listGuests() });
  const weddingQuery = useQuery({ queryKey: ["wedding"], queryFn: () => getWedding() });
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [qrGuest, setQrGuest] = useState<Guest | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        phone: form.phone,
        partySize: Number(form.partySize) || 1,
        groupName: form.groupName,
        notes: form.notes,
      };
      if (editing) return updateGuest({ data: { id: editing.id, ...payload } });
      return addGuest({ data: payload });
    },
    onSuccess: () => {
      toast.success(editing ? "Invitado actualizado" : "Invitado añadido");
      setForm(emptyForm);
      setEditing(null);
      void queryClient.invalidateQueries({ queryKey: ["guests"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.22em] text-muted uppercase">Lista</p>
        <h1 className="font-display text-4xl italic">Invitados</h1>
      </header>

      <form
        className="grid gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Nombre">
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="WhatsApp">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="7771234567" />
        </Field>
        <Field label="Pases">
          <Input
            type="number"
            min={1}
            max={20}
            value={form.partySize}
            onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })}
          />
        </Field>
        <Field label="Grupo">
          <Input value={form.groupName} onChange={(e) => setForm({ ...form, groupName: e.target.value })} />
        </Field>
        <Field label="Notas">
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={save.isPending}>
            {editing ? "Guardar cambios" : "Añadir"}
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
              }}
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>

      <ul className="divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-surface">
        {(guestsQuery.data ?? []).length === 0 ? (
          <li className="px-4 py-6 text-sm text-muted">Añade el primer nombre de la lista.</li>
        ) : (
          (guestsQuery.data ?? []).map((guest) => {
            const wedding = weddingQuery.data;
            const text = wedding ? buildGuestMessage(wedding, guest, origin) : invitationUrl(origin, guest.token);
            return (
              <li key={guest.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">{guest.name}</p>
                  <p className="text-xs text-subtle">
                    {guest.phone || "Sin teléfono"} · {guest.partySize} pases
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{guestState(guest)}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => setQrGuest(guest)}>
                    QR
                  </Button>
                  {guest.phone ? (
                    <Button size="sm" asChild>
                      <a
                        href={whatsappHref(guest.phone, text)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          void markGuestSent({ data: { ids: [guest.id] } }).then(() =>
                            queryClient.invalidateQueries({ queryKey: ["guests"] }),
                          );
                        }}
                      >
                        <WhatsAppIcon className="size-4" />
                        Enviar
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(guest);
                      setForm({
                        name: guest.name,
                        phone: guest.phone,
                        partySize: guest.partySize,
                        groupName: guest.groupName,
                        notes: guest.notes,
                      });
                    }}
                  >
                    Editar
                  </Button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <Dialog open={Boolean(qrGuest)} onOpenChange={(open) => !open && setQrGuest(null)}>
        <DialogContent>
          {qrGuest ? (
            <div className="space-y-4">
              <DialogTitle>{qrGuest.name}</DialogTitle>
              <QrCard token={qrGuest.token} name={qrGuest.name} />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    regenerateToken({ data: { id: qrGuest.id } }).then((next) => {
                      setQrGuest(next);
                      toast.success("Nuevo QR generado");
                      void queryClient.invalidateQueries({ queryKey: ["guests"] });
                    })
                  }
                >
                  Regenerar
                </Button>
                <Button
                  variant="danger"
                  onClick={() =>
                    discardGuest({ data: { id: qrGuest.id } }).then((next) => {
                      setQrGuest(next);
                      toast.success("QR descartado");
                      void queryClient.invalidateQueries({ queryKey: ["guests"] });
                    })
                  }
                >
                  Descartar
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
