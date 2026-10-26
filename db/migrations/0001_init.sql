-- Tradelyt initial schema (Neon / PostgreSQL 18).
-- Decisions locked 2026-10-24: UUID v4, timestamptz, citext email,
-- text + CHECK enums, AES-256-GCM ciphertext stored as text by the app.

BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone_number text,
  country char(2),
  date_of_birth date,
  telegram_id bigint UNIQUE,
  telegram_username text,
  created_at timestamptz NOT NULL DEFAULT now(),
  subscription_status text NOT NULL DEFAULT 'inactive',
  subscription_ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_country_iso CHECK (country IS NULL OR country ~ '^[A-Z]{2}$'),
  CONSTRAINT users_subscription_status_check CHECK (
    subscription_status IN ('inactive', 'trial', 'active', 'past_due', 'canceled')
  )
);

CREATE TABLE bot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT false,
  discipline_mode text NOT NULL DEFAULT 'soft',
  max_daily_trades integer NOT NULL DEFAULT 0,
  max_drawdown_percent numeric(5, 2) NOT NULL DEFAULT 0,
  risk_per_trade_percent numeric(5, 2) NOT NULL DEFAULT 0,
  exchange_name text,
  api_key text,
  api_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bot_settings_discipline_mode_check CHECK (
    discipline_mode IN ('soft', 'strict', 'locked')
  ),
  CONSTRAINT bot_settings_exchange_name_check CHECK (
    exchange_name IS NULL OR exchange_name IN ('binance', 'bybit')
  ),
  CONSTRAINT bot_settings_max_daily_trades_check CHECK (max_daily_trades >= 0),
  CONSTRAINT bot_settings_max_drawdown_percent_check CHECK (
    max_drawdown_percent >= 0 AND max_drawdown_percent <= 100
  ),
  CONSTRAINT bot_settings_risk_per_trade_percent_check CHECK (
    risk_per_trade_percent >= 0 AND risk_per_trade_percent <= 100
  )
);

CREATE TABLE trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_symbol text NOT NULL,
  position_type text NOT NULL,
  entry_price numeric(20, 8) NOT NULL,
  stop_loss numeric(20, 8),
  take_profit_1 numeric(20, 8),
  take_profit_2 numeric(20, 8),
  status text NOT NULL DEFAULT 'open',
  pnl_amount numeric(20, 8) NOT NULL DEFAULT 0,
  pnl_percentage numeric(5, 2) NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trades_position_type_check CHECK (position_type IN ('long', 'short')),
  CONSTRAINT trades_status_check CHECK (
    status IN ('open', 'closed', 'canceled', 'stopped')
  )
);

CREATE TABLE daily_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  date date NOT NULL,
  total_trades integer NOT NULL DEFAULT 0,
  discipline_score integer NOT NULL DEFAULT 0,
  daily_pnl_percentage numeric(5, 2) NOT NULL DEFAULT 0,
  rules_broken_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_analytics_user_date_key UNIQUE (user_id, date),
  CONSTRAINT daily_analytics_total_trades_check CHECK (total_trades >= 0),
  CONSTRAINT daily_analytics_discipline_score_check CHECK (
    discipline_score >= 0 AND discipline_score <= 100
  ),
  CONSTRAINT daily_analytics_rules_broken_count_check CHECK (rules_broken_count >= 0)
);

CREATE TABLE notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  trade_id uuid REFERENCES trades (id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  message_content text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_log_notification_type_check CHECK (
    notification_type IN (
      'trade_opened',
      'trade_closed',
      'sl_hit',
      'tp_hit',
      'rule_broken',
      'daily_summary',
      'system'
    )
  )
);

-- FK lookups are covered by the unique keys and the composites below,
-- except notifications_log.trade_id which needs its own index.
CREATE INDEX trades_user_opened_at_idx ON trades (user_id, opened_at DESC);
CREATE INDEX trades_user_status_idx ON trades (user_id, status);
CREATE INDEX notifications_log_user_sent_at_idx ON notifications_log (user_id, sent_at DESC);
CREATE INDEX notifications_log_trade_id_idx ON notifications_log (trade_id);

COMMIT;
