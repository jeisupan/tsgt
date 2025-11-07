-- Update RLS policies to allow Sales role to delete orders

-- Update orders DELETE policy
DROP POLICY IF EXISTS "Admin and super_admin can delete orders" ON orders;
CREATE POLICY "Sales, admin and super_admin can delete orders"
ON orders
FOR DELETE
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

-- Update order_items DELETE policy
DROP POLICY IF EXISTS "Admin and super_admin can delete order items" ON order_items;
CREATE POLICY "Sales, admin and super_admin can delete order items"
ON order_items
FOR DELETE
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

-- Update outbound_transactions DELETE policy
DROP POLICY IF EXISTS "Admin and super_admin can delete outbound transactions" ON outbound_transactions;
CREATE POLICY "Sales, admin and super_admin can delete outbound transactions"
ON outbound_transactions
FOR DELETE
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role]));