-- Update profiles table RLS policy to allow super_admin to update any profile

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create new policy that allows users to update their own profile OR super_admin to update any profile
CREATE POLICY "Users can update own profile, super_admin can update any"
ON profiles
FOR UPDATE
TO authenticated
USING (
  (auth.uid() = id) OR 
  (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  ))
)
WITH CHECK (
  (auth.uid() = id) OR 
  (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  ))
);