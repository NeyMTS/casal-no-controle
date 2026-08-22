ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'avulsa',
  ADD COLUMN IF NOT EXISTS recurring_value text;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_frequency_check CHECK (frequency IN ('avulsa','recorrente'));

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_recurring_value_check CHECK (recurring_value IS NULL OR recurring_value IN ('fixo','variavel'));