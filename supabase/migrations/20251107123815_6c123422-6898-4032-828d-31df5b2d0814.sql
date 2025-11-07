-- Update inventory RLS policy to allow Sales role to update inventory (for order completion)

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Inventory, admin and super_admin can update inventory" ON inventory;

-- Create new policy that includes Sales role for updating inventory
CREATE POLICY "Sales, inventory, admin and super_admin can update inventory"
ON inventory
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['sales'::app_role, 'inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role]));