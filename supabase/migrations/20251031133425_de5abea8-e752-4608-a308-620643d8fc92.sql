-- Create role enum for user permissions
CREATE TYPE public.app_role AS ENUM ('staff', 'manager', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Policy for user_roles table (users can view their own roles, admins can view all)
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles" ON public.user_roles
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Drop all existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;

DROP POLICY IF EXISTS "Anyone can create inventory" ON public.inventory;
DROP POLICY IF EXISTS "Anyone can update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Anyone can view inventory" ON public.inventory;

DROP POLICY IF EXISTS "Anyone can create inbound transactions" ON public.inbound_transactions;
DROP POLICY IF EXISTS "Anyone can view inbound transactions" ON public.inbound_transactions;

DROP POLICY IF EXISTS "Anyone can create operations expense" ON public.operations_expense;
DROP POLICY IF EXISTS "Anyone can delete operations expense" ON public.operations_expense;
DROP POLICY IF EXISTS "Anyone can update operations expense" ON public.operations_expense;
DROP POLICY IF EXISTS "Anyone can view operations expense" ON public.operations_expense;

DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;

DROP POLICY IF EXISTS "Anyone can create outbound transactions" ON public.outbound_transactions;
DROP POLICY IF EXISTS "Anyone can view outbound transactions" ON public.outbound_transactions;

DROP POLICY IF EXISTS "Anyone can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Anyone can delete suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Anyone can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Anyone can view suppliers" ON public.suppliers;

-- Create new authentication-required policies

-- Customers table
CREATE POLICY "Authenticated users can view customers" ON public.customers
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create customers" ON public.customers
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customers" ON public.customers
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete customers" ON public.customers
FOR DELETE USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- Inventory table
CREATE POLICY "Authenticated users can view inventory" ON public.inventory
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create inventory" ON public.inventory
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update inventory" ON public.inventory
FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Inbound transactions table
CREATE POLICY "Authenticated users can view inbound transactions" ON public.inbound_transactions
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create inbound transactions" ON public.inbound_transactions
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Operations expense table
CREATE POLICY "Authenticated users can view operations expense" ON public.operations_expense
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create operations expense" ON public.operations_expense
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update operations expense" ON public.operations_expense
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete operations expense" ON public.operations_expense
FOR DELETE USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- Order items table
CREATE POLICY "Authenticated users can view order items" ON public.order_items
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create order items" ON public.order_items
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update order items" ON public.order_items
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete order items" ON public.order_items
FOR DELETE USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- Orders table
CREATE POLICY "Authenticated users can view orders" ON public.orders
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create orders" ON public.orders
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update orders" ON public.orders
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete orders" ON public.orders
FOR DELETE USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- Outbound transactions table
CREATE POLICY "Authenticated users can view outbound transactions" ON public.outbound_transactions
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create outbound transactions" ON public.outbound_transactions
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Suppliers table
CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create suppliers" ON public.suppliers
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update suppliers" ON public.suppliers
FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete suppliers" ON public.suppliers
FOR DELETE USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));