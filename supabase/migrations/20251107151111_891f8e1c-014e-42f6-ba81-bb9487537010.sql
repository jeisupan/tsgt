-- Update handle_new_user function to support account creation and role assignment
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
  v_account_name text;
  v_is_business_signup boolean;
begin
  -- Get signup metadata
  v_account_name := NEW.raw_user_meta_data->>'account_name';
  v_is_business_signup := (NEW.raw_user_meta_data->>'is_business_signup')::boolean;
  v_account_id := (NEW.raw_user_meta_data->>'account_id')::uuid;

  -- If business signup, create new account
  if v_is_business_signup and v_account_name is not null then
    insert into public.accounts (account_name)
    values (v_account_name)
    returning id into v_account_id;
  end if;

  -- Insert profile with account_id
  insert into public.profiles (id, email, full_name, first_name, last_name, account_id)
  values (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'full_name', ''),
    coalesce(NEW.raw_user_meta_data->>'first_name', ''),
    coalesce(NEW.raw_user_meta_data->>'last_name', ''),
    v_account_id
  );

  -- If business signup, make them admin of their account
  if v_is_business_signup and v_account_id is not null then
    insert into public.user_roles (user_id, role, account_id)
    values (NEW.id, 'admin', v_account_id);
  end if;

  return NEW;
end;
$$;