-- Grant SELECT permission on audit_logs to authenticated users
GRANT SELECT ON public.audit_logs TO authenticated;

-- Drop existing policy if it exists and recreate it properly
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.audit_logs;

-- Create policy using the is_super_admin function for better performance
CREATE POLICY "Super admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Ensure the audit_logs table is accessible via the API
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create an index to improve query performance for super admin checks
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON public.audit_logs(created_at DESC);

-- Verify RLS is enabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;