import { neon } from "@neondatabase/serverless"
import type Stripe from "stripe"

import { hashPassword } from "@/lib/password"
import { maybeSendWelcome } from "@/lib/welcome"
import { getPendingBilling } from "@/lib/pending-signup"
import { clearSignupCookie, readPendingSignupId, setSessionCookie } from "@/lib/session-store"
import { readSignupPassword } from "@/lib/signup-secret"
import { cardIsSaved, getPriceId, getStripe } from "@/lib/stripe"

const READY = new Set(["trialing", "active"])

export type CompleteSignupResult =
  | { ok: true }
  | { ok: false; error: string; code?: "not_ready" | "card_required" | "taken" | "expired"; status: number }

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

function fromUnix(seconds: number | null | undefined) {
  if (!seconds) return null
  return new Date(seconds * 1000).toISOString()
}

function readNumberField(value: object, key: string) {
  if (!(key in value)) return null
  const field = (value as Record<string, unknown>)[key]
  return typeof field === "number" ? field : null
}

function currentPeriodEnd(subscription: Stripe.Subscription) {
  const fromItem = subscription.items.data[0]?.current_period_end
  if (typeof fromItem === "number") return fromItem
  return readNumberField(subscription, "current_period_end")
}

function customerIdOf(customer: Stripe.Subscription["customer"]) {
  return typeof customer === "string" ? customer : customer.id
}

function postgresCode(error: unknown) {
  const seen = new Set<unknown>()
  let current: unknown = error
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current)
    if ("code" in current && typeof current.code === "string") return current.code
    current = "cause" in current ? current.cause : undefined
  }
  return ""
}

export async function completeSignup(): Promise<CompleteSignupResult> {
  const pendingId = await readPendingSignupId()
  if (!pendingId) {
    return { ok: false, error: "Save your account before starting the trial.", code: "expired", status: 401 }
  }

  const password = await readSignupPassword()
  if (!password) {
    return { ok: false, error: "Your signup session expired. Start again.", code: "expired", status: 401 }
  }

  const billing = await getPendingBilling(pendingId)
  if (!billing) {
    return { ok: false, error: "Your signup session expired. Start again.", code: "expired", status: 401 }
  }
  if (!billing.phoneNumber || !billing.telegramReady) {
    return { ok: false, error: "Connect Telegram before checkout.", status: 401 }
  }
  if (!billing.exchangeName) {
    return { ok: false, error: "Connect your exchange before checkout.", status: 401 }
  }
  if (!billing.strategy) {
    return { ok: false, error: "Choose a strategy before checkout.", status: 401 }
  }
  if (!billing.stripeSubscriptionId) {
    return { ok: false, error: "Start your trial before opening the dashboard.", code: "not_ready", status: 409 }
  }

  let subscription: Stripe.Subscription
  try {
    subscription = await getStripe().subscriptions.retrieve(billing.stripeSubscriptionId, {
      expand: ["pending_setup_intent"],
    })
  } catch {
    return { ok: false, error: "Your trial is still confirming. Try again in a moment.", code: "not_ready", status: 409 }
  }

  const metadataPending = subscription.metadata.pending_signup_id
  if (metadataPending && metadataPending !== pendingId) {
    return { ok: false, error: "Start your trial before opening the dashboard.", status: 401 }
  }
  if (!cardIsSaved(subscription)) {
    return { ok: false, error: "Confirm your card before opening the dashboard.", code: "card_required", status: 401 }
  }
  if (!READY.has(subscription.status)) {
    return { ok: false, error: "Your trial is still confirming. Try again in a moment.", code: "not_ready", status: 409 }
  }

  const passwordHash = await hashPassword(password)
  const customerId = customerIdOf(subscription.customer)
  const priceId = subscription.items.data[0]?.price.id ?? getPriceId()
  const trialEndsAt = fromUnix(subscription.trial_end)
  const periodEnd = fromUnix(currentPeriodEnd(subscription))
  const canceledAt = fromUnix(subscription.canceled_at)
  const sql = database()

  let rows: Record<string, unknown>[]
  try {
    rows = await sql`
      WITH pending AS (
        SELECT *
        FROM pending_signups
        WHERE id = ${pendingId}::uuid
          AND expires_at > now()
        FOR UPDATE
      ),
      blocked AS (
        SELECT CASE
          WHEN NOT EXISTS (SELECT 1 FROM pending) THEN 'missing'
          WHEN EXISTS (SELECT 1 FROM users u JOIN pending p ON u.email = p.email) THEN 'email'
          WHEN EXISTS (SELECT 1 FROM users u JOIN pending p ON u.phone_number = p.phone_number) THEN 'phone'
          WHEN EXISTS (SELECT 1 FROM users u JOIN pending p ON u.telegram_id = p.telegram_id) THEN 'telegram'
          WHEN EXISTS (
            SELECT 1 FROM pending
            WHERE phone_number IS NULL
              OR telegram_username IS NULL
              OR telegram_id IS NULL
              OR exchange_name IS NULL
              OR strategy IS NULL
          ) THEN 'incomplete'
          ELSE 'ok'
        END AS reason
      ),
      inserted AS (
        INSERT INTO users (
          email,
          password_hash,
          first_name,
          last_name,
          phone_number,
          country,
          telegram_id,
          telegram_username,
          telegram_first_name,
          telegram_avatar_url,
          telegram_photo_file_id,
          account_status
        )
        SELECT
          email,
          ${passwordHash},
          first_name,
          last_name,
          phone_number,
          country,
          telegram_id,
          telegram_username,
          telegram_first_name,
          telegram_avatar_url,
          telegram_photo_file_id,
          'active'
        FROM pending
        WHERE (SELECT reason FROM blocked) = 'ok'
        RETURNING id, session_version
      ),
      sub AS (
        INSERT INTO subscriptions (
          user_id,
          stripe_customer_id,
          stripe_subscription_id,
          status,
          price_id,
          trial_ends_at,
          current_period_end,
          cancel_at_period_end,
          canceled_at,
          updated_at
        )
        SELECT
          inserted.id,
          ${customerId},
          ${subscription.id},
          ${subscription.status},
          ${priceId},
          ${trialEndsAt}::timestamptz,
          ${periodEnd}::timestamptz,
          ${subscription.cancel_at_period_end},
          ${canceledAt}::timestamptz,
          now()
        FROM inserted
        RETURNING user_id
      ),
      bot AS (
        INSERT INTO bot_settings (
          user_id,
          is_active,
          notify_trade_executions,
          notify_risk_warnings,
          notify_daily_pnl,
          exchange_name,
          trading_mode,
          api_key,
          api_secret,
          api_passphrase,
          strategy,
          max_drawdown_percent,
          risk_per_trade_percent,
          stop_loss_enabled,
          trailing_take_profit,
          emergency_stop_volatility
        )
        SELECT
          inserted.id,
          false,
          pending.notify_trade_executions,
          pending.notify_risk_warnings,
          pending.notify_daily_pnl,
          pending.exchange_name,
          pending.trading_mode,
          pending.api_key,
          pending.api_secret,
          pending.api_passphrase,
          pending.strategy,
          pending.max_drawdown_percent,
          pending.risk_per_trade_percent,
          pending.stop_loss_enabled,
          pending.trailing_take_profit,
          pending.emergency_stop_volatility
        FROM inserted
        JOIN pending ON true
        RETURNING user_id
      ),
      removed AS (
        DELETE FROM pending_signups
        WHERE id IN (SELECT id FROM pending)
          AND EXISTS (SELECT 1 FROM inserted)
          AND EXISTS (SELECT 1 FROM sub)
          AND EXISTS (SELECT 1 FROM bot)
        RETURNING id
      )
      SELECT
        (SELECT reason FROM blocked) AS reason,
        (SELECT id::text FROM inserted) AS user_id,
        (SELECT session_version FROM inserted) AS session_version,
        (SELECT count(*) FROM removed) AS removed_count
    `
  } catch (error) {
    if (postgresCode(error) === "23505") {
      return { ok: false, error: "An account with this email already exists.", code: "taken", status: 409 }
    }
    throw error
  }

  const reason = typeof rows[0]?.reason === "string" ? rows[0].reason : "missing"
  const userId = typeof rows[0]?.user_id === "string" ? rows[0].user_id : ""
  const sessionVersion = Number(rows[0]?.session_version)
  if (reason === "email" || reason === "phone" || reason === "telegram") {
    return { ok: false, error: "An account with this email already exists.", code: "taken", status: 409 }
  }
  if (reason === "incomplete") {
    return { ok: false, error: "Finish your profile before opening the dashboard.", status: 401 }
  }
  if (reason !== "ok" || !userId || !Number.isInteger(sessionVersion)) {
    return { ok: false, error: "Your signup session expired. Start again.", code: "expired", status: 401 }
  }

  await sql`DELETE FROM pending_signups WHERE id = ${pendingId}::uuid`
  await setSessionCookie(userId, sessionVersion)
  await clearSignupCookie()
  await maybeSendWelcome(userId)
  return { ok: true }
}
