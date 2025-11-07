-- Create accounts table for multi-tenancy
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  account_name text not null unique,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.accounts enable row level security;