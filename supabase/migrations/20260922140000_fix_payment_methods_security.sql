-- Fix: public payment methods must never expose sensitive payment credentials.
-- This migration removes the dangerous broad read and narrows the public grant to
-- non-sensitive columns only. Credentials remain admin-only.

DROP POLICY IF EXISTS "payment methods public read active" ON public.payment_methods;
DROP POLICY IF EXISTS "payment methods super admin all" ON public.payment_methods;

REVOKE SELECT ON public.payment_methods FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payment_methods FROM authenticated;
GRANT SELECT (
  id,
  name,
  type,
  instructions,
  display_order,
  is_active,
  created_at,
  updated_at,
  qr_image_url,
  config
) ON public.payment_methods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;

CREATE POLICY "payment methods public read active"
  ON public.payment_methods
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "payment methods super admin all"
  ON public.payment_methods
  FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));

-- Extra defense: make sure credentials are not readable via public SELECTs.
-- The data type is jsonb, so column-level grants are the critical protection.
