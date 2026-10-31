"use server"

import { and, eq } from "drizzle-orm"
import { neon } from "@neondatabase/serverless"

import { encryptionKey, sealSecret } from "@/app/onboarding/secret-box"
import { toE164 } from "@/components/onboarding/phone-number"
import { validateAccount, type AccountDraft, type AccountErrors } from "@/components/onboarding/validate-account"
import { validateExchange, type ExchangeDraft, type ExchangeErrors } from "@/components/onboarding/validate-exchange"
import { validateRisk, withDefaults, type RiskDraft, type RiskErrors } from "@/components/onboarding/validate-risk"
import { telegramHandleError, type TelegramDraft } from "@/components/onboarding/validate-telegram"
import { getDb } from "@/db"
import { users } from "@/db/schema"
import { cardConnected } from "@/lib/subscriptions"
import { hashPassword } from "@/lib/password"
import { readActorUserId, setOnboardingCookie } from "@/lib/session-store"

const EMAIL_TAKEN = "An account with this email already exists."
const PHONE_TAKEN = "This phone number is already in use."

function constraintName(error: unknown) {
  const seen = new Set<unknown>()
  let current: unknown = error
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current)
    if ("constraint" in current && typeof current.constraint === "string") return current.constraint
    if ("message" in current && typeof current.message === "string") {
      const match = current.message.match(/unique constraint "([^"]+)"/)
      if (match) return match[1]
    }
    current = "cause" in current ? current.cause : undefined
  }
  return ""
}

function rethrowConfig(error: unknown) {
  if (!(error instanceof Error)) return
  if (
    error.message === "PASSWORD_PEPPER is not set" ||
    error.message === "SESSION_SECRET is not set" ||
    error.message === "DATABASE_URL is not set"
  ) {
    throw error
  }
}

export async function saveAccount(
  draft: AccountDraft,
): Promise<{ ok: true; userId: string; phoneNumber: string } | { ok: false; errors: AccountErrors }> {
  const actorId = await readActorUserId()
  const keepPassword = Boolean(actorId) && draft.password.length === 0 && draft.confirmPassword.length === 0
  const errors = validateAccount(draft, { keepPassword })
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const phoneNumber = toE164(draft.phoneNumber, draft.country)
  if (!phoneNumber) {
    return { ok: false, errors: { phoneNumber: "Enter a valid phone number." } }
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return { ok: false, errors: { phoneNumber: "Could not save your phone number." } }
  }

  const email = draft.email.trim()
  const profile = {
    email,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    phoneNumber,
    country: draft.country,
    updatedAt: new Date(),
  }

  try {
    const db = getDb()
    const existing = actorId
      ? await db
          .select({ id: users.id, accountStatus: users.accountStatus, sessionVersion: users.sessionVersion })
          .from(users)
          .where(eq(users.id, actorId))
          .limit(1)
      : await db
          .select({ id: users.id, accountStatus: users.accountStatus, sessionVersion: users.sessionVersion })
          .from(users)
          .where(eq(users.email, email))
          .limit(1)
    const current = existing[0]

    if (current) {
      if (current.accountStatus !== "pending" || (await cardConnected(current.id))) {
        return { ok: false, errors: { email: EMAIL_TAKEN } }
      }
      const passwordHash = keepPassword ? null : await hashPassword(draft.password)
      const updated = await db
        .update(users)
        .set(passwordHash ? { ...profile, passwordHash } : profile)
        .where(and(eq(users.id, current.id), eq(users.accountStatus, "pending")))
        .returning({ id: users.id, sessionVersion: users.sessionVersion })
      const row = updated[0]
      if (!row) return { ok: false, errors: { email: EMAIL_TAKEN } }
      await setOnboardingCookie(row.id, row.sessionVersion)
      return { ok: true, userId: row.id, phoneNumber }
    }

    const inserted = await db
      .insert(users)
      .values({ ...profile, passwordHash: await hashPassword(draft.password), accountStatus: "pending" })
      .returning({ id: users.id, sessionVersion: users.sessionVersion })
    const row = inserted[0]
    if (!row) return { ok: false, errors: { phoneNumber: "Could not save your phone number." } }
    await setOnboardingCookie(row.id, row.sessionVersion)
    return { ok: true, userId: row.id, phoneNumber }
  } catch (error) {
    rethrowConfig(error)
    const constraint = constraintName(error)
    if (constraint === "users_email_key") return { ok: false, errors: { email: EMAIL_TAKEN } }
    if (constraint === "users_phone_number_key") return { ok: false, errors: { phoneNumber: PHONE_TAKEN } }
    return { ok: false, errors: { phoneNumber: "Could not save your phone number." } }
  }
}

export async function saveTelegram(
  draft: TelegramDraft,
): Promise<{ ok: true } | { ok: false; errors: { handle?: string; form?: string } }> {
  const userId = await readActorUserId()
  if (!userId) {
    return { ok: false, errors: { form: "Save your account before connecting Telegram." } }
  }

  if (await cardConnected(userId)) {
    return { ok: false, errors: { form: "Your trial is already confirmed." } }
  }

  const handle = draft.handle.replace(/^@+/, "")
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
        WHERE id = ${userId}
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
          ${userId},
          ${draft.tradeExecutions},
          ${draft.riskWarnings},
          ${draft.dailyPnl}
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

export async function saveExchange(
  draft: ExchangeDraft,
): Promise<{ ok: true } | { ok: false; errors: ExchangeErrors }> {
  const userId = await readActorUserId()
  if (!userId) {
    return { ok: false, errors: { form: "Save your account before connecting an exchange." } }
  }

  const errors = validateExchange(draft)
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const key = encryptionKey()
  if (!key) return { ok: false, errors: { form: "Could not save your exchange." } }

  const needsKeys = draft.exchange !== "paper"
  const apiKey = needsKeys ? sealSecret(draft.apiKey, key) : null
  const apiSecret = needsKeys ? sealSecret(draft.apiSecret, key) : null
  const apiPassphrase = draft.exchange === "okx" ? sealSecret(draft.passphrase, key) : null
  const exchange = draft.exchange
  const mode = draft.mode

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
      VALUES (${userId}, ${exchange}, ${mode}, ${apiKey}, ${apiSecret}, ${apiPassphrase})
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

export async function saveRisk(input: RiskDraft): Promise<{ ok: true } | { ok: false; errors: RiskErrors }> {
  const userId = await readActorUserId()
  if (!userId) {
    return { ok: false, errors: { form: "Save your account before setting risk limits." } }
  }

  const draft = withDefaults(input)
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
        ${userId},
        ${draft.strategy},
        ${maxDrawdown},
        ${riskPerTrade},
        ${draft.stopLoss},
        ${draft.trailingTakeProfit},
        ${draft.emergencyStop}
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

export async function launchTradelyt(): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await readActorUserId()
  if (!userId) return { ok: false, error: "Save your account before launching." }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return { ok: false, error: "Could not launch Tradelyt." }

  try {
    const sql = neon(databaseUrl)
    const rows = await sql`
      SELECT phone_number, telegram_username
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `
    const phone = typeof rows[0]?.phone_number === "string" ? rows[0].phone_number : ""
    const telegram = typeof rows[0]?.telegram_username === "string" ? rows[0].telegram_username : ""
    if (!phone || !telegram) return { ok: false, error: "Add your phone number and Telegram before checkout." }
    return { ok: true }
  } catch {
    return { ok: false, error: "Could not launch Tradelyt." }
  }
}
