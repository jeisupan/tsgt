-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Only super admins can manage roles" ON public.user_roles;

-- Create new policy allowing super_admins full access
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create new policy allowing admins to manage roles in their account
CREATE POLICY "Admins can manage roles in their account"
ON public.user_roles
FOR ALL
USING (
  get_user_role(auth.uid()) = 'admin'
  AND account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  get_user_role(auth.uid()) = 'admin'
  AND account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
);