-- Update RLS policies for operations_expense table to include inventory role

-- Drop existing policies
DROP POLICY IF EXISTS "Finance, admin and super_admin can view operations expense" ON operations_expense;
DROP POLICY IF EXISTS "Finance, admin and super_admin can create operations expense" ON operations_expense;
DROP POLICY IF EXISTS "Finance, admin and super_admin can update operations expense" ON operations_expense;

-- Create new policies that include inventory role
CREATE POLICY "Inventory, finance, admin and super_admin can view operations expense"
ON operations_expense
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Inventory, finance, admin and super_admin can create operations expense"
ON operations_expense
FOR INSERT
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Inventory, finance, admin and super_admin can update operations expense"
ON operations_expense
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

-- Update RLS policies for expense_particulars table to include inventory role

-- Drop existing policies
DROP POLICY IF EXISTS "Finance, admin and super_admin can view expense particulars" ON expense_particulars;
DROP POLICY IF EXISTS "Finance, admin and super_admin can create expense particulars" ON expense_particulars;
DROP POLICY IF EXISTS "Finance, admin and super_admin can update expense particulars" ON expense_particulars;

-- Create new policies that include inventory role
CREATE POLICY "Inventory, finance, admin and super_admin can view expense particulars"
ON expense_particulars
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Inventory, finance, admin and super_admin can create expense particulars"
ON expense_particulars
FOR INSERT
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Inventory, finance, admin and super_admin can update expense particulars"
ON expense_particulars
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = ANY (ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));