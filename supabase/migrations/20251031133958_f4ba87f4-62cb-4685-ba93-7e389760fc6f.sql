-- Update role enum to include all required roles
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'sales', 'inventory', 'finance');

-- Recreate user_roles table with new enum
DROP TABLE IF EXISTS public.user_roles CASCADE;
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update has_role function to work with single role per user
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

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
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
      AND role = 'super_admin'
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles table
CREATE POLICY "Users can view all profiles" ON public.profiles
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own role" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "Only super admins can manage roles" ON public.user_roles
FOR ALL USING (public.is_super_admin(auth.uid()));

-- Add is_active flag to customers table for Change Data Capture
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS replaced_by UUID REFERENCES public.customers(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS previous_version UUID REFERENCES public.customers(id);

-- Add is_active flag to suppliers table
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS replaced_by UUID REFERENCES public.suppliers(id);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS previous_version UUID REFERENCES public.suppliers(id);

-- Drop existing policies and recreate with role-based access

-- Customers policies
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Managers can delete customers" ON public.customers;

CREATE POLICY "Sales, admin and super_admin can view active customers" ON public.customers
FOR SELECT USING (
  is_active = true AND (
    public.get_user_role(auth.uid()) IN ('sales', 'admin', 'super_admin')
  )
);

CREATE POLICY "Sales, admin and super_admin can create customers" ON public.customers
FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()) IN ('sales', 'admin', 'super_admin')
);

CREATE POLICY "Sales, admin and super_admin can update customers" ON public.customers
FOR UPDATE USING (
  is_active = true AND
  public.get_user_role(auth.uid()) IN ('sales', 'admin', 'super_admin')
);

-- Suppliers policies
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Managers can delete suppliers" ON public.suppliers;

CREATE POLICY "Inventory, admin and super_admin can view active suppliers" ON public.suppliers
FOR SELECT USING (
  is_active = true AND (
    public.get_user_role(auth.uid()) IN ('inventory', 'admin', 'super_admin')
  )
);

CREATE POLICY "Inventory, admin and super_admin can create suppliers" ON public.suppliers
FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()) IN ('inventory', 'admin', 'super_admin')
);

CREATE POLICY "Inventory, admin and super_admin can update suppliers" ON public.suppliers
FOR UPDATE USING (
  is_active = true AND
  public.get_user_role(auth.uid()) IN ('inventory', 'admin', 'super_admin')
);

-- Inventory policies
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can create inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can update inventory" ON public.inventory;

CREATE POLICY "Inventory, finance, admin and super_admin can view inventory" ON public.inventory
FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('inventory', 'finance', 'admin', 'super_admin')
);

CREATE POLICY "Inventory, admin and super_admin can create inventory" ON public.inventory
FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()) IN ('inventory', 'admin', 'super_admin')
);

CREATE POLICY "Inventory, admin and super_admin can update inventory" ON public.inventory
FOR UPDATE USING (
  public.get_user_role(auth.uid()) IN ('inventory', 'admin', 'super_admin')
);

-- Inbound transactions policies
DROP POLICY IF EXISTS "Authenticated users can view inbound transactions" ON public.inbound_transactions;
DROP POLICY IF EXISTS "Authenticated users can create inbound transactions" ON public.inbound_transactions;

CREATE POLICY "Inventory, admin and super_admin can view inbound transactions" ON public.inbound_transactions
FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('inventory', 'admin', 'super_admin')
);

CREATE POLICY "Inventory, admin and super_admin can create inbound transactions" ON public.inbound_transactions
FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()) IN ('inventory', 'admin', 'super_admin')
);

-- Operations expense policies
DROP POLICY IF EXISTS "Authenticated users can view operations expense" ON public.operations_expense;
DROP POLICY IF EXISTS "Authenticated users can create operations expense" ON public.operations_expense;
DROP POLICY IF EXISTS "Authenticated users can update operations expense" ON public.operations_expense;
DROP POLICY IF EXISTS "Managers can delete operations expense" ON public.operations_expense;

CREATE POLICY "Finance, admin and super_admin can view operations expense" ON public.operations_expense
FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('finance', 'admin', 'super_admin')
);

CREATE POLICY "Finance, admin and super_admin can create operations expense" ON public.operations_expense
FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()) IN ('finance', 'admin', 'super_admin')
);

CREATE POLICY "Finance, admin and super_admin can update operations expense" ON public.operations_expense
FOR UPDATE USING (
  public.get_user_role(auth.uid()) IN ('finance', 'admin', 'super_admin')
);

CREATE POLICY "Admin and super_admin can delete operations expense" ON public.operations_expense
FOR DELETE USING (
  public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- Order items policies
DROP POLICY IF EXISTS "Authenticated users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Managers can delete order items" ON public.order_items;

CREATE POLICY "Sales, finance, admin and super_admin can view order items" ON public.order_items
FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('sales', 'finance', 'admin', 'super_admin')
);

CREATE POLICY "Sales, admin and super_admin can create order items" ON public.order_items
FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()) IN ('sales', 'admin', 'super_admin')
);

CREATE POLICY "Sales, admin and super_admin can update order items" ON public.order_items
FOR UPDATE USING (
  public.get_user_role(auth.uid()) IN ('sales', 'admin', 'super_admin')
);

CREATE POLICY "Admin and super_admin can delete order items" ON public.order_items
FOR DELETE USING (
  public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- Orders policies
DROP POLICY IF EXISTS "Authenticated users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Managers can delete orders" ON public.orders;

CREATE POLICY "Sales, finance, admin and super_admin can view orders" ON public.orders
FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('sales', 'finance', 'admin', 'super_admin')
);

CREATE POLICY "Sales, admin and super_admin can create orders" ON public.orders
FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()) IN ('sales', 'admin', 'super_admin')
);

CREATE POLICY "Sales, admin and super_admin can update orders" ON public.orders
FOR UPDATE USING (
  public.get_user_role(auth.uid()) IN ('sales', 'admin', 'super_admin')
);

CREATE POLICY "Admin and super_admin can delete orders" ON public.orders
FOR DELETE USING (
  public.get_user_role(auth.uid()) IN ('admin', 'super_admin')
);

-- Outbound transactions policies
DROP POLICY IF EXISTS "Authenticated users can view outbound transactions" ON public.outbound_transactions;
DROP POLICY IF EXISTS "Authenticated users can create outbound transactions" ON public.outbound_transactions;

CREATE POLICY "Sales, admin and super_admin can view outbound transactions" ON public.outbound_transactions
FOR SELECT USING (
  public.get_user_role(auth.uid()) IN ('sales', 'admin', 'super_admin')
);

CREATE POLICY "Sales, admin and super_admin can create outbound transactions" ON public.outbound_transactions
FOR INSERT WITH CHECK (
  public.get_user_role(auth.uid()) IN ('sales', 'admin', 'super_admin')
);