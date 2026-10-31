import { sql } from "drizzle-orm"
import { bigint, boolean, char, check, customType, date, foreignKey, index, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"

const citext = customType<{ data: string }>({
  dataType() {
    return "citext"
  },
})



export const botSettings = pgTable("bot_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	isActive: boolean("is_active").default(false).notNull(),
	disciplineMode: text("discipline_mode").default('soft').notNull(),
	maxDailyTrades: integer("max_daily_trades").default(0).notNull(),
	maxDrawdownPercent: numeric("max_drawdown_percent", { precision: 5, scale:  2 }).default('0').notNull(),
	riskPerTradePercent: numeric("risk_per_trade_percent", { precision: 5, scale:  2 }).default('0').notNull(),
	exchangeName: text("exchange_name"),
	apiKey: text("api_key"),
	apiSecret: text("api_secret"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	notifyTradeExecutions: boolean("notify_trade_executions").default(true).notNull(),
	notifyRiskWarnings: boolean("notify_risk_warnings").default(true).notNull(),
	notifyDailyPnl: boolean("notify_daily_pnl").default(true).notNull(),
	tradingMode: text("trading_mode").default('sandbox').notNull(),
	apiPassphrase: text("api_passphrase"),
	strategy: text(),
	stopLossEnabled: boolean("stop_loss_enabled").default(true).notNull(),
	trailingTakeProfit: boolean("trailing_take_profit").default(true).notNull(),
	emergencyStopVolatility: boolean("emergency_stop_volatility").default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bot_settings_user_id_fkey"
		}).onDelete("cascade"),
	unique("bot_settings_user_id_key").on(table.userId),
	check("bot_settings_discipline_mode_check", sql`discipline_mode = ANY (ARRAY['soft'::text, 'strict'::text, 'locked'::text])`),
	check("bot_settings_max_daily_trades_check", sql`max_daily_trades >= 0`),
	check("bot_settings_max_drawdown_percent_check", sql`(max_drawdown_percent >= (0)::numeric) AND (max_drawdown_percent <= (100)::numeric)`),
	check("bot_settings_risk_per_trade_percent_check", sql`(risk_per_trade_percent >= (0)::numeric) AND (risk_per_trade_percent <= (100)::numeric)`),
	check("bot_settings_trading_mode_check", sql`trading_mode = ANY (ARRAY['sandbox'::text, 'live'::text])`),
	check("bot_settings_strategy_check", sql`(strategy IS NULL) OR (strategy = ANY (ARRAY['dca'::text, 'grid'::text, 'momentum'::text]))`),
	check("bot_settings_exchange_name_check", sql`(exchange_name IS NULL) OR (exchange_name = ANY (ARRAY['binance'::text, 'bybit'::text, 'okx'::text, 'binance_testnet'::text, 'bybit_testnet'::text, 'paper'::text]))`),
]);

export const trades = pgTable("trades", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tokenSymbol: text("token_symbol").notNull(),
	positionType: text("position_type").notNull(),
	entryPrice: numeric("entry_price", { precision: 20, scale:  8 }).notNull(),
	stopLoss: numeric("stop_loss", { precision: 20, scale:  8 }),
	takeProfit1: numeric("take_profit_1", { precision: 20, scale:  8 }),
	takeProfit2: numeric("take_profit_2", { precision: 20, scale:  8 }),
	status: text().default('open').notNull(),
	pnlAmount: numeric("pnl_amount", { precision: 20, scale:  8 }).default('0').notNull(),
	pnlPercentage: numeric("pnl_percentage", { precision: 5, scale:  2 }).default('0').notNull(),
	openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
	closedAt: timestamp("closed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	index("trades_user_opened_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.openedAt.desc().nullsFirst().op("timestamptz_ops")),
	index("trades_user_status_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "trades_user_id_fkey"
		}).onDelete("cascade"),
	check("trades_position_type_check", sql`position_type = ANY (ARRAY['long'::text, 'short'::text])`),
	check("trades_status_check", sql`status = ANY (ARRAY['open'::text, 'closed'::text, 'canceled'::text, 'stopped'::text])`),
]);

export const dailyAnalytics = pgTable("daily_analytics", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	date: date().notNull(),
	totalTrades: integer("total_trades").default(0).notNull(),
	disciplineScore: integer("discipline_score").default(0).notNull(),
	dailyPnlPercentage: numeric("daily_pnl_percentage", { precision: 5, scale:  2 }).default('0').notNull(),
	rulesBrokenCount: integer("rules_broken_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "daily_analytics_user_id_fkey"
		}).onDelete("cascade"),
	unique("daily_analytics_user_date_key").on(table.userId, table.date),
	check("daily_analytics_total_trades_check", sql`total_trades >= 0`),
	check("daily_analytics_discipline_score_check", sql`(discipline_score >= 0) AND (discipline_score <= 100)`),
	check("daily_analytics_rules_broken_count_check", sql`rules_broken_count >= 0`),
]);

export const notificationsLog = pgTable("notifications_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tradeId: uuid("trade_id"),
	notificationType: text("notification_type").notNull(),
	messageContent: text("message_content").notNull(),
	sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	index("notifications_log_trade_id_idx").using("btree", table.tradeId.asc().nullsLast().op("uuid_ops")),
	index("notifications_log_user_sent_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.sentAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_log_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.tradeId],
			foreignColumns: [trades.id],
			name: "notifications_log_trade_id_fkey"
		}).onDelete("set null"),
	check("notifications_log_notification_type_check", sql`notification_type = ANY (ARRAY['trade_opened'::text, 'trade_closed'::text, 'sl_hit'::text, 'tp_hit'::text, 'rule_broken'::text, 'daily_summary'::text, 'system'::text])`),
]);

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	stripeCustomerId: text("stripe_customer_id").notNull(),
	stripeSubscriptionId: text("stripe_subscription_id").notNull(),
	status: text().notNull(),
	priceId: text("price_id").notNull(),
	trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
	canceledAt: timestamp("canceled_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
	index("subscriptions_stripe_customer_id_idx").using("btree", table.stripeCustomerId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "subscriptions_user_id_fkey"
		}).onDelete("cascade"),
	unique("subscriptions_user_id_key").on(table.userId),
	unique("subscriptions_stripe_subscription_id_key").on(table.stripeSubscriptionId),
	check("subscriptions_status_check", sql`status = ANY (ARRAY['incomplete'::text, 'trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'unpaid'::text, 'paused'::text, 'incomplete_expired'::text])`),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: citext("email").notNull(),
	passwordHash: text("password_hash").notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	phoneNumber: text("phone_number"),
	country: char({ length: 2 }),
	dateOfBirth: date("date_of_birth"),
	telegramId: bigint("telegram_id", { mode: "number" }),
	telegramUsername: text("telegram_username"),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	accountStatus: text("account_status").default('pending').notNull(),
	sessionVersion: integer("session_version").default(0).notNull(),
	telegramAvatarUrl: text("telegram_avatar_url"),
}, (table) => [
	unique("users_email_key").on(table.email),
	unique("users_telegram_id_key").on(table.telegramId),
	unique("users_phone_number_key").on(table.phoneNumber),
	check("users_country_iso", sql`(country IS NULL) OR (country ~ '^[A-Z]{2}$'::text)`),
	check("users_account_status_check", sql`account_status = ANY (ARRAY['pending'::text, 'active'::text, 'suspended'::text, 'deleted'::text])`),
	check("users_session_version_check", sql`session_version >= 0`),
	check("users_active_contact_check", sql`(account_status <> 'active'::text) OR ((phone_number IS NOT NULL) AND (telegram_username IS NOT NULL))`),
]);

export const stripeEvents = pgTable("stripe_events", {
	id: text().primaryKey().notNull(),
	type: text().notNull(),
	processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
});
