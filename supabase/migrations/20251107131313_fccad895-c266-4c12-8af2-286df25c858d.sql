-- Allow Sales role to create inbound transactions for order adjustments
DROP POLICY IF EXISTS "Inventory, admin and super_admin can create inbound transaction" ON public.inbound_transactions;

CREATE POLICY "Sales, inventory, admin and super_admin can create inbound transactions"
ON public.inbound_transactions
FOR INSERT
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

-- Also allow Sales to view inbound transactions for transparency
DROP POLICY IF EXISTS "Inventory, admin and super_admin can view inbound transactions" ON public.inbound_transactions;

CREATE POLICY "Sales, inventory, admin and super_admin can view inbound transactions"
ON public.inbound_transactions
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role]));