
-- Add account_id to products table
ALTER TABLE public.products 
ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Update existing products to have null account_id (they'll need to be reassigned or deleted)
-- In a production system, you'd migrate existing data appropriately

-- Drop the old "Anyone can view products" policy
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;

-- Create new RLS policies for account-scoped products

-- Users can view products from their account
CREATE POLICY "Users can view their account products"
ON public.products
FOR SELECT
USING (
  account_id = (SELECT account_id FROM profiles WHERE id = auth.uid())
  OR 
  (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
);

-- Update the insert policy to include account_id
DROP POLICY IF EXISTS "Admin and super_admin can create products" ON public.products;

CREATE POLICY "Admin and super_admin can create products"
ON public.products
FOR INSERT
WITH CHECK (
  (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]))
  AND
  (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::app_role)
);

-- Update the update policy
DROP POLICY IF EXISTS "Admin and super_admin can update products" ON public.products;

CREATE POLICY "Admin and super_admin can update products"
ON public.products
FOR UPDATE
USING (
  (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::app_role)
  AND
  (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]))
);

-- Update the delete policy
DROP POLICY IF EXISTS "Admin and super_admin can delete products" ON public.products;

CREATE POLICY "Admin and super_admin can delete products"
ON public.products
FOR DELETE
USING (
  (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::app_role)
  AND
  (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]))
);
