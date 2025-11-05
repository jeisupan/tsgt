-- Add supplier_id column to expense_particulars table
ALTER TABLE public.expense_particulars 
ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id);

-- Add index for better query performance
CREATE INDEX idx_expense_particulars_supplier_id ON public.expense_particulars(supplier_id);