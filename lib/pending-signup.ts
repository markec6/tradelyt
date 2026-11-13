import { neon } from "@neondatabase/serverless"
import type Stripe from "stripe"

import { telegramHandleError } from "@/components/onboarding/validate-telegram"
import { ONBOARDING_MAX_AGE } from "@/lib/session"
import { cardIsSaved, getPriceId, getStripe } from "@/lib/stripe"

const OPEN_STATUSES = new Set(["trialing", "active", "incomplete"])

const STATUSES = new Set([
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
  "incomplete_expired",
])

export type PendingBilling = {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  country: string
  telegramUsername: string
  telegramReady: boolean
  strategy: string | null
  exchangeName: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripeStatus: string | null
  cardSaved: boolean
  expiresAt: string
}

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  return typeof value === "string" ? value : null
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

function priceIdOf(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price.id ?? getPriceId()
}

function customerIdOf(customer: Stripe.Subscription["customer"]) {
  return typeof customer === "string" ? customer : customer.id
}

function dbStatus(status: string) {
  if (STATUSES.has(status)) return status
  throw new Error("Unexpected subscription status")
}

export function signupMaxAge(expiresAt: string) {
  const seconds = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
  if (seconds < 30) return 0
  return Math.min(ONBOARDING_MAX_AGE, seconds)
}

async function cancelStripeSubscription(subscriptionId: string) {
  try {
    await getStripe().subscriptions.cancel(subscriptionId)
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "failed"
    console.error("pending signup cancel", code)
  }
}

export async function releaseExpiredContacts(email: string, phone: string) {
  const sql = database()
  const rows = await sql`
    SELECT id, stripe_subscription_id, stripe_status
    FROM pending_signups
    WHERE expires_at <= now()
      AND (email = ${email} OR phone_number = ${phone})
  `
  for (const row of rows) {
    const subscriptionId = text(row.stripe_subscription_id)
    const status = text(row.stripe_status)
    if (subscriptionId && status !== "canceled" && status !== "incomplete_expired") {
      await cancelStripeSubscription(subscriptionId)
    }
    if (typeof row.id === "string") {
      await sql`DELETE FROM pending_signups WHERE id = ${row.id}::uuid AND expires_at <= now()`
    }
  }
}

export async function takenByUsers(email: string, phone: string) {
  const sql = database()
  const rows = await sql`
    SELECT
      EXISTS (SELECT 1 FROM users WHERE email = ${email}) AS email_taken,
      EXISTS (SELECT 1 FROM users WHERE phone_number = ${phone}) AS phone_taken
  `
  return {
    email: Boolean(rows[0]?.email_taken),
    phone: Boolean(rows[0]?.phone_taken),
  }
}

export async function takenByPending(email: string, phone: string, exceptId: string | null) {
  const sql = database()
  const rows = await sql`
    SELECT email::text AS email, phone_number
    FROM pending_signups
    WHERE expires_at > now()
      AND (${exceptId}::uuid IS NULL OR id <> ${exceptId}::uuid)
      AND (email = ${email} OR phone_number = ${phone})
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return { email: false, phone: false }
  return {
    email: text(row.email).toLowerCase() === email.toLowerCase(),
    phone: text(row.phone_number) === phone,
  }
}

export async function upsertPendingAccount(input: {
  id: string | null
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  country: string
}) {
  const sql = database()
  if (input.id) {
    const updated = await sql`
      UPDATE pending_signups
      SET
        email = ${input.email},
        first_name = ${input.firstName},
        last_name = ${input.lastName},
        phone_number = ${input.phoneNumber},
        country = ${input.country},
        updated_at = now()
      WHERE id = ${input.id}::uuid
        AND expires_at > now()
        AND card_saved = false
      RETURNING id, expires_at
    `
    const row = updated[0]
    const expiresAt = iso(row?.expires_at)
    if (!row?.id || !expiresAt) return null
    return { id: String(row.id), expiresAt }
  }

  const inserted = await sql`
    INSERT INTO pending_signups (
      email,
      first_name,
      last_name,
      phone_number,
      country,
      expires_at
    )
    VALUES (
      ${input.email},
      ${input.firstName},
      ${input.lastName},
      ${input.phoneNumber},
      ${input.country},
      now() + interval '2 hours'
    )
    RETURNING id, expires_at
  `
  const row = inserted[0]
  const expiresAt = iso(row?.expires_at)
  if (!row?.id || !expiresAt) return null
  return { id: String(row.id), expiresAt }
}

export async function deleteUnpaidPending(id: string) {
  const sql = database()
  await sql`
    DELETE FROM pending_signups
    WHERE id = ${id}::uuid
      AND card_saved = false
      AND stripe_subscription_id IS NULL
  `
}

export async function pendingCardSaved(id: string) {
  const sql = database()
  const rows = await sql`
    SELECT card_saved
    FROM pending_signups
    WHERE id = ${id}::uuid
      AND expires_at > now()
    LIMIT 1
  `
  return Boolean(rows[0]?.card_saved)
}

export async function savePendingTelegram(
  id: string,
  flags: { tradeExecutions: boolean; riskWarnings: boolean; dailyPnl: boolean },
) {
  const sql = database()
  const rows = await sql`
    UPDATE pending_signups
    SET
      notify_trade_executions = ${flags.tradeExecutions},
      notify_risk_warnings = ${flags.riskWarnings},
      notify_daily_pnl = ${flags.dailyPnl},
      telegram_prompted = true,
      updated_at = now()
    WHERE id = ${id}::uuid
      AND expires_at > now()
      AND card_saved = false
    RETURNING id
  `
  return Boolean(rows[0]?.id)
}

export async function savePendingExchange(
  id: string,
  exchange: {
    name: string
    mode: string
    apiKey: string | null
    apiSecret: string | null
    apiPassphrase: string | null
  },
) {
  const sql = database()
  const rows = await sql`
    UPDATE pending_signups
    SET
      exchange_name = ${exchange.name},
      trading_mode = ${exchange.mode},
      api_key = ${exchange.apiKey},
      api_secret = ${exchange.apiSecret},
      api_passphrase = ${exchange.apiPassphrase},
      updated_at = now()
    WHERE id = ${id}::uuid
      AND expires_at > now()
      AND card_saved = false
    RETURNING id
  `
  return Boolean(rows[0]?.id)
}

export async function savePendingRisk(
  id: string,
  risk: {
    strategy: string
    maxDrawdown: string
    riskPerTrade: string
    stopLoss: boolean
    trailingTakeProfit: boolean
    emergencyStop: boolean
  },
) {
  const sql = database()
  const rows = await sql`
    UPDATE pending_signups
    SET
      strategy = ${risk.strategy},
      max_drawdown_percent = ${risk.maxDrawdown}::numeric,
      risk_per_trade_percent = ${risk.riskPerTrade}::numeric,
      stop_loss_enabled = ${risk.stopLoss},
      trailing_take_profit = ${risk.trailingTakeProfit},
      emergency_stop_volatility = ${risk.emergencyStop},
      updated_at = now()
    WHERE id = ${id}::uuid
      AND expires_at > now()
      AND card_saved = false
    RETURNING id
  `
  return Boolean(rows[0]?.id)
}

export async function pendingReadyForCheckout(id: string) {
  const billing = await getPendingBilling(id)
  if (!billing) return { ok: false as const, error: "Save your account before launching." }
  if (!billing.phoneNumber) return { ok: false as const, error: "Add your phone number and Telegram before checkout." }
  if (!billing.telegramReady) return { ok: false as const, error: "Connect Telegram before checkout." }
  if (!billing.exchangeName) return { ok: false as const, error: "Connect your exchange before checkout." }
  if (!billing.strategy) return { ok: false as const, error: "Choose a strategy before checkout." }
  return { ok: true as const }
}

export async function getPendingBilling(id: string): Promise<PendingBilling | null> {
  const sql = database()
  const rows = await sql`
    SELECT
      id,
      email::text AS email,
      first_name,
      last_name,
      phone_number,
      country,
      telegram_id::text AS telegram_id,
      telegram_username,
      exchange_name,
      strategy,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_status,
      card_saved,
      expires_at
    FROM pending_signups
    WHERE id = ${id}::uuid
      AND expires_at > now()
    LIMIT 1
  `
  const row = rows[0]
  const expiresAt = iso(row?.expires_at)
  const email = text(row?.email)
  const firstName = text(row?.first_name)
  const lastName = text(row?.last_name)
  if (!row?.id || !expiresAt || !email || !firstName || !lastName) return null
  const username = text(row.telegram_username).replace(/^@+/, "")
  const telegramId = text(row.telegram_id)
  return {
    id: String(row.id),
    email,
    firstName,
    lastName,
    phoneNumber: text(row.phone_number),
    country: text(row.country),
    telegramUsername: username,
    telegramReady: telegramId.length > 0 && !telegramHandleError(username),
    strategy: text(row.strategy) || null,
    exchangeName: text(row.exchange_name) || null,
    stripeCustomerId: text(row.stripe_customer_id) || null,
    stripeSubscriptionId: text(row.stripe_subscription_id) || null,
    stripeStatus: text(row.stripe_status) || null,
    cardSaved: Boolean(row.card_saved),
    expiresAt,
  }
}

export function pendingSubscriptionOpen(status: string | null) {
  return status !== null && OPEN_STATUSES.has(status)
}

export async function recordPendingStripe(pendingId: string, subscription: Stripe.Subscription) {
  const status = dbStatus(subscription.status)
  const saved = cardIsSaved(subscription) && (status === "trialing" || status === "active")
  const customerId = customerIdOf(subscription.customer)
  const trialEndsAt = fromUnix(subscription.trial_end)
  const periodEnd = fromUnix(currentPeriodEnd(subscription))
  const canceledAt = fromUnix(subscription.canceled_at)
  const sql = database()
  await sql`
    UPDATE pending_signups
    SET
      stripe_customer_id = ${customerId},
      stripe_subscription_id = ${subscription.id},
      stripe_status = ${status},
      stripe_price_id = ${priceIdOf(subscription)},
      trial_ends_at = ${trialEndsAt}::timestamptz,
      current_period_end = ${periodEnd}::timestamptz,
      cancel_at_period_end = ${subscription.cancel_at_period_end},
      canceled_at = ${canceledAt}::timestamptz,
      stripe_linked_at = COALESCE(stripe_linked_at, now()),
      card_saved = ${saved},
      card_saved_at = CASE
        WHEN ${saved}
          THEN CASE
            WHEN stripe_subscription_id IS DISTINCT FROM ${subscription.id} THEN now()
            ELSE COALESCE(card_saved_at, now())
          END
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = ${pendingId}::uuid
      AND expires_at > now()
      AND (
        stripe_subscription_id IS NULL
        OR stripe_subscription_id = ${subscription.id}
        OR stripe_status IN ('canceled', 'incomplete_expired', 'unpaid')
      )
  `
}

export async function findPendingIdByCustomer(customerId: string) {
  if (!customerId) return null
  const sql = database()
  const rows = await sql`
    SELECT id
    FROM pending_signups
    WHERE stripe_customer_id = ${customerId}
      AND expires_at > now()
    LIMIT 1
  `
  return typeof rows[0]?.id === "string" ? rows[0].id : null
}

export async function cancelStalePendingCheckouts() {
  const sql = database()
  const rows = await sql`
    SELECT id, stripe_subscription_id
    FROM pending_signups
    WHERE card_saved = true
      AND stripe_status IN ('trialing', 'active')
      AND card_saved_at <= now() - interval '15 minutes'
      AND stripe_subscription_id IS NOT NULL
      AND expires_at > now()
    ORDER BY card_saved_at
    LIMIT 20
  `
  let canceled = 0
  for (const row of rows) {
    const subscriptionId = text(row.stripe_subscription_id)
    if (!subscriptionId || typeof row.id !== "string") continue
    await cancelStripeSubscription(subscriptionId)
    const updated = await sql`
      UPDATE pending_signups
      SET
        stripe_status = 'canceled',
        card_saved = false,
        card_saved_at = NULL,
        canceled_at = now(),
        updated_at = now()
      WHERE id = ${row.id}::uuid
        AND stripe_subscription_id = ${subscriptionId}
        AND card_saved = true
      RETURNING id
    `
    if (updated[0]?.id) canceled += 1
  }
  return canceled
}

export async function deleteExpiredPendingSignups() {
  const sql = database()
  const rows = await sql`
    SELECT id, stripe_subscription_id, stripe_status
    FROM pending_signups
    WHERE expires_at <= now()
    ORDER BY expires_at
    LIMIT 20
  `
  let deleted = 0
  for (const row of rows) {
    const subscriptionId = text(row.stripe_subscription_id)
    const status = text(row.stripe_status)
    if (subscriptionId && status !== "canceled" && status !== "incomplete_expired") {
      await cancelStripeSubscription(subscriptionId)
    }
    if (typeof row.id !== "string") continue
    const removed = await sql`
      DELETE FROM pending_signups
      WHERE id = ${row.id}::uuid
        AND expires_at <= now()
      RETURNING id
    `
    if (removed[0]?.id) deleted += 1
  }
  return deleted
}
