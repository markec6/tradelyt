-- Remember when a linked Telegram user blocks the bot.

BEGIN;

ALTER TABLE users
  ADD COLUMN telegram_blocked_at timestamptz;

ALTER TABLE pending_signups
  ADD COLUMN telegram_blocked_at timestamptz;

COMMIT;
