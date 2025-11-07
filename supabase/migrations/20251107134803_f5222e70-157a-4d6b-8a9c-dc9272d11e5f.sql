-- Update RLS policy for inbound_transactions to include finance role
DROP POLICY IF EXISTS "Sales, inventory, admin and super_admin can view inbound transa" ON public.inbound_transactions;

CREATE POLICY "Sales, inventory, finance, admin and super_admin can view inbound transactions"
ON public.inbound_transactions
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

-- Update RLS policy for outbound_transactions to include finance role
DROP POLICY IF EXISTS "Sales, inventory, admin and super_admin can view outbound trans" ON public.outbound_transactions;

CREATE POLICY "Sales, inventory, finance, admin and super_admin can view outbound transactions"
ON public.outbound_transactions
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));