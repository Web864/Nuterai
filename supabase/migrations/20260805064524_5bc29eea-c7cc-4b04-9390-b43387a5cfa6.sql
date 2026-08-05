
CREATE TYPE public.billing_plan AS ENUM ('free', 'pro');
CREATE TYPE public.subscription_status AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'incomplete');

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mock',
  provider_customer_id text,
  provider_subscription_id text,
  plan public.billing_plan NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.billing_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mock',
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_events_user_idx ON public.billing_events (user_id, created_at DESC);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
GRANT SELECT ON public.billing_events TO authenticated;
GRANT ALL ON public.billing_events TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own subscription readable" ON public.subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own billing events readable" ON public.billing_events
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value)
VALUES ('billing', '{"provider":"mock","paid_plans_enabled":false,"pro_price_usd":9.99}'::jsonb)
ON CONFLICT (key) DO NOTHING;
