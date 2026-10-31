-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "bot_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"discipline_mode" text DEFAULT 'soft' NOT NULL,
	"max_daily_trades" integer DEFAULT 0 NOT NULL,
	"max_drawdown_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"risk_per_trade_percent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"exchange_name" text,
	"api_key" text,
	"api_secret" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notify_trade_executions" boolean DEFAULT true NOT NULL,
	"notify_risk_warnings" boolean DEFAULT true NOT NULL,
	"notify_daily_pnl" boolean DEFAULT true NOT NULL,
	"trading_mode" text DEFAULT 'sandbox' NOT NULL,
	"api_passphrase" text,
	"strategy" text,
	"stop_loss_enabled" boolean DEFAULT true NOT NULL,
	"trailing_take_profit" boolean DEFAULT true NOT NULL,
	"emergency_stop_volatility" boolean DEFAULT true NOT NULL,
	CONSTRAINT "bot_settings_user_id_key" UNIQUE("user_id"),
	CONSTRAINT "bot_settings_discipline_mode_check" CHECK (discipline_mode = ANY (ARRAY['soft'::text, 'strict'::text, 'locked'::text])),
	CONSTRAINT "bot_settings_max_daily_trades_check" CHECK (max_daily_trades >= 0),
	CONSTRAINT "bot_settings_max_drawdown_percent_check" CHECK ((max_drawdown_percent >= (0)::numeric) AND (max_drawdown_percent <= (100)::numeric)),
	CONSTRAINT "bot_settings_risk_per_trade_percent_check" CHECK ((risk_per_trade_percent >= (0)::numeric) AND (risk_per_trade_percent <= (100)::numeric)),
	CONSTRAINT "bot_settings_trading_mode_check" CHECK (trading_mode = ANY (ARRAY['sandbox'::text, 'live'::text])),
	CONSTRAINT "bot_settings_strategy_check" CHECK ((strategy IS NULL) OR (strategy = ANY (ARRAY['dca'::text, 'grid'::text, 'momentum'::text]))),
	CONSTRAINT "bot_settings_exchange_name_check" CHECK ((exchange_name IS NULL) OR (exchange_name = ANY (ARRAY['binance'::text, 'bybit'::text, 'okx'::text, 'binance_testnet'::text, 'bybit_testnet'::text, 'paper'::text])))
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_symbol" text NOT NULL,
	"position_type" text NOT NULL,
	"entry_price" numeric(20, 8) NOT NULL,
	"stop_loss" numeric(20, 8),
	"take_profit_1" numeric(20, 8),
	"take_profit_2" numeric(20, 8),
	"status" text DEFAULT 'open' NOT NULL,
	"pnl_amount" numeric(20, 8) DEFAULT '0' NOT NULL,
	"pnl_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trades_position_type_check" CHECK (position_type = ANY (ARRAY['long'::text, 'short'::text])),
	CONSTRAINT "trades_status_check" CHECK (status = ANY (ARRAY['open'::text, 'closed'::text, 'canceled'::text, 'stopped'::text]))
);
--> statement-breakpoint
CREATE TABLE "daily_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"total_trades" integer DEFAULT 0 NOT NULL,
	"discipline_score" integer DEFAULT 0 NOT NULL,
	"daily_pnl_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"rules_broken_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_analytics_user_date_key" UNIQUE("user_id","date"),
	CONSTRAINT "daily_analytics_total_trades_check" CHECK (total_trades >= 0),
	CONSTRAINT "daily_analytics_discipline_score_check" CHECK ((discipline_score >= 0) AND (discipline_score <= 100)),
	CONSTRAINT "daily_analytics_rules_broken_count_check" CHECK (rules_broken_count >= 0)
);
--> statement-breakpoint
CREATE TABLE "notifications_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trade_id" uuid,
	"notification_type" text NOT NULL,
	"message_content" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_log_notification_type_check" CHECK (notification_type = ANY (ARRAY['trade_opened'::text, 'trade_closed'::text, 'sl_hit'::text, 'tp_hit'::text, 'rule_broken'::text, 'daily_summary'::text, 'system'::text]))
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"status" text NOT NULL,
	"price_id" text NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_key" UNIQUE("user_id"),
	CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "subscriptions_status_check" CHECK (status = ANY (ARRAY['incomplete'::text, 'trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'unpaid'::text, 'paused'::text, 'incomplete_expired'::text]))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone_number" text,
	"country" char(2),
	"date_of_birth" date,
	"telegram_id" bigint,
	"telegram_username" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"account_status" text DEFAULT 'pending' NOT NULL,
	"session_version" integer DEFAULT 0 NOT NULL,
	"telegram_avatar_url" text,
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_telegram_id_key" UNIQUE("telegram_id"),
	CONSTRAINT "users_phone_number_key" UNIQUE("phone_number"),
	CONSTRAINT "users_country_iso" CHECK ((country IS NULL) OR (country ~ '^[A-Z]{2}$'::text)),
	CONSTRAINT "users_account_status_check" CHECK (account_status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text, 'deleted'::text])),
	CONSTRAINT "users_session_version_check" CHECK (session_version >= 0),
	CONSTRAINT "users_active_contact_check" CHECK ((account_status <> 'active'::text) OR ((phone_number IS NOT NULL) AND (telegram_username IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_settings" ADD CONSTRAINT "bot_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_analytics" ADD CONSTRAINT "daily_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "trades_user_opened_at_idx" ON "trades" USING btree ("user_id" timestamptz_ops,"opened_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "trades_user_status_idx" ON "trades" USING btree ("user_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "notifications_log_trade_id_idx" ON "notifications_log" USING btree ("trade_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "notifications_log_user_sent_at_idx" ON "notifications_log" USING btree ("user_id" timestamptz_ops,"sent_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions" USING btree ("stripe_customer_id" text_ops);
*/