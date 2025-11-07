-- Add DELETE policy for outbound_transactions
CREATE POLICY "Admin and super_admin can delete outbound transactions"
ON public.outbound_transactions
FOR DELETE
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role]));