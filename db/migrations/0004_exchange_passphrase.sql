-- Live exchange names and an optional encrypted passphrase.
-- Older exchange values stay valid so existing rows still pass the check.

ALTER TABLE bot_settings DROP CONSTRAINT bot_settings_exchange_name_check;

ALTER TABLE bot_settings
  ADD CONSTRAINT bot_settings_exchange_name_check CHECK (
    exchange_name IS NULL
    OR exchange_name IN (
      'binance',
      'bybit',
      'okx',
      'binance_testnet',
      'bybit_testnet',
      'paper'
    )
  );

ALTER TABLE bot_settings
  ADD COLUMN api_passphrase text;
