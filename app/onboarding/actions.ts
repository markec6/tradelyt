"use server"

import { randomBytes, scrypt } from "node:crypto"
import { promisify } from "node:util"

import { neon } from "@neondatabase/serverless"

import { toE164 } from "@/components/onboarding/phone-number"
import { validateAccount, type AccountDraft, type AccountErrors } from "@/components/onboarding/validate-account"
import { telegramHandleError, type TelegramDraft } from "@/components/onboarding/validate-telegram"
import { validateExchange, type ExchangeDraft, type ExchangeErrors } from "@/components/onboarding/validate-exchange"
import { validateRisk, withDefaults, type RiskDraft, type RiskErrors } from "@/components/onboarding/validate-risk"
import { encryptionKey, sealSecret } from "@/app/onboarding/secret-box"

const scryptAsync = promisify(scrypt)

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url")
  const derived = (await scryptAsync(password, salt, 32)) as Buffer
  return `scrypt$${salt}$${derived.toString("base64url")}`
}

export async function saveAccount(
  draft: AccountDraft,
): Promise<{ ok: true; userId: string; phoneNumber: string } | { ok: false; errors: AccountErrors }> {
  const errors = validateAccount(draft)
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const phoneNumber = toE164(draft.phoneNumber, draft.country)
  if (!phoneNumber) {
    return { ok: false, errors: { phoneNumber: "Enter a valid phone number." } }
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return { ok: false, errors: { phoneNumber: "Could not save your phone number." } }
  }

  try {
    const passwordHash = await hashPassword(draft.password)
    const sql = neon(databaseUrl)
    const rows = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, phone_number, country)
      VALUES (
        ${draft.email.trim()},
        ${passwordHash},
        ${draft.firstName.trim()},
        ${draft.lastName.trim()},
        ${phoneNumber},
        ${draft.country}
      )
      ON CONFLICT (email)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone_number = EXCLUDED.phone_number,
        country = EXCLUDED.country,
        updated_at = now()
      RETURNING id
    `
    const userId = rows[0]?.id
    if (!userId) {
      return { ok: false, errors: { phoneNumber: "Could not save your phone number." } }
    }
    return { ok: true, userId: String(userId), phoneNumber }
  } catch {
    return { ok: false, errors: { phoneNumber: "Could not save your phone number." } }
  }
}

export async function saveTelegram(input: {
  userId: string | null
  draft: TelegramDraft
}): Promise<{ ok: true } | { ok: false; errors: { handle?: string; form?: string } }> {
  if (!input.userId) {
    return { ok: false, errors: { form: "Save your account before connecting Telegram." } }
  }

  const handle = input.draft.handle.replace(/^@+/, "")
  const handleError = telegramHandleError(handle)
  if (handleError) return { ok: false, errors: { handle: handleError } }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return { ok: false, errors: { form: "Could not save Telegram." } }
  }

  try {
    const sql = neon(databaseUrl)
    const [updated] = await sql.transaction([
      sql`
        UPDATE users
        SET telegram_username = ${handle}, updated_at = now()
        WHERE id = ${input.userId}
        RETURNING id
      `,
      sql`
        INSERT INTO bot_settings (
          user_id,
          notify_trade_executions,
          notify_risk_warnings,
          notify_daily_pnl
        )
        VALUES (
          ${input.userId},
          ${input.draft.tradeExecutions},
          ${input.draft.riskWarnings},
          ${input.draft.dailyPnl}
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          notify_trade_executions = EXCLUDED.notify_trade_executions,
          notify_risk_warnings = EXCLUDED.notify_risk_warnings,
          notify_daily_pnl = EXCLUDED.notify_daily_pnl,
          updated_at = now()
      `,
    ])
    if (!updated[0]?.id) {
      return { ok: false, errors: { form: "Could not save Telegram." } }
    }
    return { ok: true }
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
    if (code === "23505") {
      return { ok: false, errors: { handle: "This Telegram account is already connected." } }
    }
    return { ok: false, errors: { form: "Could not save Telegram." } }
  }
}

export async function saveExchange(input: {
  userId: string | null
  draft: ExchangeDraft
}): Promise<{ ok: true } | { ok: false; errors: ExchangeErrors }> {
  if (!input.userId) {
    return { ok: false, errors: { form: "Save your account before connecting an exchange." } }
  }

  const errors = validateExchange(input.draft)
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const key = encryptionKey()
  if (!key) return { ok: false, errors: { form: "Could not save your exchange." } }

  const needsKeys = input.draft.exchange !== "paper"
  const apiKey = needsKeys ? sealSecret(input.draft.apiKey, key) : null
  const apiSecret = needsKeys ? sealSecret(input.draft.apiSecret, key) : null
  const apiPassphrase = input.draft.exchange === "okx" ? sealSecret(input.draft.passphrase, key) : null
  const exchange = input.draft.exchange
  const mode = input.draft.mode

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || !exchange) return { ok: false, errors: { form: "Could not save your exchange." } }

  try {
    const sql = neon(databaseUrl)
    const updated = await sql`
      INSERT INTO bot_settings (
        user_id,
        exchange_name,
        trading_mode,
        api_key,
        api_secret,
        api_passphrase
      )
      VALUES (${input.userId}, ${exchange}, ${mode}, ${apiKey}, ${apiSecret}, ${apiPassphrase})
      ON CONFLICT (user_id)
      DO UPDATE SET
        exchange_name = EXCLUDED.exchange_name,
        trading_mode = EXCLUDED.trading_mode,
        api_key = EXCLUDED.api_key,
        api_secret = EXCLUDED.api_secret,
        api_passphrase = EXCLUDED.api_passphrase,
        updated_at = now()
      RETURNING id
    `
    if (!updated[0]?.id) return { ok: false, errors: { form: "Could not save your exchange." } }
    return { ok: true }
  } catch {
    return { ok: false, errors: { form: "Could not save your exchange." } }
  }
}

export async function saveRisk(input: {
  userId: string | null
  draft: RiskDraft
}): Promise<{ ok: true } | { ok: false; errors: RiskErrors }> {
  if (!input.userId) {
    return { ok: false, errors: { form: "Save your account before setting risk limits." } }
  }

  const draft = withDefaults(input.draft)
  const errors = validateRisk(draft)
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  if (!draft.strategy) return { ok: false, errors: { form: "Choose a strategy." } }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return { ok: false, errors: { form: "Could not save your risk limits." } }

  const maxDrawdown = draft.maxDrawdown
  const riskPerTrade = draft.riskPerTrade

  try {
    const sql = neon(databaseUrl)
    const updated = await sql`
      INSERT INTO bot_settings (
        user_id,
        strategy,
        max_drawdown_percent,
        risk_per_trade_percent,
        stop_loss_enabled,
        trailing_take_profit,
        emergency_stop_volatility
      )
      VALUES (
        ${input.userId},
        ${input.draft.strategy},
        ${maxDrawdown},
        ${riskPerTrade},
        ${input.draft.stopLoss},
        ${input.draft.trailingTakeProfit},
        ${input.draft.emergencyStop}
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        strategy = EXCLUDED.strategy,
        max_drawdown_percent = EXCLUDED.max_drawdown_percent,
        risk_per_trade_percent = EXCLUDED.risk_per_trade_percent,
        stop_loss_enabled = EXCLUDED.stop_loss_enabled,
        trailing_take_profit = EXCLUDED.trailing_take_profit,
        emergency_stop_volatility = EXCLUDED.emergency_stop_volatility,
        updated_at = now()
      RETURNING id
    `
    if (!updated[0]?.id) return { ok: false, errors: { form: "Could not save your risk limits." } }
    return { ok: true }
  } catch {
    return { ok: false, errors: { form: "Could not save your risk limits." } }
  }
}

export async function launchTradelyt(
  userId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!userId) return { ok: false, error: "Save your account before launching." }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return { ok: false, error: "Could not launch Tradelyt." }

  try {
    const sql = neon(databaseUrl)
    const updated = await sql`
      UPDATE bot_settings
      SET is_active = true, updated_at = now()
      WHERE user_id = ${userId}
      RETURNING id
    `
    if (!updated[0]?.id) return { ok: false, error: "Could not launch Tradelyt." }
    return { ok: true }
  } catch {
    return { ok: false, error: "Could not launch Tradelyt." }
  }
}
