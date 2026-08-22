import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { useHousehold } from "@/hooks/use-household";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const CATEGORIES = [
  "Moradia",
  "Mercado",
  "Transporte",
  "Saúde",
  "Lazer",
  "Salário",
  "Outros",
];

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  head: () => ({
    meta: [
      { title: "Movimentações — Duo Finanças" },
      {
        name: "description",
        content:
          "Registre entradas e gastos com descrição, valor, categoria, vencimento e status de pagamento.",
      },
      { property: "og:title", content: "Movimentações — Duo Finanças" },
      {
        property: "og:description",
        content: "Entradas e gastos compartilhados do casal em um só lugar.",
      },
    ],
  }),
  component: MovimentacoesPage,
});

function MovimentacoesPage() {
  const queryClient = useQueryClient();
  const { data: household } = useHousehold();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    kind: "gasto",
    category: "Outros",
    due_date: todayISO(),
    status: "aberto",
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions", household?.id],
    enabled: Boolean(household?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, kind, category, due_date, status")
        .eq("household_id", household!.id)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createTransaction = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").insert({
        household_id: household!.id,
        description: form.description,
        amount: Number(form.amount.replace(",", ".")),
        kind: form.kind,
        category: form.category,
        due_date: form.due_date,
        status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimentação salva.");
      setOpen(false);
      setForm({ ...form, description: "", amount: "" });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ status: status === "pago" ? "aberto" : "pago" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = transactions ?? [];

  return (
    <AppShell
      title="Movimentações"
      subtitle="Entradas e gastos do casal"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="rounded-full" aria-label="Nova movimentação">
              <Plus className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>Nova movimentação</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createTransaction.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor</Label>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.kind}
                    onValueChange={(kind) => setForm({ ...form, kind })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="gasto">Gasto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(category) => setForm({ ...form, category })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="due">Vencimento</Label>
                  <Input
                    id="due"
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(status) => setForm({ ...form, status })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aberto">Em aberto</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createTransaction.isPending}>
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {rows.length === 0 ? (
        <EmptyState text="Nenhuma movimentação registrada ainda." />
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <li key={t.id} className="surface px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{t.description}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.category} · {formatDate(t.due_date)}
                  </p>
                </div>
                <span
                  className={
                    t.kind === "entrada"
                      ? "text-sm font-semibold text-income"
                      : "text-sm font-semibold text-expense"
                  }
                >
                  {t.kind === "entrada" ? "+" : "-"}
                  {formatCurrency(Number(t.amount))}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleStatus.mutate({ id: t.id, status: t.status })}
                className={
                  t.status === "pago"
                    ? "mt-3 rounded-full bg-income-soft px-3 py-1 text-[11px] font-medium text-income"
                    : "mt-3 rounded-full bg-sand px-3 py-1 text-[11px] font-medium text-sand-foreground"
                }
              >
                {t.status === "pago" ? "Pago" : "Em aberto"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
