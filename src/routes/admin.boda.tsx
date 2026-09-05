import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveWedding, getWedding } from "@/lib/wedding/server";
import { DEFAULT_SCHEDULE, type ScheduleItem, type Wedding } from "@/lib/wedding/types";

export const Route = createFileRoute("/admin/boda")({ component: WeddingPage });

function emptyWedding(): Omit<Wedding, "id"> {
  return {
    partnerOne: "",
    partnerTwo: "",
    weddingDate: null,
    weddingTime: "",
    venueName: "",
    venueAddress: "",
    venueMapsUrl: "",
    dressCode: "",
    story: "",
    welcomeNote: "",
    schedule: DEFAULT_SCHEDULE,
    whatsappTemplate: "",
    rsvpDeadline: null,
  };
}

function WeddingPage() {
  const queryClient = useQueryClient();
  const weddingQuery = useQuery({ queryKey: ["wedding"], queryFn: () => getWedding() });
  const [form, setForm] = useState(emptyWedding());

  useEffect(() => {
    if (!weddingQuery.data) return;
    const { id: _id, ...rest } = weddingQuery.data;
    void _id;
    setForm(rest);
  }, [weddingQuery.data]);

  const save = useMutation({
    mutationFn: () => saveWedding({ data: form }),
    onSuccess: () => {
      toast.success("Boda guardada");
      void queryClient.invalidateQueries({ queryKey: ["wedding"] });
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  function patchSchedule(index: number, next: Partial<ScheduleItem>) {
    setForm({
      ...form,
      schedule: form.schedule.map((item, i) => (i === index ? { ...item, ...next } : item)),
    });
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <header>
        <p className="text-[11px] tracking-[0.22em] text-muted uppercase">Detalles</p>
        <h1 className="font-display text-4xl italic">La boda</h1>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Novio o novia">
          <Input value={form.partnerOne} onChange={(e) => setForm({ ...form, partnerOne: e.target.value })} />
        </Field>
        <Field label="Novio o novia">
          <Input value={form.partnerTwo} onChange={(e) => setForm({ ...form, partnerTwo: e.target.value })} />
        </Field>
        <Field label="Fecha">
          <Input type="date" value={form.weddingDate ?? ""} onChange={(e) => setForm({ ...form, weddingDate: e.target.value || null })} />
        </Field>
        <Field label="Hora">
          <Input value={form.weddingTime} onChange={(e) => setForm({ ...form, weddingTime: e.target.value })} placeholder="16:00" />
        </Field>
        <Field label="Lugar">
          <Input value={form.venueName} onChange={(e) => setForm({ ...form, venueName: e.target.value })} />
        </Field>
        <Field label="Dirección">
          <Input value={form.venueAddress} onChange={(e) => setForm({ ...form, venueAddress: e.target.value })} />
        </Field>
        <Field label="Mapa">
          <Input value={form.venueMapsUrl} onChange={(e) => setForm({ ...form, venueMapsUrl: e.target.value })} />
        </Field>
        <Field label="Confirmar antes de">
          <Input type="date" value={form.rsvpDeadline ?? ""} onChange={(e) => setForm({ ...form, rsvpDeadline: e.target.value || null })} />
        </Field>
      </div>
      <Field label="Vestimenta">
        <Input value={form.dressCode} onChange={(e) => setForm({ ...form, dressCode: e.target.value })} />
      </Field>
      <Field label="Nota de bienvenida">
        <Textarea rows={4} value={form.welcomeNote} onChange={(e) => setForm({ ...form, welcomeNote: e.target.value })} />
      </Field>
      <Field label="Historia de los novios">
        <Textarea rows={5} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} />
      </Field>
      <section className="space-y-3">
        <h2 className="font-display text-2xl italic">Itinerario</h2>
        {form.schedule.map((item, index) => (
          <div key={index} className="grid gap-2 md:grid-cols-[7rem_1fr_1fr]">
            <Input value={item.time} onChange={(e) => patchSchedule(index, { time: e.target.value })} />
            <Input value={item.title} onChange={(e) => patchSchedule(index, { title: e.target.value })} />
            <Input value={item.detail} onChange={(e) => patchSchedule(index, { detail: e.target.value })} />
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setForm({ ...form, schedule: [...form.schedule, { time: "", title: "", detail: "" }] })}
        >
          <Plus aria-hidden="true" />
          Añadir momento
        </Button>
      </section>
      <Button type="submit" disabled={save.isPending}>
        <Save aria-hidden="true" />
        Guardar
      </Button>
    </form>
  );
}
