-- Create pricing_tiers table
CREATE TABLE public.pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT '/month',
  description TEXT NOT NULL,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tier_features table
CREATE TABLE public.tier_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID REFERENCES public.pricing_tiers(id) ON DELETE CASCADE NOT NULL,
  feature_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create account_subscriptions table to track which tier each account has
CREATE TABLE public.account_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  tier_id UUID REFERENCES public.pricing_tiers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(account_id)
);

-- Enable RLS
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_tiers
CREATE POLICY "Anyone can view pricing tiers"
ON public.pricing_tiers
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage pricing tiers"
ON public.pricing_tiers
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for tier_features
CREATE POLICY "Anyone can view tier features"
ON public.tier_features
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage tier features"
ON public.tier_features
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for account_subscriptions
CREATE POLICY "Users can view their account subscription"
ON public.account_subscriptions
FOR SELECT
USING (
  account_id = (SELECT account_id FROM profiles WHERE id = auth.uid())
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Super admins can manage all subscriptions"
ON public.account_subscriptions
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create trigger for updated_at on pricing_tiers
CREATE TRIGGER update_pricing_tiers_updated_at
BEFORE UPDATE ON public.pricing_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_inventory_updated_at();

-- Insert default tiers from landing page
INSERT INTO public.pricing_tiers (name, price, period, description, is_popular, sort_order)
VALUES 
  ('Starter', '₱999', '/month', 'Perfect for small businesses getting started', false, 1),
  ('Professional', '₱2,499', '/month', 'Growing businesses with advanced needs', true, 2),
  ('Enterprise', '₱4,999', '/month', 'Full-featured for large operations', false, 3);

-- Insert default features for each tier
INSERT INTO public.tier_features (tier_id, feature_name, sort_order)
SELECT t.id, f.feature_name, f.sort_order
FROM public.pricing_tiers t
CROSS JOIN LATERAL (
  VALUES
    ('Up to 100 products', 1),
    ('Basic POS system', 2),
    ('Customer management', 3),
    ('Order history', 4),
    ('Basic reports', 5),
    ('Email support', 6)
) AS f(feature_name, sort_order)
WHERE t.name = 'Starter';

INSERT INTO public.tier_features (tier_id, feature_name, sort_order)
SELECT t.id, f.feature_name, f.sort_order
FROM public.pricing_tiers t
CROSS JOIN LATERAL (
  VALUES
    ('Unlimited products', 1),
    ('Advanced POS features', 2),
    ('Inventory tracking', 3),
    ('Supplier management', 4),
    ('Multi-user support', 5),
    ('Advanced analytics', 6),
    ('Priority support', 7)
) AS f(feature_name, sort_order)
WHERE t.name = 'Professional';

INSERT INTO public.tier_features (tier_id, feature_name, sort_order)
SELECT t.id, f.feature_name, f.sort_order
FROM public.pricing_tiers t
CROSS JOIN LATERAL (
  VALUES
    ('Everything in Professional', 1),
    ('AI-powered insights', 2),
    ('Custom reports', 3),
    ('Expense tracking', 4),
    ('Audit logs', 5),
    ('API access', 6),
    ('Dedicated support', 7)
) AS f(feature_name, sort_order)
WHERE t.name = 'Enterprise';