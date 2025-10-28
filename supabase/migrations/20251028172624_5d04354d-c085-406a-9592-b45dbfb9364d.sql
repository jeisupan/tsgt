-- Create inventory table to track current stock levels
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inbound transactions table
CREATE TABLE public.inbound_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'purchase',
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create outbound transactions table
CREATE TABLE public.outbound_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  destination TEXT,
  order_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- Enable Row Level Security
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory
CREATE POLICY "Anyone can view inventory"
ON public.inventory
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create inventory"
ON public.inventory
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update inventory"
ON public.inventory
FOR UPDATE
USING (true);

-- Create policies for inbound transactions
CREATE POLICY "Anyone can view inbound transactions"
ON public.inbound_transactions
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create inbound transactions"
ON public.inbound_transactions
FOR INSERT
WITH CHECK (true);

-- Create policies for outbound transactions
CREATE POLICY "Anyone can view outbound transactions"
ON public.outbound_transactions
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create outbound transactions"
ON public.outbound_transactions
FOR INSERT
WITH CHECK (true);

-- Create function to update inventory timestamps
CREATE OR REPLACE FUNCTION public.update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_inventory_timestamp
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_updated_at();