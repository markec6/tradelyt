import { neon } from "@neondatabase/serverless"

import type { OnboardingResume, OnboardingStep } from "@/components/onboarding/resume"
import { EMPTY_ACCOUNT } from "@/components/onboarding/validate-account"
import { EMPTY_EXCHANGE, type ExchangeId, type TradingMode } from "@/components/onboarding/validate-exchange"
import { DEFAULT_MAX_DRAWDOWN, DEFAULT_RISK_PER_TRADE, EMPTY_RISK, type StrategyId } from "@/components/onboarding/validate-risk"
import { EMPTY_TELEGRAM } from "@/components/onboarding/validate-telegram"

const EXCHANGES = new Set<ExchangeId>(["paper", "binance_testnet", "bybit_testnet", "binance", "bybit", "okx"])
const STRATEGIES = new Set<StrategyId>(["dca", "grid", "momentum"])

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function flag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function oneDecimal(value: unknown, fallback: string) {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
  if (!Number.isFinite(amount)) return fallback
  return amount.toFixed(1)
}

function asExchange(value: string): ExchangeId | null {
  return EXCHANGES.has(value as ExchangeId) ? (value as ExchangeId) : null
}

function asMode(value: string): TradingMode {
  return value === "live" ? "live" : "sandbox"
}

function asStrategy(value: string): StrategyId | null {
  return STRATEGIES.has(value as StrategyId) ? (value as StrategyId) : null
}

export async function loadOnboardingResume(userId: string): Promise<OnboardingResume | null> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return null
  const sql = neon(databaseUrl)
  const rows = await sql`
    SELECT
      u.first_name,
      u.last_name,
      u.email::text AS email,
      u.phone_number,
      u.country,
      u.telegram_username,
      b.notify_trade_executions,
      b.notify_risk_warnings,
      b.notify_daily_pnl,
      b.exchange_name,
      b.trading_mode,
      b.strategy,
      b.max_drawdown_percent,
      b.risk_per_trade_percent,
      b.stop_loss_enabled,
      b.trailing_take_profit,
      b.emergency_stop_volatility
    FROM users u
    LEFT JOIN bot_settings b ON b.user_id = u.id
    WHERE u.id = ${userId}
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null

  const country = text(row.country)
  const phone = text(row.phone_number)
  const telegram = text(row.telegram_username).replace(/^@+/, "")
  const exchange = asExchange(text(row.exchange_name))
  const strategy = asStrategy(text(row.strategy))

  let step: OnboardingStep = 5
  if (!phone || !/^[A-Z]{2}$/.test(country)) step = 1
  else if (!telegram) step = 2
  else if (!exchange) step = 3
  else if (!strategy) step = 4

  return {
    step,
    account: {
      ...EMPTY_ACCOUNT,
      firstName: text(row.first_name),
      lastName: text(row.last_name),
      email: text(row.email),
      phoneNumber: phone,
      country,
    },
    telegram: {
      ...EMPTY_TELEGRAM,
      handle: telegram,
      tradeExecutions: flag(row.notify_trade_executions, true),
      riskWarnings: flag(row.notify_risk_warnings, true),
      dailyPnl: flag(row.notify_daily_pnl, true),
    },
    exchange: {
      ...EMPTY_EXCHANGE,
      exchange,
      mode: asMode(text(row.trading_mode)),
    },
    risk: {
      ...EMPTY_RISK,
      strategy,
      maxDrawdown: oneDecimal(row.max_drawdown_percent, DEFAULT_MAX_DRAWDOWN),
      riskPerTrade: oneDecimal(row.risk_per_trade_percent, DEFAULT_RISK_PER_TRADE),
      stopLoss: flag(row.stop_loss_enabled, true),
      trailingTakeProfit: flag(row.trailing_take_profit, true),
      emergencyStop: flag(row.emergency_stop_volatility, true),
    },
  }
}
