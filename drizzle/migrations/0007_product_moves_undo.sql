ALTER TABLE public.products ADD COLUMN IF NOT EXISTS absorbed_by uuid;
GRANT SELECT(absorbed_by), INSERT(absorbed_by), UPDATE(absorbed_by) ON public.products TO authenticated;
GRANT SELECT(absorbed_by) ON public.products TO anon;
CREATE TABLE public.product_move_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, label text NOT NULL, before_rows jsonb NOT NULL, after_rows jsonb NOT NULL, undone boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.product_move_history TO authenticated;
GRANT ALL ON public.product_move_history TO service_role;
ALTER TABLE public.product_move_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own product movement history" ON public.product_move_history FOR SELECT TO authenticated USING (user_id = auth.uid() AND private.is_super_admin(auth.uid()));
CREATE OR REPLACE FUNCTION public.apply_product_move(_changes jsonb, _label text, _insert jsonb DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c jsonb; r public.products; b jsonb := '[]'; a jsonb := '[]'; h uuid; new_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 IF jsonb_typeof(_changes) <> 'array' OR jsonb_array_length(_changes) < 1 OR jsonb_array_length(_changes) > 2000 THEN RAISE EXCEPTION 'Movimiento inválido'; END IF;
 IF (SELECT count(DISTINCT x->>'id') FROM jsonb_array_elements(_changes) x) <> jsonb_array_length(_changes) THEN RAISE EXCEPTION 'Identidad repetida'; END IF;
 PERFORM id FROM public.products WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(_changes) x) ORDER BY id FOR UPDATE;
 FOR c IN SELECT value FROM jsonb_array_elements(_changes) LOOP
  SELECT * INTO r FROM public.products WHERE id = (c->>'id')::uuid;
  IF NOT FOUND OR r.updated_at IS DISTINCT FROM (c->>'updated_at')::timestamptz THEN RAISE EXCEPTION 'El producto cambió; actualiza la lista antes de moverlo'; END IF;
  IF c ? 'variants' AND jsonb_typeof(c->'variants') <> 'array' THEN RAISE EXCEPTION 'Variantes inválidas'; END IF;
  IF c ? 'variants' AND EXISTS (SELECT 1 FROM jsonb_array_elements(c->'variants') v WHERE v ? 'variants' OR coalesce(v->>'id','') = '') THEN RAISE EXCEPTION 'No se permiten subvariantes ni identidades vacías'; END IF;
  IF c ? 'variants' AND (SELECT count(DISTINCT v->>'id') FROM jsonb_array_elements(c->'variants') v) <> jsonb_array_length(c->'variants') THEN RAISE EXCEPTION 'Identidad de variante repetida'; END IF;
  b := b || jsonb_build_array(to_jsonb(r));
  UPDATE public.products SET variants = CASE WHEN c ? 'variants' THEN c->'variants' ELSE variants END, sort_order = CASE WHEN c ? 'sort_order' THEN (c->>'sort_order')::int ELSE sort_order END, active = CASE WHEN c ? 'active' THEN (c->>'active')::boolean ELSE active END, absorbed_by = CASE WHEN c ? 'absorbed_by' THEN (c->>'absorbed_by')::uuid ELSE absorbed_by END WHERE id = r.id RETURNING * INTO r;
  a := a || jsonb_build_array(to_jsonb(r));
 END LOOP;
 IF _insert IS NOT NULL THEN
  new_id := gen_random_uuid();
  INSERT INTO public.products SELECT (jsonb_populate_record(NULL::public.products, jsonb_build_object('id', new_id, 'created_at', now(), 'updated_at', now(), 'sort_order', 0, 'absorbed_by', NULL) || (_insert - 'id' - 'created_at' - 'updated_at' - 'absorbed_by'))).* RETURNING * INTO r;
  a := a || jsonb_build_array(to_jsonb(r));
 END IF;
 INSERT INTO public.product_move_history(user_id,label,before_rows,after_rows) VALUES(auth.uid(),left(_label,120),b,a) RETURNING id INTO h;
 RETURN h;
END $$;
REVOKE ALL ON FUNCTION public.apply_product_move(jsonb,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_product_move(jsonb,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.undo_product_move(_history_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h public.product_move_history; c jsonb; old jsonb; r public.products;
BEGIN
 IF auth.uid() IS NULL OR NOT private.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
 SELECT * INTO h FROM public.product_move_history WHERE id = _history_id AND user_id = auth.uid() AND NOT undone FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Movimiento no disponible'; END IF;
 PERFORM id FROM public.products WHERE id IN (SELECT (x->>'id')::uuid FROM jsonb_array_elements(h.after_rows) x) ORDER BY id FOR UPDATE;
 FOR c IN SELECT value FROM jsonb_array_elements(h.after_rows) LOOP
  SELECT * INTO r FROM public.products WHERE id = (c->>'id')::uuid;
  IF NOT FOUND OR r.updated_at IS DISTINCT FROM (c->>'updated_at')::timestamptz THEN RAISE EXCEPTION 'Hay cambios posteriores; deshacer los sobrescribiría'; END IF;
 END LOOP;
 FOR c IN SELECT value FROM jsonb_array_elements(h.after_rows) LOOP
  SELECT value INTO old FROM jsonb_array_elements(h.before_rows) WHERE value->>'id' = c->>'id';
  IF old IS NULL THEN
   UPDATE public.products SET active=false, absorbed_by=(h.before_rows->0->>'id')::uuid WHERE id=(c->>'id')::uuid;
  ELSE
   UPDATE public.products SET variants=old->'variants', sort_order=(old->>'sort_order')::int, active=(old->>'active')::boolean, absorbed_by=(old->>'absorbed_by')::uuid WHERE id=(c->>'id')::uuid;
  END IF;
 END LOOP;
 UPDATE public.product_move_history SET undone=true WHERE id=h.id;
 -- Refresh earlier snapshots only for rows restored exactly to their preceding state.
 UPDATE public.product_move_history prev SET after_rows=(SELECT jsonb_agg(CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(h.before_rows) o WHERE o->>'id'=x->>'id' AND (o-'updated_at')=(x-'updated_at')) THEN jsonb_set(x,'{updated_at}',to_jsonb(p.updated_at)) ELSE x END) FROM jsonb_array_elements(prev.after_rows) x LEFT JOIN public.products p ON p.id=(x->>'id')::uuid) WHERE prev.user_id=auth.uid() AND NOT prev.undone AND prev.created_at<h.created_at;
END $$;
REVOKE ALL ON FUNCTION public.undo_product_move(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_product_move(uuid) TO authenticated;