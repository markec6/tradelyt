-- Exchange choice collected in the wizard, sealed until the browser commits the trial.

ALTER TABLE pending_signups
  ADD COLUMN exchange_name text,
  ADD COLUMN trading_mode text NOT NULL DEFAULT 'sandbox',
  ADD COLUMN api_key text,
  ADD COLUMN api_secret text,
  ADD COLUMN api_passphrase text;

ALTER TABLE pending_signups
  ADD CONSTRAINT pending_signups_exchange_name_check CHECK (
    exchange_name IS NULL
    OR exchange_name IN ('binance', 'bybit', 'okx', 'binance_testnet', 'bybit_testnet', 'paper')
  );

ALTER TABLE pending_signups
  ADD CONSTRAINT pending_signups_trading_mode_check CHECK (
    trading_mode IN ('sandbox', 'live')
  );
