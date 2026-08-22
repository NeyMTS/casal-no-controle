import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Repeat2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { useHousehold } from "@/hooks/use-household";
import { ensureRecurringOccurrences } from "@/lib/recurring";
import {
  currencyInputValue,
  formatCurrency,
  formatDate,
  monthRange,
  parseCurrencyInput,
  todayISO,
} from "@/lib/format";
import { CurrencyInput } from "@/components/CurrencyInput";
import { MonthSelect, useMonthSelection } from "@/components/MonthSelect";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
          "Registre entradas e gastos com frequência avulsa ou recorrente.",
      },
    ],
  }),
  component: MovimentacoesPage,
});

function MovimentacoesPage() {
  const queryClient = useQueryClient();
  const { data: household } = useHousehold();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const emptyForm = {
    description: "",
    amount: "",
    kind: "gasto",
    category: "Outros",
    due_date: todayISO(),
    status: "aberto",
    frequency: "avulsa",
    recurring_value: "variavel",
  };

  const [form, setForm] = useState(emptyForm);

  const resolveHouseholdId = async (): Promise<string> => {
    if (household?.id) {
      return household.id;
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("household_members")
      .select("household_id")
      .limit(1);

    if (membershipError) {
      throw membershipError;
    }

    let householdId = memberships?.[0]?.household_id ?? null;

    if (!householdId) {
      const { data: created, error: createError } = await supabase.rpc(
        "create_household",
        {
          _name: "Nossa conta",
        }
      );

      if (createError) {
        throw createError;
      }

      householdId = created as string;
    }

    if (!householdId) {
      throw new Error(
        "Não foi possível preparar sua conta compartilhada. Atualize a página e tente novamente."
      );
    }

    return householdId;
  };

  const {
    options: monthOpts,
    selected: month,
    setSelected: setMonth,
    date: monthDate,
  } = useMonthSelection();

  const { start: monthStart, end: monthEnd } = monthRange(monthDate);

  // Mantém sempre 12 meses futuros das recorrências criados no banco.
  const { data: recurringCreated } = useQuery({
    queryKey: ["recurring-sync", household?.id],
    enabled: Boolean(household?.id),
    staleTime: 5 * 60_000,
    queryFn: () => ensureRecurringOccurrences(household!.id),
  });

  useEffect(() => {
    if (recurringCreated && recurringCreated > 0) {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["household"] });
    }
  }, [recurringCreated, queryClient]);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", household?.id, month],
    enabled: Boolean(household?.id),
    queryFn: async () => {
      if (!household?.id) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, description, amount, kind, category, due_date, status, frequency, recurring_value"
        )
        .eq("household_id", household.id)
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd)
        .order("due_date", { ascending: false });

      if (error) throw error;

      return data ?? [];
    },
  });

  const saveTransaction = useMutation({
    mutationFn: async () => {
      const savedMonth = form.due_date.slice(0, 7);
      const amount = parseCurrencyInput(form.amount);

      if (!form.description.trim()) {
        throw new Error("Informe uma descrição.");
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Informe um valor válido maior que zero.");
      }

      const payload = {
        description: form.description.trim(),
        amount,
        kind: form.kind,
        category: form.category,
        due_date: form.due_date,
        status: form.status,
        frequency: form.frequency,
        recurring_value:
          form.frequency === "recorrente" ? form.recurring_value : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("transactions")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        return savedMonth;
      }

      const householdId = await resolveHouseholdId();

      const { error } = await supabase.from("transactions").insert({
        household_id: householdId,
        ...payload,
      });

      if (error) throw error;

      return savedMonth;
    },

    onSuccess: (savedMonth) => {
      toast.success(
        editingId ? "Movimentação atualizada." : "Movimentação salva com sucesso."
      );

      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);

      // Mostra o mês da movimentação salva, para ela nunca "sumir" da lista.
      if (savedMonth && monthOpts.some((option) => option.key === savedMonth)) {
        setMonth(savedMonth);
      }

      queryClient.invalidateQueries({
        queryKey: ["transactions"],
      });

      queryClient.invalidateQueries({
        queryKey: ["household"],
      });

      queryClient.invalidateQueries({
        queryKey: ["recurring-sync"],
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Movimentação excluída.");
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["household"] });
    },

    onError: (error: Error) => toast.error(error.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: string;
    }) => {
      const { error } = await supabase
        .from("transactions")
        .update({
          status: status === "pago" ? "aberto" : "pago",
        })
        .eq("id", id);

      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactions"],
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <AppShell
      title="Movimentações"
      subtitle="Entradas e gastos do casal"
      action={
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setEditingId(null);
              setForm(emptyForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="rounded-full"
              aria-label="Nova movimentação"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              <Plus className="size-4" />
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar movimentação" : "Nova movimentação"}
              </DialogTitle>
            </DialogHeader>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveTransaction.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>

                <Input
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description: event.target.value,
                    })
                  }
                  placeholder="Ex.: Mercado"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor</Label>

                  <CurrencyInput
                    id="amount"
                    value={form.amount}
                    onValueChange={(amount) =>
                      setForm({
                        ...form,
                        amount,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>

                  <Select
                    value={form.kind}
                    onValueChange={(kind) =>
                      setForm({
                        ...form,
                        kind,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="entrada">
                        Entrada
                      </SelectItem>

                      <SelectItem value="gasto">
                        Gasto
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>

                <Select
                  value={form.category}
                  onValueChange={(category) =>
                    setForm({
                      ...form,
                      category,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequência</Label>

                <Select
                  value={form.frequency}
                  onValueChange={(frequency) =>
                    setForm({
                      ...form,
                      frequency,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="avulsa">
                      Avulsa
                    </SelectItem>

                    <SelectItem value="recorrente">
                      Recorrente mensal
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.frequency === "recorrente" && (
                <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Repeat2 className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        Repetir todos os meses
                      </p>

                      <p className="text-xs text-muted-foreground">
                        O lançamento poderá ter o valor ajustado a cada mês.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Valor</Label>

                      <Select
                        value={form.recurring_value}
                        onValueChange={(recurring_value) =>
                          setForm({
                            ...form,
                            recurring_value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="fixo">
                            Fixo
                          </SelectItem>

                          <SelectItem value="variavel">
                            Variável
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="due-date">Vencimento</Label>

                      <Input
                        id="due-date"
                        type="date"
                        value={form.due_date}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            due_date: event.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {form.frequency === "avulsa" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="due-date">Vencimento</Label>

                    <Input
                      id="due-date"
                      type="date"
                      value={form.due_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          due_date: event.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>

                    <Select
                      value={form.status}
                      onValueChange={(status) =>
                        setForm({
                          ...form,
                          status,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="aberto">
                          Em aberto
                        </SelectItem>

                        <SelectItem value="pago">
                          Pago
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {form.frequency === "recorrente" && (
                <div className="space-y-2">
                  <Label>Status atual</Label>

                  <Select
                    value={form.status}
                    onValueChange={(status) =>
                      setForm({
                        ...form,
                        status,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="aberto">
                        Em aberto
                      </SelectItem>

                      <SelectItem value="pago">
                        Pago
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={saveTransaction.isPending}
              >
                {saveTransaction.isPending
                  ? "Salvando..."
                  : editingId
                    ? "Salvar alterações"
                    : "Salvar movimentação"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="mb-4 flex justify-start">
        <MonthSelect value={month} onChange={setMonth} options={monthOpts} />
      </div>

      {transactions.length === 0 ? (
        <EmptyState text="Nenhuma movimentação neste mês." />
      ) : (
        <ul className="space-y-2">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="surface px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {transaction.description}
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {transaction.category} ·{" "}
                      {formatDate(transaction.due_date)}
                    </p>
                  </div>
                </div>

                <span
                  className={
                    transaction.kind === "entrada"
                      ? "shrink-0 text-sm font-semibold text-income"
                      : "shrink-0 text-sm font-semibold text-expense"
                  }
                >
                  {transaction.kind === "entrada" ? "+" : "-"}
                  {formatCurrency(Number(transaction.amount))}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() =>
                    toggleStatus.mutate({
                      id: transaction.id,
                      status: transaction.status,
                    })
                  }
                  className={
                    transaction.status === "pago"
                      ? "rounded-full bg-income-soft px-3 py-1 text-[11px] font-medium text-income"
                      : "rounded-full bg-sand px-3 py-1 text-[11px] font-medium text-sand-foreground"
                  }
                >
                  {transaction.status === "pago"
                    ? "Pago"
                    : "Em aberto"}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={
                      transaction.status === "pago"
                        ? "Desmarcar pagamento"
                        : "Marcar como paga"
                    }
                    title={
                      transaction.status === "pago"
                        ? "Desmarcar pagamento"
                        : "Marcar como paga"
                    }
                    className={
                      transaction.status === "pago"
                        ? "rounded-full p-2 text-income transition-colors hover:text-muted-foreground"
                        : "rounded-full p-2 text-muted-foreground transition-colors hover:text-income"
                    }
                    onClick={() =>
                      toggleStatus.mutate({
                        id: transaction.id,
                        status: transaction.status,
                      })
                    }
                  >
                    {transaction.status === "pago" ? (
                      <RotateCcw className="size-3.5" strokeWidth={1.8} />
                    ) : (
                      <Check className="size-3.5" strokeWidth={1.8} />
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label="Editar movimentação"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => {
                      setEditingId(transaction.id);
                      setForm({
                        description: transaction.description,
                        amount: currencyInputValue(transaction.amount),
                        kind: transaction.kind,
                        category: transaction.category,
                        due_date: transaction.due_date,
                        status: transaction.status,
                        frequency: transaction.frequency ?? "avulsa",
                        recurring_value:
                          transaction.recurring_value ?? "variavel",
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" strokeWidth={1.8} />
                  </button>

                  <button
                    type="button"
                    aria-label="Excluir movimentação"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:text-expense"
                    onClick={() => setDeletingId(transaction.id)}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog
        open={Boolean(deletingId)}
        onOpenChange={(next) => !next && setDeletingId(null)}
      >
        <AlertDialogContent className="max-w-xs rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deletingId) deleteTransaction.mutate(deletingId);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
