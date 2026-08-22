import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { useHousehold } from "@/hooks/use-household";
import { formatCurrency, formatDate, monthLabel, monthRange } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({
    meta: [
      { title: "Início — Duo Finanças" },
      {
        name: "description",
        content: "Resumo do mês com entradas, gastos e saldo da conta compartilhada do casal.",
      },
      { property: "og:title", content: "Início — Duo Finanças" },
      { property: "og:description", content: "Resumo financeiro do mês do casal." },
    ],
  }),
  component: InicioPage,
});

function InicioPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: household } = useHousehold();
  const now = new Date();
  const { start, end } = monthRange(now);

  const { data: transactions } = useQuery({
    queryKey: ["transactions", "month", household?.id, start],
    enabled: Boolean(household?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, kind, category, due_date, status")
        .eq("household_id", household!.id)
        .gte("due_date", start)
        .lte("due_date", end)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const rows = transactions ?? [];
  const income = rows
    .filter((t) => t.kind === "entrada")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = rows
    .filter((t) => t.kind === "gasto")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const open = rows.filter((t) => t.status === "aberto");

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell
      title="Início"
      subtitle={monthLabel(now)}
      action={
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sair"
          className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <LogOut className="size-4" strokeWidth={1.6} />
        </button>
      }
    >
      <section className="surface p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Saldo do mês
        </p>
        <p className="text-balance-tight mt-2 text-4xl font-semibold">
          {formatCurrency(income - expense)}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {household ? `${household.name} · código ${household.invite_code}` : "Carregando..."}
        </p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-income">
            <ArrowDownLeft className="size-4" strokeWidth={1.8} />
            <span className="text-xs font-medium">Entradas</span>
          </div>
          <p className="mt-2 text-lg font-semibold">{formatCurrency(income)}</p>
        </div>
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-expense">
            <ArrowUpRight className="size-4" strokeWidth={1.8} />
            <span className="text-xs font-medium">Gastos</span>
          </div>
          <p className="mt-2 text-lg font-semibold">{formatCurrency(expense)}</p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Em aberto</h2>
          <Link to="/movimentacoes" className="text-xs text-muted-foreground">
            Ver tudo
          </Link>
        </div>
        {open.length === 0 ? (
          <EmptyState text="Nada em aberto neste mês." />
        ) : (
          <ul className="space-y-2">
            {open.slice(0, 5).map((t) => (
              <li key={t.id} className="surface flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.category} · vence {formatDate(t.due_date)}
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
