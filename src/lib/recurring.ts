import { supabase } from "@/integrations/supabase/client";

/** Quantos meses futuros mantemos sempre disponíveis para cada recorrência. */
const HORIZON_MONTHS = 12;

type RecurringRow = {
  id: string;
  series_id: string | null;
  household_id: string;
  account_id: string | null;
  description: string;
  amount: number | string;
  kind: string;
  category: string;
  due_date: string;
  status: string;
  recurring_value: string | null;
};

function isoDate(year: number, month: number, day: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

function monthIndex(iso: string): number {
  const [year, month] = iso.split("-").map(Number);
  return (year ?? 0) * 12 + ((month ?? 1) - 1);
}

/**
 * Garante que cada gasto/entrada recorrente tenha lançamentos nos próximos 12 meses.
 * Usa `series_id` + índice único (series_id, due_date) para nunca duplicar.
 */
export async function ensureRecurringOccurrences(householdId: string): Promise<number> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, series_id, household_id, account_id, description, amount, kind, category, due_date, status, recurring_value"
    )
    .eq("household_id", householdId)
    .eq("frequency", "recorrente");

  if (error) throw error;

  const rows = (data ?? []) as RecurringRow[];
  if (rows.length === 0) return 0;

  // Backfill de series_id para recorrências antigas.
  const orphans = rows.filter((row) => !row.series_id);
  for (const orphan of orphans) {
    const { error: fixError } = await supabase
      .from("transactions")
      .update({ series_id: orphan.id })
      .eq("id", orphan.id);
    if (fixError) throw fixError;
    orphan.series_id = orphan.id;
  }

  const groups = new Map<string, RecurringRow[]>();
  for (const row of rows) {
    const key = row.series_id as string;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const now = new Date();
  const currentIndex = now.getFullYear() * 12 + now.getMonth();
  const lastIndex = currentIndex + HORIZON_MONTHS;

  type InsertRow = {
    household_id: string;
    account_id: string | null;
    description: string;
    amount: number;
    kind: string;
    category: string;
    due_date: string;
    status: string;
    frequency: string;
    recurring_value: string;
    series_id: string;
  };

  const inserts: InsertRow[] = [];

  for (const [seriesId, list] of groups) {
    const sorted = [...list].sort((a, b) => a.due_date.localeCompare(b.due_date));
    const template = sorted[sorted.length - 1]!;
    const existing = new Set(sorted.map((row) => monthIndex(row.due_date)));
    const day = Number(template.due_date.split("-")[2] ?? 1);
    const startIndex = Math.max(currentIndex, monthIndex(sorted[0]!.due_date));

    for (let index = startIndex; index <= lastIndex; index += 1) {
      if (existing.has(index)) continue;
      const year = Math.floor(index / 12);
      const month = index % 12;

      inserts.push({
        household_id: template.household_id,
        account_id: template.account_id,
        description: template.description,
        amount: Number(template.amount),
        kind: template.kind,
        category: template.category,
        due_date: isoDate(year, month, day),
        status: "aberto",
        frequency: "recorrente",
        recurring_value: template.recurring_value ?? "variavel",
        series_id: seriesId,
      });
    }
  }

  if (inserts.length === 0) return 0;

  const { error: insertError } = await supabase.from("transactions").insert(inserts);

  if (insertError) throw insertError;

  return inserts.length;
}
