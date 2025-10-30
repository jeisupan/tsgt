-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tin_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Create policies for suppliers
CREATE POLICY "Anyone can view suppliers" 
ON public.suppliers 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create suppliers" 
ON public.suppliers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update suppliers" 
ON public.suppliers 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete suppliers" 
ON public.suppliers 
FOR DELETE 
USING (true);

-- Create trigger for suppliers updated_at
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_updated_at();

-- Create operations_expense table
CREATE TABLE public.operations_expense (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_number TEXT NOT NULL,
  voucher_type TEXT NOT NULL,
  date DATE NOT NULL,
  branch TEXT NOT NULL,
  encoder TEXT NOT NULL,
  particulars TEXT NOT NULL,
  category TEXT NOT NULL,
  plate_number TEXT,
  amount NUMERIC NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.operations_expense ENABLE ROW LEVEL SECURITY;

-- Create policies for operations_expense
CREATE POLICY "Anyone can view operations expense" 
ON public.operations_expense 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create operations expense" 
ON public.operations_expense 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update operations expense" 
ON public.operations_expense 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete operations expense" 
ON public.operations_expense 
FOR DELETE 
USING (true);

-- Create trigger for operations_expense updated_at
CREATE TRIGGER update_operations_expense_updated_at
BEFORE UPDATE ON public.operations_expense
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_updated_at();