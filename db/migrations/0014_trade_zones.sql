-- Per-trade mode, zone state, and the columns the zone cron edits.

BEGIN;

ALTER TABLE bot_settings
  ADD COLUMN timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN quiet_hours_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN quiet_hours_start time,
  ADD COLUMN quiet_hours_end time,
  ADD COLUMN paused_at timestamptz;

ALTER TABLE trades
  ADD COLUMN mode text,
  ADD COLUMN source text NOT NULL DEFAULT 'manual',
  ADD COLUMN quantity numeric(20, 8),
  ADD COLUMN remaining_quantity numeric(20, 8),
  ADD COLUMN leverage numeric(10, 2),
  ADD COLUMN zone text,
  ADD COLUMN zone_changed_at timestamptz,
  ADD COLUMN live_message_id text,
  ADD COLUMN equity_at_open numeric(20, 8),
  ADD COLUMN position_entries integer NOT NULL DEFAULT 1,
  ADD COLUMN tp1_confirmed_at timestamptz,
  ADD COLUMN notified_at timestamptz,
  ADD COLUMN tp_armed boolean NOT NULL DEFAULT true,
  ADD COLUMN sl_alert_count integer NOT NULL DEFAULT 0,
  ADD COLUMN sl_alert_at timestamptz,
  ADD COLUMN last_edit_pnl numeric(10, 2),
  ADD COLUMN last_edit_at timestamptz,
  ADD COLUMN passive_refreshed_at timestamptz,
  ADD COLUMN price_supported boolean NOT NULL DEFAULT true,
  ADD COLUMN alert_claimed_at timestamptz,
  ADD COLUMN deferred_zone text;

ALTER TABLE trades
  ALTER COLUMN pnl_percentage TYPE numeric(10, 2);

ALTER TABLE trades DROP CONSTRAINT trades_status_check;

ALTER TABLE trades
  ADD CONSTRAINT trades_status_check CHECK (
    status IN (
      'open',
      'closed',
      'canceled',
      'cancelled',
      'stopped',
      'tp1_hit',
      'tp2_hit',
      'closed_manual'
    )
  ),
  ADD CONSTRAINT trades_mode_check CHECK (
    mode IS NULL OR mode IN ('scalper', 'classic', 'moonshot')
  ),
  ADD CONSTRAINT trades_source_check CHECK (source IN ('exchange', 'manual', 'webhook')),
  ADD CONSTRAINT trades_zone_check CHECK (
    zone IS NULL OR zone IN ('neutral', 'approach_tp1', 'tp1', 'approach_sl', 'tp2', 'sl')
  ),
  ADD CONSTRAINT trades_deferred_zone_check CHECK (
    deferred_zone IS NULL OR deferred_zone IN ('tp1', 'tp2')
  ),
  ADD CONSTRAINT trades_position_entries_check CHECK (position_entries >= 1),
  ADD CONSTRAINT trades_sl_alert_count_check CHECK (sl_alert_count >= 0 AND sl_alert_count <= 4);

CREATE INDEX trades_tracked_idx ON trades (status)
  WHERE status IN ('open', 'tp1_hit');

ALTER TABLE notifications_log
  ADD COLUMN template_id uuid REFERENCES telegram_message_templates (id) ON DELETE SET NULL,
  ADD COLUMN zone text,
  ADD COLUMN mode text,
  ADD COLUMN telegram_message_id text,
  ADD COLUMN event_key text;

ALTER TABLE notifications_log
  ADD CONSTRAINT notifications_log_event_key_key UNIQUE (event_key);

ALTER TABLE notifications_log DROP CONSTRAINT notifications_log_notification_type_check;

ALTER TABLE notifications_log
  ADD CONSTRAINT notifications_log_notification_type_check CHECK (
    notification_type IN (
      'trade_opened',
      'trade_closed',
      'sl_hit',
      'tp_hit',
      'rule_broken',
      'daily_summary',
      'system',
      'zone_neutral',
      'zone_approach_tp1',
      'zone_approach_sl',
      'zone_tp1',
      'zone_tp2',
      'zone_sl',
      'special_positions',
      'silent_refresh'
    )
  );

COMMIT;
