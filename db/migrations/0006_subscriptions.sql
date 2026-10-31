-- Stripe billing: customer link, one subscription row per user, webhook idempotency.
-- Card-required 7-day trial. `trialing` is the Stripe trial status and stays distinct from the older `trial` value.

ALTER TABLE users
  ADD COLUMN stripe_customer_id text;

ALTER TABLE users
  ADD CONSTRAINT users_stripe_customer_id_key UNIQUE (stripe_customer_id);

ALTER TABLE users DROP CONSTRAINT users_subscription_status_check;

ALTER TABLE users
  ADD CONSTRAINT users_subscription_status_check CHECK (
    subscription_status IN (
      'inactive',
      'trial',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'expired'
    )
  );

CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  status text NOT NULL,
  price_id text NOT NULL,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_status_check CHECK (
    status IN (
      'incomplete',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused',
      'incomplete_expired'
    )
  )
);

CREATE INDEX subscriptions_stripe_customer_id_idx ON subscriptions (stripe_customer_id);

CREATE TABLE stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
