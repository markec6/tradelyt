-- Message templates for the 39 zone positions, plus the user's language.
-- Bodies stay empty until a text is locked in TELEGRAM_MESSAGES_MASTER_PLAN.md.

BEGIN;

ALTER TABLE users
  ADD COLUMN language text NOT NULL DEFAULT 'en';

ALTER TABLE users
  ADD CONSTRAINT users_language_check CHECK (language IN ('en', 'sr'));

CREATE TABLE telegram_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  mode text,
  zone text NOT NULL,
  variant smallint NOT NULL,
  language text NOT NULL,
  body text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT telegram_message_templates_mode_check CHECK (
    mode IS NULL OR mode IN ('scalper', 'classic', 'moonshot')
  ),
  CONSTRAINT telegram_message_templates_zone_check CHECK (
    zone IN ('neutral', 'tp1', 'tp2', 'sl', 'special_positions', 'approach_tp1', 'approach_sl')
  ),
  CONSTRAINT telegram_message_templates_variant_check CHECK (variant BETWEEN 1 AND 3),
  CONSTRAINT telegram_message_templates_language_check CHECK (language IN ('en', 'sr')),
  CONSTRAINT telegram_message_templates_version_check CHECK (version >= 1)
);

CREATE UNIQUE INDEX telegram_message_templates_active_key
  ON telegram_message_templates (code, language)
  WHERE is_active;

COMMIT;
