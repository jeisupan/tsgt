-- Add DELETE policy for suppliers table (only admin and super_admin)
CREATE POLICY "Admins can delete their account suppliers"
ON public.suppliers
FOR DELETE
USING (
  (is_active = true) AND 
  ((account_id = (SELECT account_id FROM profiles WHERE id = auth.uid())) OR 
   (get_user_role(auth.uid()) = 'super_admin')) AND
  (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]))
);