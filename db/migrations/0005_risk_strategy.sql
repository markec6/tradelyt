-- Strategy choice and the three safety switches for onboarding step 4.
-- The existing percent columns stay unchanged so rows still at 0 remain valid.

ALTER TABLE bot_settings
  ADD COLUMN strategy text,
  ADD COLUMN stop_loss_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN trailing_take_profit boolean NOT NULL DEFAULT true,
  ADD COLUMN emergency_stop_volatility boolean NOT NULL DEFAULT true;

ALTER TABLE bot_settings
  ADD CONSTRAINT bot_settings_strategy_check CHECK (
    strategy IS NULL OR strategy IN ('dca', 'grid', 'momentum')
  );
