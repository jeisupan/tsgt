-- Drop the existing admin policy for viewing audit logs
DROP POLICY IF EXISTS "Admins can view their account audit logs" ON public.audit_logs;

-- Keep only the super admin policy
-- Super admins can view all audit logs
-- (This policy already exists, but let's ensure it's the only one)

-- Verify the super admin policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'audit_logs' 
    AND policyname = 'Super admins can view all audit logs'
  ) THEN
    CREATE POLICY "Super admins can view all audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'super_admin'::app_role
      )
    );
  END IF;
END $$;