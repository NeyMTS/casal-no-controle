import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Repeat2 } from "lucide-react";
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

  const [form, setForm] = useState({
    description: "",
    amount: "",
    kind: "gasto",
    category: "Outros",
    due_date: todayISO(),
    status: "aberto",
    frequency: "avulsa",
    recurring_value: "variavel",
  });

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

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", household?.id],
    enabled: Boolean(household?.id),
    queryFn: async () => {
      if (!household?.id) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, description, amount, kind, category, due_date, status"
        )
        .eq("household_id", household.id)
        .order("due_date", { ascending: false });

      if (error) throw error;

      return data ?? [];
    },
  });

  const createTransaction = useMutation({
    mutationFn: async () => {
      const householdId = await resolveHouseholdId();

      const amount = Number(
        form.amount.replace(/\./g, "").replace(",", ".")
      );

      if (!form.description.trim()) {
        throw new Error("Informe uma descrição.");
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Informe um valor válido maior que zero.");
      }

      const { error } = await supabase.from("transactions").insert({
        household_id: householdId,
        description: form.description.trim(),
        amount,
        kind: form.kind,
        category: form.category,
        due_date: form.due_date,
        status: form.status,
        frequency: form.frequency,
        recurring_value:
          form.frequency === "recorrente" ? form.recurring_value : null,
      });

      if (error) throw error;

      return householdId;
    },

    onSuccess: () => {
      toast.success("Movimentação salva com sucesso.");

      setOpen(false);

      setForm({
        description: "",
        amount: "",
        kind: "gasto",
        category: "Outros",
        due_date: todayISO(),
        status: "aberto",
        frequency: "avulsa",
        recurring_value: "variavel",
      });

      queryClient.invalidateQueries({
        queryKey: ["transactions"],
      });

      queryClient.invalidateQueries({
        queryKey: ["household"],
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="rounded-full"
              aria-label="Nova movimentação"
            >
              <Plus className="size-4" />
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>Nova movimentação</DialogTitle>
            </DialogHeader>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                createTransaction.mutate();
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

                  <Input
                    id="amount"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        amount: event.target.value,
                      })
                    }
                    placeholder="0,00"
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
                disabled={createTransaction.isPending}
              >
                {createTransaction.isPending
                  ? "Salvando..."
                  : "Salvar movimentação"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {transactions.length === 0 ? (
        <EmptyState text="Nenhuma movimentação registrada ainda." />
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
                    ? "mt-3 rounded-full bg-income-soft px-3 py-1 text-[11px] font-medium text-income"
                    : "mt-3 rounded-full bg-sand px-3 py-1 text-[11px] font-medium text-sand-foreground"
                }
              >
                {transaction.status === "pago"
                  ? "Pago"
                  : "Em aberto"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
