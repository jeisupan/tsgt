-- Enable UPDATE and DELETE on orders table
CREATE POLICY "Anyone can update orders"
ON public.orders
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete orders"
ON public.orders
FOR DELETE
USING (true);

-- Enable UPDATE and DELETE on order_items table
CREATE POLICY "Anyone can update order items"
ON public.order_items
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete order items"
ON public.order_items
FOR DELETE
USING (true);