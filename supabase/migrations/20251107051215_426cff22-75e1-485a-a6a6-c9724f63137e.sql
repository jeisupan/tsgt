-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for logos bucket
CREATE POLICY "Admin and super_admin can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  (SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
);

CREATE POLICY "Anyone can view logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'logos');

CREATE POLICY "Admin and super_admin can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos' AND
  (SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
);

-- Create table to store current logo URL
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for app_settings
CREATE POLICY "Anyone can view app settings"
ON public.app_settings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admin and super_admin can update app settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (
  (SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
)
WITH CHECK (
  (SELECT get_user_role(auth.uid())) = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
);

-- Insert default row
INSERT INTO public.app_settings (id, logo_url)
VALUES (gen_random_uuid(), NULL)
ON CONFLICT DO NOTHING;