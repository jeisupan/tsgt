-- Drop existing policy
DROP POLICY IF EXISTS "Users can update own profile, super_admin can update any" ON public.profiles;

-- Create new policy that allows admins to update profiles in their account
CREATE POLICY "Users can update own profile, admins can update their account users"
ON public.profiles
FOR UPDATE
USING (
  -- User can update their own profile
  (auth.uid() = id)
  OR
  -- Super admin can update any profile
  (EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'::app_role
  ))
  OR
  -- Admin can update profiles in their account
  (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
    AND
    account_id = (
      SELECT profiles.account_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
)
WITH CHECK (
  -- User can update their own profile
  (auth.uid() = id)
  OR
  -- Super admin can update any profile
  (EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'::app_role
  ))
  OR
  -- Admin can update profiles in their account
  (
    EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
    AND
    account_id = (
      SELECT profiles.account_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
);