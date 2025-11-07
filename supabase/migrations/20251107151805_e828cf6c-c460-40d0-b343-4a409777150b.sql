-- Update accounts RLS policy to allow super admins to view all accounts
drop policy if exists "Users can view their own account" on public.accounts;

create policy "Users can view their own account or super admin can view all"
on public.accounts
for select
using (
  id = (select account_id from public.profiles where id = auth.uid())
  or exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'super_admin'
  )
);