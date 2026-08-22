import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { useHousehold } from "@/hooks/use-household";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Duo Finanças" },
      {
        name: "description",
        content: "Defina metas de economia do casal com valor alvo, valor guardado e prazo.",
      },
      { property: "og:title", content: "Metas — Duo Finanças" },
      { property: "og:description", content: "Metas financeiras compartilhadas do casal." },
    ],
  }),
  component: MetasPage,
});

function MetasPage() {
  const queryClient = useQueryClient();
  const { data: household } = useHousehold();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    target_amount: "",
    saved_amount: "",
    due_date: "",
  });

  const { data: goals } = useQuery({
    queryKey: ["goals", household?.id],
    enabled: Boolean(household?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("id, title, target_amount, saved_amount, due_date")
        .eq("household_id", household!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createGoal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("goals").insert({
        household_id: household!.id,
        title: form.title,
        target_amount: Number(form.target_amount.replace(",", ".")),
        saved_amount: Number((form.saved_amount || "0").replace(",", ".")),
        due_date: form.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta criada.");
      setOpen(false);
      setForm({ title: "", target_amount: "", saved_amount: "", due_date: "" });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = goals ?? [];

  return (
    <AppShell
      title="Metas"
      subtitle="O que vocês querem conquistar"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="rounded-full" aria-label="Nova meta">
              <Plus className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>Nova meta</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createGoal.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="target">Valor alvo</Label>
                  <Input
                    id="target"
                    inputMode="decimal"
                    value={form.target_amount}
                    onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="saved">Já guardado</Label>
                  <Input
                    id="saved"
                    inputMode="decimal"
                    value={form.saved_amount}
                    onChange={(e) => setForm({ ...form, saved_amount: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-due">Prazo</Label>
                <Input
                  id="goal-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createGoal.isPending}>
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {rows.length === 0 ? (
        <EmptyState text="Nenhuma meta criada ainda." />
      ) : (
        <ul className="space-y-3">
          {rows.map((g) => {
            const target = Number(g.target_amount);
            const saved = Number(g.saved_amount);
            const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
            return (
              <li key={g.id} className="surface p-5">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">{g.title}</p>
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-income" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatCurrency(saved)} de {formatCurrency(target)}
                  {g.due_date ? ` · até ${formatDate(g.due_date)}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
