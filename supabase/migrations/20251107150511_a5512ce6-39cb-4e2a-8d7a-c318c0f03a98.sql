-- Add first_name, last_name columns to customers table
alter table public.customers add column if not exists first_name text;
alter table public.customers add column if not exists last_name text;
alter table public.customers add column if not exists full_name text;

-- Update existing records to populate full_name from name
update public.customers 
set full_name = name 
where full_name is null and name is not null;