ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS series_id uuid;

UPDATE public.transactions SET series_id = id WHERE frequency = 'recorrente' AND series_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_series_month_idx
  ON public.transactions (series_id, due_date)
  WHERE series_id IS NOT NULL;