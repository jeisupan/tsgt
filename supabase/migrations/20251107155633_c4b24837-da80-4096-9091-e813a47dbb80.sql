
-- Add account_id to inventory table
ALTER TABLE public.inventory 
ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Drop old inventory policies
DROP POLICY IF EXISTS "Sales, inventory, finance, admin and super_admin can view inven" ON public.inventory;
DROP POLICY IF EXISTS "Inventory, admin and super_admin can create inventory" ON public.inventory;
DROP POLICY IF EXISTS "Sales, inventory, admin and super_admin can update inventory" ON public.inventory;

-- Create new account-scoped policies for inventory

-- Users can view inventory from their account
CREATE POLICY "Users can view their account inventory"
ON public.inventory
FOR SELECT
USING (
  account_id = (SELECT account_id FROM profiles WHERE id = auth.uid())
  OR 
  (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'))
);

-- Inventory, admin and super_admin can create inventory for their account
CREATE POLICY "Inventory, admin and super_admin can create inventory"
ON public.inventory
FOR INSERT
WITH CHECK (
  (get_user_role(auth.uid()) = ANY (ARRAY['inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role]))
  AND
  (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::app_role)
);

-- Sales, inventory, admin and super_admin can update inventory for their account
CREATE POLICY "Sales, inventory, admin and super_admin can update inventory"
ON public.inventory
FOR UPDATE
USING (
  (account_id = (SELECT account_id FROM profiles WHERE id = auth.uid()) OR get_user_role(auth.uid()) = 'super_admin'::app_role)
  AND
  (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role]))
);
