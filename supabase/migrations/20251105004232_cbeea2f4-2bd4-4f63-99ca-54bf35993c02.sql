-- Add plate_number and remarks columns to expense_particulars table
ALTER TABLE public.expense_particulars 
ADD COLUMN plate_number text,
ADD COLUMN remarks text;