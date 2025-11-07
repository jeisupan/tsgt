-- Create audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  performed_by UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  account_id UUID REFERENCES public.accounts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_account_id ON public.audit_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS Policies for audit_logs
-- Super admins can view all audit logs
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

-- Admins can view audit logs for their account
CREATE POLICY "Admins can view their account audit logs"
ON public.audit_logs
FOR SELECT
USING (
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
);

-- Create function to log profile updates
CREATE OR REPLACE FUNCTION public.log_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields TEXT[];
BEGIN
  -- Only log if there are actual changes
  IF (TG_OP = 'UPDATE' AND OLD IS DISTINCT FROM NEW) THEN
    -- Determine which fields changed
    changed_fields := ARRAY[]::TEXT[];
    
    IF OLD.first_name IS DISTINCT FROM NEW.first_name THEN
      changed_fields := array_append(changed_fields, 'first_name');
    END IF;
    
    IF OLD.last_name IS DISTINCT FROM NEW.last_name THEN
      changed_fields := array_append(changed_fields, 'last_name');
    END IF;
    
    IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
      changed_fields := array_append(changed_fields, 'full_name');
    END IF;
    
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      changed_fields := array_append(changed_fields, 'email');
    END IF;
    
    IF OLD.account_id IS DISTINCT FROM NEW.account_id THEN
      changed_fields := array_append(changed_fields, 'account_id');
    END IF;
    
    -- Only insert audit log if fields actually changed
    IF array_length(changed_fields, 1) > 0 THEN
      INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        performed_by,
        old_data,
        new_data,
        changed_fields,
        account_id
      ) VALUES (
        'profiles',
        NEW.id,
        TG_OP,
        auth.uid(),
        to_jsonb(OLD),
        to_jsonb(NEW),
        changed_fields,
        NEW.account_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS trigger_log_profile_update ON public.profiles;
CREATE TRIGGER trigger_log_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_update();

-- Create function to log user_roles changes
CREATE OR REPLACE FUNCTION public.log_user_roles_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_account_id UUID;
BEGIN
  -- Get the account_id for the user whose roles are being changed
  SELECT account_id INTO user_account_id
  FROM public.profiles
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Log the role change
  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    performed_by,
    old_data,
    new_data,
    changed_fields,
    account_id
  ) VALUES (
    'user_roles',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    ARRAY['role'],
    user_account_id
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for user_roles changes
DROP TRIGGER IF EXISTS trigger_log_user_roles_insert ON public.user_roles;
CREATE TRIGGER trigger_log_user_roles_insert
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_user_roles_change();

DROP TRIGGER IF EXISTS trigger_log_user_roles_update ON public.user_roles;
CREATE TRIGGER trigger_log_user_roles_update
  AFTER UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_user_roles_change();

DROP TRIGGER IF EXISTS trigger_log_user_roles_delete ON public.user_roles;
CREATE TRIGGER trigger_log_user_roles_delete
  AFTER DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_user_roles_change();