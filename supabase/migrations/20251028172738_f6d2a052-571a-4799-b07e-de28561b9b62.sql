-- Drop trigger first, then recreate function with proper search_path
DROP TRIGGER IF EXISTS update_inventory_timestamp ON public.inventory;
DROP FUNCTION IF EXISTS public.update_inventory_updated_at();

CREATE OR REPLACE FUNCTION public.update_inventory_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_inventory_timestamp
BEFORE UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_updated_at();