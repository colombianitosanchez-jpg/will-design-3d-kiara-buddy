-- 1) Extend user_roles
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;
ALTER TABLE public.user_roles ALTER COLUMN role SET DEFAULT 'pending';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

UPDATE public.user_roles SET is_active = true WHERE role IN ('admin','staff');
UPDATE public.user_roles SET role = 'super_admin' WHERE role = 'admin';
UPDATE public.user_roles SET role = 'empleado' WHERE role = 'staff';

-- keep a single role per user
DELETE FROM public.user_roles a USING public.user_roles b
  WHERE a.user_id = b.user_id AND a.ctid > b.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_unique ON public.user_roles(user_id);

-- 2) has_role keeps working for all existing policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.is_active
      AND (
        (_role = 'admin'::app_role AND ur.role = 'super_admin')
        OR (_role = 'staff'::app_role AND ur.role IN ('empleado','super_admin'))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.is_active AND ur.role = 'super_admin'
  );
$$;

-- 3) Policies
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "users can read own roles" ON public.user_roles;

CREATE POLICY "own role read" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "self register pending" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'pending' AND is_active = false);

CREATE POLICY "super admins read all" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "super admins write all" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()) AND role IN ('pending','empleado','super_admin'));

CREATE POLICY "super admins insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "super admins delete" ON public.user_roles
  FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()) AND user_id <> auth.uid());
