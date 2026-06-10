-- Programme de parrainage
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code text NOT NULL,
  status text CHECK (status IN ('pending', 'active', 'expired', 'churned')) DEFAULT 'pending',
  activated_at timestamptz,
  discount_pct integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Une seule entrée "seed" (referred_id IS NULL) par parrain
CREATE UNIQUE INDEX idx_referrals_seed ON public.referrals(referrer_id) WHERE referred_id IS NULL;
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_read_own_referrals" ON public.referrals
  FOR SELECT USING (referrer_id = auth.uid());
