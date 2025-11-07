
-- Create categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  account_id uuid REFERENCES public.accounts(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(name, account_id)
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Admin and super_admin can view categories from their account or all if super_admin
CREATE POLICY "Admin and super_admin can view their account categories"
ON public.categories
FOR SELECT
USING (
  (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()))
  OR 
  (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
);

-- Admin and super_admin can create categories
CREATE POLICY "Admin and super_admin can create categories"
ON public.categories
FOR INSERT
WITH CHECK (
  (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]))
  AND
  (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::app_role)
);

-- Admin and super_admin can update their account categories
CREATE POLICY "Admin and super_admin can update their account categories"
ON public.categories
FOR UPDATE
USING (
  (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::app_role)
  AND
  (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]))
);

-- Admin and super_admin can delete their account categories
CREATE POLICY "Admin and super_admin can delete their account categories"
ON public.categories
FOR DELETE
USING (
  (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::app_role)
  AND
  (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]))
);

-- Create trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_updated_at();
