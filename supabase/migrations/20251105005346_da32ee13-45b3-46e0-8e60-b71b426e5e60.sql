-- Add tax-related columns to expense_particulars table
ALTER TABLE expense_particulars
ADD COLUMN IF NOT EXISTS is_taxable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS amount_excluding_vat NUMERIC,
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC;