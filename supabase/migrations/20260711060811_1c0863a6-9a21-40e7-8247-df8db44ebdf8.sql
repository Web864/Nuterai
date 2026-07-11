
ALTER TYPE public.meal_source ADD VALUE IF NOT EXISTS 'ai_photo_scan';
ALTER TYPE public.meal_source ADD VALUE IF NOT EXISTS 'barcode';

ALTER TABLE public.meal_entries
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS sugar_g NUMERIC,
  ADD COLUMN IF NOT EXISTS sodium_mg NUMERIC,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS meal_entries_barcode_idx ON public.meal_entries (user_id, barcode) WHERE barcode IS NOT NULL;
