-- Add supplier_id to operations_expense table
ALTER TABLE public.operations_expense 
ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id);

-- Create expense_particulars table for multiple line items
CREATE TABLE public.expense_particulars (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id uuid NOT NULL REFERENCES public.operations_expense(id) ON DELETE CASCADE,
  particular_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  category text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on expense_particulars
ALTER TABLE public.expense_particulars ENABLE ROW LEVEL SECURITY;

-- Create policies for expense_particulars (mirror operations_expense policies)
CREATE POLICY "Finance, admin and super_admin can view expense particulars"
ON public.expense_particulars
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Finance, admin and super_admin can create expense particulars"
ON public.expense_particulars
FOR INSERT
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Finance, admin and super_admin can update expense particulars"
ON public.expense_particulars
FOR UPDATE
USING (get_user_role(auth.uid()) = ANY (ARRAY['finance'::app_role, 'admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Admin and super_admin can delete expense particulars"
ON public.expense_particulars
FOR DELETE
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- Create index for better query performance
CREATE INDEX idx_expense_particulars_expense_id ON public.expense_particulars(expense_id);