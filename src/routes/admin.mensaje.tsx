import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { buildGuestMessage, whatsappHref } from "@/lib/wedding/message";
import { getWedding, listGuests, markGuestSent, saveWedding } from "@/lib/wedding/server";
import { DEFAULT_TEMPLATE } from "@/lib/wedding/types";

export const Route = createFileRoute("/admin/mensaje")({ component: MessagePage });

function MessagePage() {
  const queryClient = useQueryClient();
  const weddingQuery = useQuery({ queryKey: ["wedding"], queryFn: () => getWedding() });
  const guestsQuery = useQuery({ queryKey: ["guests"], queryFn: () => listGuests() });
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);

  useEffect(() => {
    if (weddingQuery.data) setTemplate(weddingQuery.data.whatsappTemplate || DEFAULT_TEMPLATE);
  }, [weddingQuery.data]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const previewGuest = guestsQuery.data?.[0];
  const preview =
    weddingQuery.data && previewGuest
      ? buildGuestMessage({ ...weddingQuery.data, whatsappTemplate: template }, previewGuest, origin)
      : template;
  const isDefault = template.trim() === DEFAULT_TEMPLATE.trim();

  const save = useMutation({
    mutationFn: async (nextTemplate: string) => {
      const wedding = weddingQuery.data;
      if (!wedding) return;
      const { id: _id, ...rest } = wedding;
      void _id;
      return saveWedding({ data: { ...rest, whatsappTemplate: nextTemplate } });
    },
    onSuccess: (_data, nextTemplate) => {
      toast.success(nextTemplate.trim() === DEFAULT_TEMPLATE.trim() ? "Plantilla restaurada" : "Texto guardado");
      void queryClient.invalidateQueries({ queryKey: ["wedding"] });
    },
  });

  const pending = useMemo(
    () => (guestsQuery.data ?? []).filter((g) => !g.discardedAt && g.phone),
    [guestsQuery.data],
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.22em] text-muted uppercase">Envío</p>
        <h1 className="font-display text-4xl italic">WhatsApp</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          El mensaje se personaliza por invitado. Placeholders: {"{nombre}"}, {"{novios}"}, {"{fecha}"}, {"{lugar}"} y{" "}
          {"{enlace}"}. WhatsApp Web no adjunta la imagen del QR; el enlace único es la invitación, y en el teléfono
          puedes compartir el PNG desde la ficha de cada persona.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-display text-2xl">Plantilla</h2>
          <Textarea rows={14} value={template} onChange={(e) => setTemplate(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => save.mutate(template)} disabled={save.isPending || !weddingQuery.data}>
              <Save aria-hidden="true" />
              Guardar texto
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={isDefault || save.isPending || !weddingQuery.data}
              onClick={() => {
                setTemplate(DEFAULT_TEMPLATE);
                save.mutate(DEFAULT_TEMPLATE);
              }}
            >
              <RotateCcw aria-hidden="true" />
              Restaurar plantilla
            </Button>
          </div>
        </Card>
        <Card>
          <h2 className="font-display text-2xl">Vista previa</h2>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">{preview}</pre>
        </Card>
      </div>

      <section>
        <h2 className="font-display text-2xl">Enviar uno a uno</h2>
        <p className="mt-1 text-sm text-muted">Se abre el chat de cada invitado con el texto ya puesto.</p>
        <ul className="mt-4 divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-surface">
          {pending.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">Añade invitados con número para enviar.</li>
          ) : (
            pending.map((guest) => {
              const wedding = weddingQuery.data;
              const text = wedding ? buildGuestMessage({ ...wedding, whatsappTemplate: template }, guest, origin) : "";
              return (
                <li key={guest.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{guest.name}</p>
                    <p className="text-xs text-subtle">{guest.sentAt ? "Ya enviado" : guest.phone}</p>
                  </div>
                  <Button size="sm" asChild>
                    <a
                      href={whatsappHref(guest.phone, text)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        void markGuestSent({ data: { ids: [guest.id] } }).then(() => {
                          void queryClient.invalidateQueries({ queryKey: ["guests"] });
                        });
                      }}
                    >
                      <WhatsAppIcon className="size-4" />
                      Enviar
                    </a>
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
