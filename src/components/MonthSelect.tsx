import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { monthLabel } from "@/lib/format";

/** "YYYY-MM" key for a date. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthKeyToDate(key: string): Date {
  const parts = key.split("-");
  const year = Number(parts[0] ?? new Date().getFullYear());
  const month = Number(parts[1] ?? 1);
  return new Date(year, month - 1, 1);
}

/** 2 meses anteriores + mês atual + próximos 12 meses. */
export function monthOptions(): { key: string; label: string }[] {
  const base = new Date();
  const list: { key: string; label: string }[] = [];

  for (let offset = -2; offset <= 12; offset += 1) {
    const date = new Date(base.getFullYear(), base.getMonth() + offset, 1);
    list.push({ key: monthKey(date), label: monthLabel(date) });
  }

  return list;
}

/** Estado compartilhado do mês selecionado (inicia no mês atual). */
export function useMonthSelection() {
  const options = useMemo(() => monthOptions(), []);
  const [selected, setSelected] = useState(() => monthKey(new Date()));
  const date = useMemo(() => monthKeyToDate(selected), [selected]);

  return { options, selected, setSelected, date };
}

export function MonthSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { key: string; label: string }[];
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Selecionar mês"
        className={
          className ??
          "h-8 w-auto gap-1.5 rounded-full border-border bg-transparent px-3 text-xs capitalize text-muted-foreground"
        }
      >
        <SelectValue />
      </SelectTrigger>

      <SelectContent className="max-h-72">
        {options.map((option) => (
          <SelectItem
            key={option.key}
            value={option.key}
            className="text-xs capitalize"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
