-- Remove the unique constraint on user_id that prevents multiple roles per user
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;

-- Ensure we keep the unique constraint on (user_id, role) combination
-- to prevent duplicate role assignments
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);