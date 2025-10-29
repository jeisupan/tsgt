-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers
CREATE POLICY "Anyone can view customers" 
ON public.customers 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update customers" 
ON public.customers 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete customers" 
ON public.customers 
FOR DELETE 
USING (true);

-- Add customer_id to orders table
ALTER TABLE public.orders 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Create trigger for customer updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_updated_at();