-- Update get_user_role function to return highest priority role when user has multiple roles
-- Priority order: super_admin > admin > finance > inventory > sales

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'finance' THEN 3
      WHEN 'inventory' THEN 4
      WHEN 'sales' THEN 5
      ELSE 99
    END
  LIMIT 1
$$;