-- Add tax-related columns to expense_particulars table
ALTER TABLE public.expense_particulars 
ADD COLUMN is_taxable boolean DEFAULT false,
ADD COLUMN amount_excluding_vat numeric,
ADD COLUMN vat_amount numeric;