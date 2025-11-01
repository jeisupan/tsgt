-- Enable realtime for inventory table
ALTER TABLE public.inventory REPLICA IDENTITY FULL;

-- Add inventory table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;