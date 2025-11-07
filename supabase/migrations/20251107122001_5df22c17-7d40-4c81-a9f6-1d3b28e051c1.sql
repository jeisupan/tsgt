-- Update inventory RLS policy to allow Sales role to view inventory (for POS stock display)

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Inventory, finance, admin and super_admin can view inventory" ON inventory;

-- Create new policy that includes Sales role for viewing inventory
CREATE POLICY "Sales, inventory, finance, admin and super_admin can view inventory"
ON inventory
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));