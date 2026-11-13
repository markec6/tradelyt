-- Telegram deep link tokens and webhook delivery dedup.
-- telegram_id stays bigint. The app reads it as a string.

BEGIN;

ALTER TABLE users
  ADD COLUMN telegram_first_name text,
  ADD COLUMN telegram_photo_file_id text;

CREATE TABLE link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX link_tokens_user_id_idx ON link_tokens (user_id);

CREATE TABLE telegram_updates (
  update_id text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
