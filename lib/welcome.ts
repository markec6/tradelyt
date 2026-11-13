import { neon } from "@neondatabase/serverless"
import type Stripe from "stripe"

import { telegramHandleError } from "@/components/onboarding/validate-telegram"
import { cardIsSaved, getStripe } from "@/lib/stripe"
import { sendMessage } from "@/lib/telegram"

const WELCOME = (firstName: string) =>
  `Hello ${firstName}, your Tradelyt account is successfully connected and active! Welcome aboard.`

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

function readyUsername(value: unknown) {
  const username = typeof value === "string" ? value.replace(/^@+/, "") : ""
  return !telegramHandleError(username)
}

async function loadSubscription(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId, {
    expand: ["pending_setup_intent"],
  })
}

export async function maybeSendWelcome(userId: string, subscription?: Stripe.Subscription) {
  try {
    const sql = database()
    const rows = await sql`
      SELECT
        first_name,
        telegram_id::text AS telegram_id,
        telegram_username,
        welcome_sent_at,
        (
          SELECT stripe_subscription_id
          FROM subscriptions
          WHERE user_id = users.id
          LIMIT 1
        ) AS stripe_subscription_id
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `
    const row = rows[0]
    if (!row || row.welcome_sent_at) return false
    const telegramId = typeof row.telegram_id === "string" ? row.telegram_id : ""
    const firstName = typeof row.first_name === "string" ? row.first_name.trim() : ""
    if (!telegramId || !firstName || !readyUsername(row.telegram_username)) return false

    const current = subscription ?? (typeof row.stripe_subscription_id === "string" ? await loadSubscription(row.stripe_subscription_id) : null)
    if (!current) return false
    if ((current.status !== "trialing" && current.status !== "active") || !cardIsSaved(current)) return false

    const claimed = await sql`
      UPDATE users
      SET welcome_sent_at = now()
      WHERE id = ${userId}
        AND welcome_sent_at IS NULL
        AND telegram_id IS NOT NULL
      RETURNING welcome_sent_at
    `
    const claimedAt = claimed[0]?.welcome_sent_at
    if (!claimedAt) return false

    let delivered = false
    try {
      delivered = (await sendMessage(telegramId, WELCOME(firstName))).ok
    } catch {
      delivered = false
    }
    if (delivered) return true

    await sql`
      UPDATE users
      SET welcome_sent_at = NULL
      WHERE id = ${userId}
        AND welcome_sent_at = ${claimedAt}
    `
    return false
  } catch {
    return false
  }
}

export async function retryPendingWelcomes() {
  const sql = database()
  const rows = await sql`
    SELECT users.id
    FROM users
    JOIN subscriptions ON subscriptions.user_id = users.id
    WHERE users.welcome_sent_at IS NULL
      AND users.telegram_id IS NOT NULL
      AND subscriptions.status IN ('trialing', 'active')
    ORDER BY subscriptions.updated_at
    LIMIT 20
  `
  let sent = 0
  for (const row of rows) {
    if (typeof row.id !== "string") continue
    if (await maybeSendWelcome(row.id)) sent += 1
  }
  return sent
}
