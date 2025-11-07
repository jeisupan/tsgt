-- Allow inventory role to create outbound transactions
DROP POLICY IF EXISTS "Sales, admin and super_admin can create outbound transactions" ON public.outbound_transactions;

CREATE POLICY "Sales, inventory, admin and super_admin can create outbound transactions"
ON public.outbound_transactions
FOR INSERT
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

-- Also allow inventory role to view outbound transactions
DROP POLICY IF EXISTS "Sales, admin and super_admin can view outbound transactions" ON public.outbound_transactions;

CREATE POLICY "Sales, inventory, admin and super_admin can view outbound transactions"
ON public.outbound_transactions
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

-- Also allow inventory role to delete outbound transactions if needed
DROP POLICY IF EXISTS "Sales, admin and super_admin can delete outbound transactions" ON public.outbound_transactions;

CREATE POLICY "Sales, inventory, admin and super_admin can delete outbound transactions"
ON public.outbound_transactions
FOR DELETE
USING (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role]));