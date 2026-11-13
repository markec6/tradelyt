-- Welcome is sent once. The abandoned-checkout reminder is sent once after one hour.

BEGIN;

ALTER TABLE users
  ADD COLUMN welcome_sent_at timestamptz;

ALTER TABLE subscriptions
  ADD COLUMN reminder_1h_sent_at timestamptz,
  ADD COLUMN reminder_1h_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN reminder_1h_claimed_at timestamptz,
  ADD CONSTRAINT subscriptions_reminder_1h_attempts_check
    CHECK (reminder_1h_attempts >= 0 AND reminder_1h_attempts <= 3);

COMMIT;
