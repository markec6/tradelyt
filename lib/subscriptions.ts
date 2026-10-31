import { neon } from "@neondatabase/serverless"
import type Stripe from "stripe"

import { getPriceId, getStripe, cardIsSaved } from "@/lib/stripe"

const SUBSCRIPTION_STATUSES = [
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
  "incomplete_expired",
] as const

type DbStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export type StoredSubscription = {
  stripeSubscriptionId: string
  status: string
  trialEndsAt: string | null
  currentPeriodEnd: string | null
}

export type BillingAccount = {
  userId: string
  email: string
  firstName: string
  lastName: string
  accountStatus: string
  stripeCustomerId: string | null
  subscription: StoredSubscription | null
}

export type DashboardAccess = {
  status: "trialing" | "active"
  trialEndsAt: string | null
  currentPeriodEnd: string | null
}

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

function text(value: unknown) {
  return typeof value === "string" ? value : null
}

function timestamp(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  return text(value)
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

function dbStatus(status: string): DbStatus {
  if ((SUBSCRIPTION_STATUSES as readonly string[]).includes(status)) return status as DbStatus
  throw new Error("Unexpected subscription status")
}

export async function getBillingAccount(userId: string): Promise<BillingAccount | null> {
  const sql = database()
  const rows = await sql`
    SELECT
      u.email::text AS email,
      u.first_name,
      u.last_name,
      u.account_status,
      s.stripe_customer_id,
      s.stripe_subscription_id,
      s.status,
      s.trial_ends_at,
      s.current_period_end
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE u.id = ${userId}
  `
  const row = rows[0]
  if (!row) return null
  const email = text(row.email)
  const firstName = text(row.first_name)
  const lastName = text(row.last_name)
  if (!email || !firstName || !lastName) return null
  const stripeSubscriptionId = text(row.stripe_subscription_id)
  return {
    userId,
    email,
    firstName,
    lastName,
    accountStatus: text(row.account_status) ?? "pending",
    stripeCustomerId: text(row.stripe_customer_id),
    subscription: stripeSubscriptionId
      ? {
          stripeSubscriptionId,
          status: text(row.status) ?? "incomplete",
          trialEndsAt: timestamp(row.trial_ends_at),
          currentPeriodEnd: timestamp(row.current_period_end),
        }
      : null,
  }
}

export async function cardConnected(userId: string) {
  const account = await getBillingAccount(userId)
  const stored = account?.subscription
  if (!stored) return false
  if (stored.status === "active") return true
  try {
    const subscription = await getStripe().subscriptions.retrieve(stored.stripeSubscriptionId, {
      expand: ["pending_setup_intent"],
    })
    return cardIsSaved(subscription)
  } catch {
    return false
  }
}

export async function enableBot(userId: string) {
  const sql = database()
  await sql`
    UPDATE bot_settings
    SET is_active = true, updated_at = now()
    WHERE user_id = ${userId}
      AND EXISTS (
        SELECT 1 FROM users
        WHERE id = ${userId}
          AND account_status = 'active'
      )
  `
}

export async function subscriptionIdForUser(userId: string) {
  const sql = database()
  const rows = await sql`SELECT id FROM subscriptions WHERE user_id = ${userId} LIMIT 1`
  return text(rows[0]?.id)
}

export async function findUserIdByCustomer(customerId: string) {
  const sql = database()
  const subscriptions = await sql`
    SELECT user_id FROM subscriptions WHERE stripe_customer_id = ${customerId} LIMIT 1
  `
  return text(subscriptions[0]?.user_id)
}

export async function upsertSubscriptionFromStripe(userId: string, subscription: Stripe.Subscription) {
  const status = dbStatus(subscription.status)
  const trialEndsAt = fromUnix(subscription.trial_end)
  const periodEnd = fromUnix(currentPeriodEnd(subscription))
  const canceledAt = fromUnix(subscription.canceled_at)
  const customerId = customerIdOf(subscription.customer)
  const sql = database()
  const statements = [
    sql`
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
      VALUES (
        ${userId},
        ${customerId},
        ${subscription.id},
        ${status},
        ${priceIdOf(subscription)},
        ${trialEndsAt}::timestamptz,
        ${periodEnd}::timestamptz,
        ${subscription.cancel_at_period_end},
        ${canceledAt}::timestamptz,
        now()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        status = EXCLUDED.status,
        price_id = EXCLUDED.price_id,
        trial_ends_at = EXCLUDED.trial_ends_at,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        canceled_at = EXCLUDED.canceled_at,
        updated_at = now()
    `,
  ]
  if ((status === "trialing" || status === "active") && cardIsSaved(subscription)) {
    statements.push(sql`
      WITH promoted AS (
        UPDATE users
        SET account_status = 'active', updated_at = now()
        WHERE id = ${userId}
          AND account_status = 'pending'
          AND phone_number IS NOT NULL
          AND telegram_username IS NOT NULL
        RETURNING id
      )
      UPDATE bot_settings
      SET is_active = true, updated_at = now()
      WHERE user_id IN (SELECT id FROM promoted)
    `)
  }
  await sql.transaction(statements)
  return { status, trialEndsAt, currentPeriodEnd: periodEnd }
}

export async function markSubscriptionPastDue(input: { subscriptionId?: string | null; customerId?: string | null }) {
  const sql = database()
  if (input.subscriptionId) {
    await sql`
      UPDATE subscriptions
      SET status = 'past_due', updated_at = now()
      WHERE stripe_subscription_id = ${input.subscriptionId}
    `
    return
  }
  if (!input.customerId) return
  await sql`
    UPDATE subscriptions
    SET status = 'past_due', updated_at = now()
    WHERE stripe_customer_id = ${input.customerId}
  `
}

export async function logTrialReminder(userId: string) {
  const sql = database()
  await sql`
    INSERT INTO notifications_log (user_id, notification_type, message_content)
    VALUES (
      ${userId},
      'system',
      'Your Tradelyt Pro trial ends in about 3 days. After that, the plan is $49/mo.'
    )
  `
}

export async function claimStripeEvent(id: string, type: string) {
  const sql = database()
  const rows = await sql`
    INSERT INTO stripe_events (id, type)
    VALUES (${id}, ${type})
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `
  return rows.length > 0
}

export async function releaseStripeEvent(id: string) {
  const sql = database()
  await sql`DELETE FROM stripe_events WHERE id = ${id}`
}

export async function cardConfirmed(account: BillingAccount) {
  const subscription = account.subscription
  if (!subscription) return false
  if (subscription.status !== "trialing" && subscription.status !== "active") return false
  try {
    const stripeSubscription = await getStripe().subscriptions.retrieve(subscription.stripeSubscriptionId, {
      expand: ["pending_setup_intent"],
    })
    return cardIsSaved(stripeSubscription)
  } catch {
    return subscription.status === "active"
  }
}

export async function getDashboardAccess(userId: string): Promise<DashboardAccess | null> {
  const account = await getBillingAccount(userId)
  if (!account?.subscription) return null
  const status = account.subscription.status
  if (status !== "trialing" && status !== "active") return null
  if (!(await cardConfirmed(account))) return null
  return {
    status,
    trialEndsAt: account.subscription.trialEndsAt,
    currentPeriodEnd: account.subscription.currentPeriodEnd,
  }
}
