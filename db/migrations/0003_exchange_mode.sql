-- Exchange choice for the sandbox step.
-- Older binance and bybit values stay valid so existing rows still pass the check.

ALTER TABLE bot_settings DROP CONSTRAINT bot_settings_exchange_name_check;

ALTER TABLE bot_settings
  ADD CONSTRAINT bot_settings_exchange_name_check CHECK (
    exchange_name IS NULL
    OR exchange_name IN ('binance', 'bybit', 'binance_testnet', 'bybit_testnet', 'paper')
  );

ALTER TABLE bot_settings
  ADD COLUMN trading_mode text NOT NULL DEFAULT 'sandbox';

ALTER TABLE bot_settings
  ADD CONSTRAINT bot_settings_trading_mode_check CHECK (
    trading_mode IN ('sandbox', 'live')
  );
