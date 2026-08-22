import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { resolveHouseholdId, useHousehold } from "@/hooks/use-household";
import {
  currencyInputValue,
  formatCurrency,
  formatDate,
  parseCurrencyInput,
} from "@/lib/format";
import { CurrencyInput } from "@/components/CurrencyInput";
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

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Duo Finanças" },
      {
        name: "description",
        content:
          "Defina e acompanhe metas financeiras compartilhadas do casal.",
      },
    ],
  }),
  component: MetasPage,
});

const emptyForm = {
  title: "",
  target_amount: "",
  saved_amount: "",
  due_date: "",
};

type GoalPlanStep = {
  label: string;
  target: number;
  completed: boolean;
};

function getGoalPlan(
  targetAmount: number,
  savedAmount: number,
  dueDate: string | null
): GoalPlanStep[] {
  if (!dueDate || targetAmount <= 0) {
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);

  if (Number.isNaN(due.getTime()) || due <= today) {
    return [];
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.ceil(
    (due.getTime() - today.getTime()) / millisecondsPerDay
  );

  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  const steps: GoalPlanStep[] = [];

  if (totalWeeks <= 8) {
    const numberOfSteps = Math.min(totalWeeks, 8);

    for (let index = 1; index <= numberOfSteps; index++) {
      const stepTarget = (targetAmount / numberOfSteps) * index;

      steps.push({
        label: `Semana ${index}`,
        target: stepTarget,
        completed: savedAmount >= stepTarget,
      });
    }

    return steps;
  }

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const dueYear = due.getFullYear();
  const dueMonth = due.getMonth();

  const totalMonths =
    (dueYear - currentYear) * 12 + (dueMonth - currentMonth) + 1;

  const numberOfSteps = Math.max(1, Math.min(totalMonths, 12));

  for (let index = 1; index <= numberOfSteps; index++) {
    const stepTarget = (targetAmount / numberOfSteps) * index;

    steps.push({
      label: `Mês ${index}`,
      target: stepTarget,
      completed: savedAmount >= stepTarget,
    });
  }

  return steps;
}

function getNextGoalStep(steps: GoalPlanStep[]) {
  return steps.find((step) => !step.completed) ?? null;
}

function MetasPage() {
  const queryClient = useQueryClient();
  const { data: household } = useHousehold();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<string[]>([]);

  const [form, setForm] = useState(emptyForm);

  const { data: goals } = useQuery({
    queryKey: ["goals", household?.id],
    enabled: Boolean(household?.id),
    queryFn: async () => {
      if (!household?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("goals")
        .select("id, title, target_amount, saved_amount, due_date")
        .eq("household_id", household.id)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });

  const saveGoal = useMutation({
    mutationFn: async () => {
      const targetAmount = parseCurrencyInput(form.target_amount);
      const savedAmount = parseCurrencyInput(form.saved_amount);

      if (!form.title.trim()) {
        throw new Error("Informe o nome da meta.");
      }

      if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
        throw new Error("Informe um valor alvo válido.");
      }

      const payload = {
        title: form.title.trim(),
        target_amount: targetAmount,
        saved_amount: savedAmount,
        due_date: form.due_date || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("goals")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        return;
      }

      const householdId = await resolveHouseholdId();

      const { error } = await supabase.from("goals").insert({
        household_id: householdId,
        ...payload,
      });

      if (error) {
        throw error;
      }
    },

    onSuccess: () => {
      toast.success(editingId ? "Meta atualizada." : "Meta criada.");

      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);

      queryClient.invalidateQueries({
        queryKey: ["goals"],
      });
    },

    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },

    onSuccess: () => {
      toast.success("Meta excluída.");
      setDeletingId(null);

      queryClient.invalidateQueries({
        queryKey: ["goals"],
      });
    },

    onError: (error: Error) => toast.error(error.message),
  });

  const toggleGoalPlan = (goalId: string) => {
    setExpandedGoals((current) =>
      current.includes(goalId)
        ? current.filter((id) => id !== goalId)
        : [...current, goalId]
    );
  };

  const rows = goals ?? [];

  return (
    <AppShell
      title="Metas"
      subtitle="O que vocês querem conquistar"
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
              size="icon"
              className="rounded-full"
              aria-label="Nova meta"
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
                {editingId ? "Editar meta" : "Nova meta"}
              </DialogTitle>
            </DialogHeader>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveGoal.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="title">Nome da meta</Label>

                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      title: event.target.value,
                    })
                  }
                  placeholder="Ex.: Viagem"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="target">Objetivo</Label>

                  <CurrencyInput
                    id="target"
                    value={form.target_amount}
                    onValueChange={(target_amount) =>
                      setForm({
                        ...form,
                        target_amount,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saved">Já guardado</Label>

                  <CurrencyInput
                    id="saved"
                    value={form.saved_amount}
                    onValueChange={(saved_amount) =>
                      setForm({
                        ...form,
                        saved_amount,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-due">Prazo</Label>

                <Input
                  id="goal-due"
                  type="date"
                  value={form.due_date}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      due_date: event.target.value,
                    })
                  }
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={saveGoal.isPending}
              >
                {saveGoal.isPending
                  ? "Salvando..."
                  : editingId
                    ? "Salvar alterações"
                    : "Salvar meta"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {rows.length === 0 ? (
        <div className="surface flex flex-col items-center px-6 py-10 text-center">
          <div className="rounded-full bg-muted p-3">
            <Target
              className="size-5 text-muted-foreground"
              strokeWidth={1.6}
            />
          </div>

          <p className="mt-4 text-sm font-medium">
            Nenhuma meta criada
          </p>

          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Definam juntos um objetivo e acompanhem
            o progresso ao longo do tempo.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((goal) => {
            const targetAmount = Number(goal.target_amount);
            const savedAmount = Number(goal.saved_amount);

            const percentage =
              targetAmount > 0
                ? Math.min(
                    100,
                    Math.round(
                      (savedAmount / targetAmount) * 100
                    )
                  )
                : 0;

            const remainingAmount = Math.max(
              0,
              targetAmount - savedAmount
            );

            const completed = percentage >= 100;

            const planSteps = getGoalPlan(
              targetAmount,
              savedAmount,
              goal.due_date
            );

            const nextStep = getNextGoalStep(planSteps);

            const previousStepTarget =
              planSteps
                .filter((step) => step.completed)
                .at(-1)?.target ?? 0;

            const amountToNextStep = nextStep
              ? Math.max(0, nextStep.target - savedAmount)
              : 0;

            const isPlanExpanded = expandedGoals.includes(goal.id);

            return (
              <li
                key={goal.id}
                className="surface p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {completed && (
                        <div className="rounded-full bg-income-soft p-1">
                          <Check
                            className="size-3 text-income"
                            strokeWidth={2}
                          />
                        </div>
                      )}

                      <p className="truncate text-sm font-medium">
                        {goal.title}
                      </p>
                    </div>

                    <p className="mt-2 text-xl font-semibold tracking-tight">
                      {formatCurrency(savedAmount)}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      de {formatCurrency(targetAmount)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">
                      {percentage}%
                    </p>

                    {completed ? (
                      <p className="mt-1 text-xs text-income">
                        Concluída
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        em andamento
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-income transition-all"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

                {planSteps.length > 0 && !completed && (
                  <div className="mt-4 border-t border-border/60 pt-2">
                    <button
                      type="button"
                      onClick={() => toggleGoalPlan(goal.id)}
                      className="flex w-full items-center justify-between py-2 text-left"
                      aria-expanded={isPlanExpanded}
                    >
                      <div>
                        <p className="text-xs font-medium">
                          Plano da meta
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {planSteps.filter((step) => step.completed).length}/
                          {planSteps.length} etapas concluídas
                        </p>
                      </div>

                      {isPlanExpanded ? (
                        <ChevronUp
                          className="size-4 text-muted-foreground"
                          strokeWidth={1.8}
                        />
                      ) : (
                        <ChevronDown
                          className="size-4 text-muted-foreground"
                          strokeWidth={1.8}
                        />
                      )}
                    </button>

                    {isPlanExpanded && (
                      <div className="pt-3">
                        {nextStep && (
                          <div className="rounded-xl border border-border/60 px-3 py-3">
                            <p className="text-xs text-muted-foreground">
                              Próximo objetivo
                            </p>

                            <div className="mt-1 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">
                                  {nextStep.label}
                                </p>

                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  Chegar a{" "}
                                  {formatCurrency(nextStep.target)}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-sm font-semibold">
                                  {formatCurrency(amountToNextStep)}
                                </p>

                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                  faltam
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-medium">
                              Etapas
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {planSteps.filter((step) => step.completed).length}/
                              {planSteps.length}
                            </p>
                          </div>

                          <div className="space-y-2">
                            {planSteps.map((step, index) => {
                              const isNextStep =
                                nextStep?.label === step.label;

                              return (
                                <div
                                  key={`${goal.id}-${step.label}`}
                                  className="flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="flex min-w-0 items-center gap-2">
                                    <div
                                      className={
                                        step.completed
                                          ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-income-soft"
                                          : isNextStep
                                            ? "flex size-5 shrink-0 items-center justify-center rounded-full border border-income"
                                            : "flex size-5 shrink-0 items-center justify-center rounded-full bg-muted"
                                      }
                                    >
                                      {step.completed && (
                                        <Check
                                          className="size-3 text-income"
                                          strokeWidth={2}
                                        />
                                      )}

                                      {!step.completed && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {index + 1}
                                        </span>
                                      )}
                                    </div>

                                    <span
                                      className={
                                        step.completed
                                          ? "text-income"
                                          : "truncate text-muted-foreground"
                                      }
                                    >
                                      {step.label}
                                    </span>
                                  </div>

                                  <span
                                    className={
                                      step.completed
                                        ? "font-medium text-income"
                                        : "shrink-0 text-muted-foreground"
                                    }
                                  >
                                    {formatCurrency(step.target)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {previousStepTarget > 0 && nextStep && (
                            <p className="mt-3 text-[11px] text-muted-foreground">
                              Você já superou o marco de{" "}
                              {formatCurrency(previousStepTarget)}.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                  <span>
                    {completed
                      ? "Objetivo alcançado"
                      : `Faltam ${formatCurrency(
                          remainingAmount
                        )}`}
                  </span>

                  <div className="flex items-center gap-3">
                    {goal.due_date && (
                      <span>
                        Até {formatDate(goal.due_date)}
                      </span>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Editar meta"
                        className="rounded-full p-1.5 transition-colors hover:text-foreground"
                        onClick={() => {
                          setEditingId(goal.id);

                          setForm({
                            title: goal.title,
                            target_amount: currencyInputValue(
                              goal.target_amount
                            ),
                            saved_amount: currencyInputValue(
                              goal.saved_amount
                            ),
                            due_date: goal.due_date ?? "",
                          });

                          setOpen(true);
                        }}
                      >
                        <Pencil
                          className="size-3.5"
                          strokeWidth={1.8}
                        />
                      </button>

                      <button
                        type="button"
                        aria-label="Excluir meta"
                        className="rounded-full p-1.5 transition-colors hover:text-expense"
                        onClick={() =>
                          setDeletingId(goal.id)
                        }
                      >
                        <Trash2
                          className="size-3.5"
                          strokeWidth={1.8}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog
        open={Boolean(deletingId)}
        onOpenChange={(next) =>
          !next && setDeletingId(null)
        }
      >
        <AlertDialogContent className="max-w-xs rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir meta?
            </AlertDialogTitle>

            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();

                if (deletingId) {
                  deleteGoal.mutate(deletingId);
                }
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
