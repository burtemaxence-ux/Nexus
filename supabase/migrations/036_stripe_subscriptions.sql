-- 036 — Stripe subscriptions table

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  establishment_id        UUID NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  user_id                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT UNIQUE,
  plan                    TEXT NOT NULL DEFAULT 'free',
  status                  TEXT NOT NULL DEFAULT 'trialing',
  current_period_end      TIMESTAMPTZ,
  cancel_at_period_end    BOOLEAN DEFAULT false,
  trial_end               TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Managers and supervisors can read/write their establishment's subscription
CREATE POLICY "subscriptions_manager"
  ON public.subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'supervisor')
        AND (p.establishment_id = subscriptions.establishment_id
          OR p.active_establishment_id = subscriptions.establishment_id)
    )
  );

CREATE INDEX IF NOT EXISTS idx_subscriptions_establishment    ON public.subscriptions (establishment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer  ON public.subscriptions (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub       ON public.subscriptions (stripe_subscription_id);
