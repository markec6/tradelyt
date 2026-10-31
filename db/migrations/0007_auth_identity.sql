BEGIN;

-- Auth step 1: identity status, session version, Telegram avatar URL.
-- Billing columns leave users. subscriptions remains the only billing record.
-- Backfill runs before those columns are dropped.

ALTER TABLE users
  ADD COLUMN account_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN session_version integer NOT NULL DEFAULT 0,
  ADD COLUMN telegram_avatar_url text;

ALTER TABLE users
  ADD CONSTRAINT users_account_status_check CHECK (
    account_status IN ('pending', 'active', 'suspended', 'deleted')
  );

ALTER TABLE users
  ADD CONSTRAINT users_session_version_check CHECK (session_version >= 0);

UPDATE users AS u
SET account_status = 'active'
WHERE u.phone_number IS NOT NULL
  AND u.telegram_username IS NOT NULL
  AND (
    EXISTS (
      SELECT 1
      FROM subscriptions AS s
      WHERE s.user_id = u.id
        AND s.status IN ('trialing', 'active')
    )
    OR u.subscription_status IN ('trial', 'trialing', 'active')
  );

ALTER TABLE users
  ADD CONSTRAINT users_active_contact_check CHECK (
    account_status <> 'active'
    OR (phone_number IS NOT NULL AND telegram_username IS NOT NULL)
  );

ALTER TABLE users
  ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);

ALTER TABLE users DROP CONSTRAINT users_stripe_customer_id_key;
ALTER TABLE users DROP CONSTRAINT users_subscription_status_check;
ALTER TABLE users DROP COLUMN stripe_customer_id;
ALTER TABLE users DROP COLUMN subscription_status;
ALTER TABLE users DROP COLUMN subscription_ends_at;

COMMIT;
