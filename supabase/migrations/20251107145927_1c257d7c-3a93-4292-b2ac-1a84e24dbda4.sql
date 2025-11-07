-- Add account_id to profiles table
alter table public.profiles add column if not exists account_id uuid references public.accounts(id) on delete cascade;

-- Update user_roles to include account_id
alter table public.user_roles add column if not exists account_id uuid references public.accounts(id) on delete cascade;

-- RLS policy for accounts
create policy "Users can view their own account"
on public.accounts
for select
using (
  exists (
    select 1 from public.profiles 
    where profiles.id = auth.uid() 
    and profiles.account_id = accounts.id
  )
  or exists (
    select 1 from public.user_roles
    where user_roles.user_id = auth.uid()
    and user_roles.role = 'super_admin'
  )
);