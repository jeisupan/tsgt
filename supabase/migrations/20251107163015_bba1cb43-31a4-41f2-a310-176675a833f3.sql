-- Add account_id to customers table
ALTER TABLE public.customers
ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Add account_id to suppliers table
ALTER TABLE public.suppliers
ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Add account_id to operations_expense table
ALTER TABLE public.operations_expense
ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Add account_id to expense_particulars table
ALTER TABLE public.expense_particulars
ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Add account_id to orders table
ALTER TABLE public.orders
ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Add account_id to order_items table
ALTER TABLE public.order_items
ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Add account_id to inbound_transactions table
ALTER TABLE public.inbound_transactions
ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Add account_id to outbound_transactions table
ALTER TABLE public.outbound_transactions
ADD COLUMN account_id uuid REFERENCES public.accounts(id);

-- Update RLS policies for customers
DROP POLICY IF EXISTS "Sales, admin and super_admin can view active customers" ON public.customers;
DROP POLICY IF EXISTS "Sales, admin and super_admin can create customers" ON public.customers;
DROP POLICY IF EXISTS "Sales, admin and super_admin can update customers" ON public.customers;

CREATE POLICY "Users can view their account customers"
ON public.customers
FOR SELECT
USING (
  is_active = true 
  AND (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can create customers in their account"
ON public.customers
FOR INSERT
WITH CHECK (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can update their account customers"
ON public.customers
FOR UPDATE
USING (
  is_active = true
  AND (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

-- Update RLS policies for suppliers
DROP POLICY IF EXISTS "Inventory, admin and super_admin can view active suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Inventory, admin and super_admin can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Inventory, admin and super_admin can update suppliers" ON public.suppliers;

CREATE POLICY "Users can view their account suppliers"
ON public.suppliers
FOR SELECT
USING (
  is_active = true
  AND (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can create suppliers in their account"
ON public.suppliers
FOR INSERT
WITH CHECK (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can update their account suppliers"
ON public.suppliers
FOR UPDATE
USING (
  is_active = true
  AND (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

-- Update RLS policies for operations_expense
DROP POLICY IF EXISTS "Inventory, finance, admin and super_admin can view operations e" ON public.operations_expense;
DROP POLICY IF EXISTS "Inventory, finance, admin and super_admin can create operations" ON public.operations_expense;
DROP POLICY IF EXISTS "Inventory, finance, admin and super_admin can update operations" ON public.operations_expense;
DROP POLICY IF EXISTS "Admin and super_admin can delete operations expense" ON public.operations_expense;

CREATE POLICY "Users can view their account expenses"
ON public.operations_expense
FOR SELECT
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can create expenses in their account"
ON public.operations_expense
FOR INSERT
WITH CHECK (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can update their account expenses"
ON public.operations_expense
FOR UPDATE
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Admins can delete their account expenses"
ON public.operations_expense
FOR DELETE
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
);

-- Update RLS policies for expense_particulars
DROP POLICY IF EXISTS "Inventory, finance, admin and super_admin can view expense part" ON public.expense_particulars;
DROP POLICY IF EXISTS "Inventory, finance, admin and super_admin can create expense pa" ON public.expense_particulars;
DROP POLICY IF EXISTS "Inventory, finance, admin and super_admin can update expense pa" ON public.expense_particulars;
DROP POLICY IF EXISTS "Admin and super_admin can delete expense particulars" ON public.expense_particulars;

CREATE POLICY "Users can view their account expense particulars"
ON public.expense_particulars
FOR SELECT
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can create expense particulars in their account"
ON public.expense_particulars
FOR INSERT
WITH CHECK (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can update their account expense particulars"
ON public.expense_particulars
FOR UPDATE
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Admins can delete their account expense particulars"
ON public.expense_particulars
FOR DELETE
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
);

-- Update RLS policies for orders
DROP POLICY IF EXISTS "Sales, finance, admin and super_admin can view orders" ON public.orders;
DROP POLICY IF EXISTS "Sales, admin and super_admin can create orders" ON public.orders;
DROP POLICY IF EXISTS "Sales, admin and super_admin can update orders" ON public.orders;
DROP POLICY IF EXISTS "Sales, admin and super_admin can delete orders" ON public.orders;

CREATE POLICY "Users can view their account orders"
ON public.orders
FOR SELECT
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can create orders in their account"
ON public.orders
FOR INSERT
WITH CHECK (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can update their account orders"
ON public.orders
FOR UPDATE
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can delete their account orders"
ON public.orders
FOR DELETE
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

-- Update RLS policies for order_items
DROP POLICY IF EXISTS "Sales, finance, admin and super_admin can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Sales, admin and super_admin can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Sales, admin and super_admin can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Sales, admin and super_admin can delete order items" ON public.order_items;

CREATE POLICY "Users can view their account order items"
ON public.order_items
FOR SELECT
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can create order items in their account"
ON public.order_items
FOR INSERT
WITH CHECK (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can update their account order items"
ON public.order_items
FOR UPDATE
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can delete their account order items"
ON public.order_items
FOR DELETE
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

-- Update RLS policies for inbound_transactions
DROP POLICY IF EXISTS "Sales, inventory, finance, admin and super_admin can view inbou" ON public.inbound_transactions;
DROP POLICY IF EXISTS "Sales, inventory, admin and super_admin can create inbound tran" ON public.inbound_transactions;

CREATE POLICY "Users can view their account inbound transactions"
ON public.inbound_transactions
FOR SELECT
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can create inbound transactions in their account"
ON public.inbound_transactions
FOR INSERT
WITH CHECK (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

-- Update RLS policies for outbound_transactions
DROP POLICY IF EXISTS "Sales, inventory, finance, admin and super_admin can view outbo" ON public.outbound_transactions;
DROP POLICY IF EXISTS "Sales, inventory, admin and super_admin can create outbound tra" ON public.outbound_transactions;
DROP POLICY IF EXISTS "Sales, inventory, admin and super_admin can delete outbound tra" ON public.outbound_transactions;

CREATE POLICY "Users can view their account outbound transactions"
ON public.outbound_transactions
FOR SELECT
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'inventory'::app_role, 'finance'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can create outbound transactions in their account"
ON public.outbound_transactions
FOR INSERT
WITH CHECK (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Users can delete their account outbound transactions"
ON public.outbound_transactions
FOR DELETE
USING (
  (
    account_id = (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    OR get_user_role(auth.uid()) = 'super_admin'
  )
  AND get_user_role(auth.uid()) = ANY(ARRAY['sales'::app_role, 'inventory'::app_role, 'admin'::app_role, 'super_admin'::app_role])
);