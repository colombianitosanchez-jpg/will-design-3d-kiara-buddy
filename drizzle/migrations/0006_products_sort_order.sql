ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
UPDATE public.products p SET sort_order = r.rn FROM (SELECT id, (row_number() OVER (ORDER BY created_at DESC))::int AS rn FROM public.products) r WHERE r.id = p.id;
CREATE INDEX IF NOT EXISTS products_sort_order_idx ON public.products (sort_order);