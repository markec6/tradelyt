-- Wizard state lives here until the browser commits a paid trial.
-- Expired rows are deleted by the cron, which releases the unique email, phone, and Telegram reservation.

BEGIN;

CREATE TABLE pending_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone_number text UNIQUE,
  country char(2),
  date_of_birth date,
  telegram_id bigint UNIQUE,
  telegram_username text,
  telegram_first_name text,
  telegram_avatar_url text,
  telegram_photo_file_id text,
  welcome_sent_at timestamptz,
  telegram_prompted boolean NOT NULL DEFAULT false,
  notify_trade_executions boolean NOT NULL DEFAULT true,
  notify_risk_warnings boolean NOT NULL DEFAULT true,
  notify_daily_pnl boolean NOT NULL DEFAULT true,
  strategy text,
  max_drawdown_percent numeric(5, 2) NOT NULL DEFAULT 0,
  risk_per_trade_percent numeric(5, 2) NOT NULL DEFAULT 0,
  stop_loss_enabled boolean NOT NULL DEFAULT true,
  trailing_take_profit boolean NOT NULL DEFAULT true,
  emergency_stop_volatility boolean NOT NULL DEFAULT true,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_status text,
  stripe_price_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  stripe_linked_at timestamptz,
  card_saved boolean NOT NULL DEFAULT false,
  card_saved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT pending_signups_country_iso CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
  CONSTRAINT pending_signups_strategy_check CHECK (
    strategy IS NULL OR strategy IN ('dca', 'grid', 'momentum')
  ),
  CONSTRAINT pending_signups_max_drawdown_percent_check CHECK (
    max_drawdown_percent >= 0 AND max_drawdown_percent <= 100
  ),
  CONSTRAINT pending_signups_risk_per_trade_percent_check CHECK (
    risk_per_trade_percent >= 0 AND risk_per_trade_percent <= 100
  ),
  CONSTRAINT pending_signups_stripe_status_check CHECK (
    stripe_status IS NULL OR stripe_status IN (
      'incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused', 'incomplete_expired'
    )
  )
);

CREATE INDEX pending_signups_expires_at_idx ON pending_signups (expires_at);
CREATE INDEX pending_signups_card_saved_at_idx ON pending_signups (card_saved_at);

ALTER TABLE link_tokens ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE link_tokens
  ADD COLUMN pending_signup_id uuid REFERENCES pending_signups (id) ON DELETE CASCADE;

ALTER TABLE link_tokens
  ADD CONSTRAINT link_tokens_owner_check CHECK (
    (user_id IS NOT NULL AND pending_signup_id IS NULL)
    OR (user_id IS NULL AND pending_signup_id IS NOT NULL)
  );

CREATE INDEX link_tokens_pending_signup_id_idx ON link_tokens (pending_signup_id);

COMMIT;
