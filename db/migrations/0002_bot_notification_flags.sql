-- Notification choices for the Telegram step.
-- is_active, risk, and exchange columns stay on their existing defaults.

ALTER TABLE bot_settings
  ADD COLUMN notify_trade_executions boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_risk_warnings boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_daily_pnl boolean NOT NULL DEFAULT true;
