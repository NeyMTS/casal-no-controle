import { useCallback, useEffect, useState } from "react";

export type CoupleNames = { first: string; second: string };

const STORAGE_KEY = "casal-no-controle:couple-names";

export const defaultCoupleNames: CoupleNames = {
  first: "Josinei",
  second: "Larissa",
};

function read(): CoupleNames {
  if (typeof window === "undefined") return defaultCoupleNames;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultCoupleNames;

    const parsed = JSON.parse(raw) as Partial<CoupleNames>;

    return {
      first: parsed.first?.trim() || defaultCoupleNames.first,
      second: parsed.second?.trim() || defaultCoupleNames.second,
    };
  } catch {
    return defaultCoupleNames;
  }
}

export function useCoupleNames() {
  const [names, setNames] = useState<CoupleNames>(defaultCoupleNames);

  useEffect(() => {
    setNames(read());
  }, []);

  const save = useCallback((next: CoupleNames) => {
    const value: CoupleNames = {
      first: next.first.trim() || defaultCoupleNames.first,
      second: next.second.trim() || defaultCoupleNames.second,
    };

    setNames(value);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, []);

  return { names, save, label: `${names.first} & ${names.second}` };
}
