-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- SUBSCRIPTIONS (cartão)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.subscriptions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- PIX PAYMENTS
CREATE TABLE public.pix_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_cents integer NOT NULL DEFAULT 900,
  status text NOT NULL DEFAULT 'pending',
  proof_url text,
  payer_note text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  reviewed_by uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pix_payments_user_id ON public.pix_payments(user_id);
CREATE INDEX idx_pix_payments_status ON public.pix_payments(status);

GRANT SELECT, INSERT ON public.pix_payments TO authenticated;
GRANT UPDATE ON public.pix_payments TO authenticated;
GRANT ALL ON public.pix_payments TO service_role;
ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pix payments" ON public.pix_payments
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own pix payments" ON public.pix_payments
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all pix payments" ON public.pix_payments
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can review pix payments" ON public.pix_payments
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TIMESTAMP TRIGGERS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pix_payments_updated_at BEFORE UPDATE ON public.pix_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PREMIUM SYNC
CREATE OR REPLACE FUNCTION public.sync_premium_status(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND (
        (status IN ('active', 'trialing', 'past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end > now())
      )
  ) OR EXISTS (
    SELECT 1 FROM public.pix_payments
    WHERE user_id = _user_id
      AND status = 'approved'
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO has_access;

  UPDATE public.profiles SET is_premium = has_access WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.sync_premium_status(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER subscriptions_premium_sync
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.on_payment_change();

CREATE TRIGGER pix_payments_premium_sync
AFTER INSERT OR UPDATE ON public.pix_payments
FOR EACH ROW EXECUTE FUNCTION public.on_payment_change();