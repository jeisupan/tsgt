-- Create products table
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric NOT NULL,
  category text NOT NULL,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Everyone can view products
CREATE POLICY "Anyone can view products"
ON public.products
FOR SELECT
USING (true);

-- Admin and super_admin can manage products
CREATE POLICY "Admin and super_admin can create products"
ON public.products
FOR INSERT
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Admin and super_admin can update products"
ON public.products
FOR UPDATE
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]));

CREATE POLICY "Admin and super_admin can delete products"
ON public.products
FOR DELETE
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]));

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_updated_at();

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Admin and super_admin can upload product images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Admin and super_admin can update product images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Admin and super_admin can delete product images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-images' AND
  get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
);

-- Insert existing products into the table
INSERT INTO public.products (product_id, name, price, category, image_url) VALUES
('gas-cylinder-large', '11kg Gas Cylinder', 800, 'Cylinders', '/src/assets/gas-cylinder-large.jpg'),
('gas-cylinder-medium', '7kg Gas Cylinder', 650, 'Cylinders', '/src/assets/gas-cylinder-medium.jpg'),
('gas-cylinder-small', '2.7kg Gas Cylinder', 450, 'Cylinders', '/src/assets/gas-cylinder-small.jpg'),
('gas-regulator', 'Gas Regulator', 250, 'Accessories', '/src/assets/gas-regulator.jpg'),
('gas-hose', 'Gas Hose (2m)', 150, 'Accessories', '/src/assets/gas-hose.jpg'),
('refill-service', 'Refill Service', 350, 'Services', null),
('delivery-service', 'Home Delivery', 100, 'Services', null);