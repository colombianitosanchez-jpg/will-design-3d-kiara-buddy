ALTER TABLE public.products
  ADD COLUMN btn_text varchar NOT NULL DEFAULT 'Ver más',
  ADD COLUMN show_whatsapp boolean NOT NULL DEFAULT false;