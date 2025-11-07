-- Add account_id column to app_settings table
ALTER TABLE public.app_settings
ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Drop the old policy that allows anyone to view app settings
DROP POLICY IF EXISTS "Anyone can view app settings" ON public.app_settings;

-- Drop the old policy for admins to update
DROP POLICY IF EXISTS "Admin and super_admin can update app settings" ON public.app_settings;

-- Create new policy for viewing app settings scoped to account
CREATE POLICY "Users can view their account app settings"
ON public.app_settings
FOR SELECT
USING (
  account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Create new policy for admins to manage their account settings
CREATE POLICY "Admin and super_admin can manage their account app settings"
ON public.app_settings
FOR ALL
USING (
  (account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
   OR get_user_role(auth.uid()) = 'super_admin')
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
)
WITH CHECK (
  (account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
   OR get_user_role(auth.uid()) = 'super_admin')
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
);