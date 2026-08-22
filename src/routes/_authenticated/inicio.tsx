import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  LogOut,
  MoreVertical,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { useHousehold } from "@/hooks/use-household";
import { useCoupleNames } from "@/hooks/use-couple-names";
import { MonthSelect, useMonthSelection } from "@/components/MonthSelect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatDate,
  monthLabel,
  monthRange,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Início — Casal no Controle" },
      {
        name: "description",
        content:
          "Resumo do mês com entradas, gastos, movimentações e metas do casal.",
      },
    ],
  }),
  component: InicioPage,
});

function InicioPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: household } = useHousehold();
  const { names, save, label } = useCoupleNames();

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState({
    first: "",
    second: "",
  });

  function openEdit() {
    setDraft(names);
    setEditOpen(true);
  }

  const {
    options: monthOpts,
    selected: month,
    setSelected: setMonth,
    date: now,
  } = useMonthSelection();

  const { start, end } = monthRange(now);

  const { data: transactions } = useQuery({
    queryKey: ["transactions", "month", household?.id, start],
    enabled: Boolean(household?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          "id, description, amount, kind, category, due_date, status"
        )
        .eq("household_id", household!.id)
        .gte("due_date", start)
        .lte("due_date", end)
        .order("due_date", { ascending: true });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const { data: goals } = useQuery({
    queryKey: ["goals", household?.id],
    enabled: Boolean(household?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("id, title, target_amount, saved_amount, due_date")
        .eq("household_id", household!.id)
        .order("created_at", { ascending: false })
        .limit(2);

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const rows = transactions ?? [];

  const income = rows
    .filter((transaction) => transaction.kind === "entrada")
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0
    );

  const expense = rows
    .filter((transaction) => transaction.kind === "gasto")
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0
    );

  const balance = income - expense;

  const openTransactions = rows.filter(
    (transaction) => transaction.status === "aberto"
  );

  async function handleSignOut() {
    await queryClient.cancelQueries();

    queryClient.clear();

    await supabase.auth.signOut();

    navigate({
      to: "/auth",
      replace: true,
    });
  }

  return (
    <AppShell
      title="Início"
      subtitle={monthLabel(now)}
      action={
        <div className="flex flex-col items-end gap-2">
          <p className="max-w-[60%] truncate text-right text-balance-tight text-2xl font-semibold leading-tight">
            {label}
          </p>

          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Configurações"
                className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <MoreVertical
                  className="size-4"
                  strokeWidth={1.6}
                />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={openEdit}>
                  Personalizar casal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sair"
              className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut
                className="size-4"
                strokeWidth={1.6}
              />
            </button>
          </div>
        </div>
      }
    >
      <Dialog
        open={editOpen}
        onOpenChange={setEditOpen}
      >
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              Personalizar casal
            </DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              save(draft);
              setEditOpen(false);
            }}
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="couple-1"
                className="text-xs"
              >
                Nome 1
              </Label>

              <Input
                id="couple-1"
                value={draft.first}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    first: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="couple-2"
                className="text-xs"
              >
                Nome 2
              </Label>

              <Input
                id="couple-2"
                value={draft.second}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    second: event.target.value,
                  }))
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full"
            >
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <section className="surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Saldo do mês
            </p>

            <p className="mt-2 text-4xl font-semibold tracking-tight">
              {formatCurrency(balance)}
            </p>
          </div>

          <MonthSelect
            value={month}
            onChange={setMonth}
            options={monthOpts}
            className="h-8 w-auto shrink-0 gap-1.5 rounded-full border border-border bg-background px-3 text-xs capitalize text-foreground"
          />
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {household
              ? household.name
              : "Carregando sua conta..."}
          </p>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-income">
            <ArrowDownLeft
              className="size-4"
              strokeWidth={1.8}
            />

            <span className="text-xs font-medium">
              Entradas
            </span>
          </div>

          <p className="mt-3 text-xl font-semibold tracking-tight text-income">
            {formatCurrency(income)}
          </p>
        </div>

        <div className="surface p-4">
          <div className="flex items-center gap-2 text-expense">
            <ArrowUpRight
              className="size-4"
              strokeWidth={1.8}
            />

            <span className="text-xs font-medium">
              Gastos
            </span>
          </div>

          <p className="mt-3 text-xl font-semibold tracking-tight text-expense">
            {formatCurrency(expense)}
          </p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Próximos vencimentos
            </h2>

            <div className="mt-1 flex items-center gap-1.5">
              {openTransactions.length === 0 ? (
                <>
                  <CheckCircle2 className="size-3.5 text-income" />

                  <p className="text-xs text-muted-foreground">
                    Tudo em dia por enquanto
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="size-3.5 text-warning" />

                  <p className="text-xs text-warning">
                    {openTransactions.length} movimentação
                    {openTransactions.length > 1
                      ? "ões"
                      : ""}{" "}
                    em aberto
                  </p>
                </>
              )}
            </div>
          </div>

          <Link
            to="/movimentacoes"
            className="flex items-center gap-1 text-xs text-slateblue"
          >
            Ver tudo
            <ChevronRight className="size-3" />
          </Link>
        </div>

        {openTransactions.length === 0 ? (
          <EmptyState text="Nada em aberto neste mês." />
        ) : (
          <ul className="space-y-2">
            {openTransactions
              .slice(0, 4)
              .map((transaction) => (
                <li
                  key={transaction.id}
                  className="surface flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {transaction.description}
                    </p>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-warning">
                        Em aberto
                      </span>

                      <p className="text-xs text-muted-foreground">
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
                    {transaction.kind === "entrada"
                      ? "+"
                      : "-"}
                    {formatCurrency(
                      Number(transaction.amount)
                    )}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              Metas
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Acompanhe seus próximos objetivos
            </p>
          </div>

          <Link
            to="/metas"
            className="flex items-center gap-1 text-xs text-slateblue"
          >
            Ver tudo
            <ChevronRight className="size-3" />
          </Link>
        </div>

        {!goals || goals.length === 0 ? (
          <Link
            to="/metas"
            className="surface flex items-center justify-between px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slateblue-soft p-2">
                <Target
                  className="size-4 text-slateblue"
                  strokeWidth={1.7}
                />
              </div>

              <div>
                <p className="text-sm font-medium">
                  Crie sua primeira meta
                </p>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Planeje um objetivo juntos
                </p>
              </div>
            </div>

            <ChevronRight className="size-4 text-slateblue" />
          </Link>
        ) : (
          <div className="space-y-2">
            {goals.map((goal) => {
              const currentAmount = Number(
                goal.saved_amount
              );

              const targetAmount = Number(
                goal.target_amount
              );

              const progress =
                targetAmount > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (currentAmount / targetAmount) * 100
                      )
                    )
                  : 0;

              return (
                <Link
                  key={goal.id}
                  to="/metas"
                  className="surface block px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {goal.title}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatCurrency(currentAmount)} de{" "}
                        {formatCurrency(targetAmount)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-income-soft px-2 py-1 text-xs font-medium text-income">
                      {progress}%
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-income transition-all"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
