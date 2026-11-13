import { neon } from "@neondatabase/serverless"

import { telegramHandleError } from "@/components/onboarding/validate-telegram"
import { cardIsSaved, getStripe } from "@/lib/stripe"
import { upsertSubscriptionFromStripe } from "@/lib/subscriptions"
import { sendMessage } from "@/lib/telegram"

const REMINDER = (firstName: string) =>
  `Hello ${firstName}, your Tradelyt trial is waiting on a saved card. Open Tradelyt and add a payment method to unlock the platform.`

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

function readyUsername(value: unknown) {
  const username = typeof value === "string" ? value.replace(/^@+/, "") : ""
  return !telegramHandleError(username)
}

export async function sendAbandonedReminders() {
  const sql = database()
  const rows = await sql`
    SELECT
      subscriptions.id,
      subscriptions.user_id,
      subscriptions.stripe_subscription_id,
      users.first_name,
      users.telegram_id::text AS telegram_id,
      users.telegram_username
    FROM subscriptions
    JOIN users ON users.id = subscriptions.user_id
    WHERE subscriptions.status = 'incomplete'
      AND subscriptions.created_at <= now() - interval '1 hour'
      AND subscriptions.reminder_1h_sent_at IS NULL
      AND subscriptions.reminder_1h_attempts < 3
      AND users.telegram_id IS NOT NULL
    ORDER BY subscriptions.created_at
    LIMIT 20
  `

  let sent = 0
  for (const row of rows) {
    if (typeof row.id !== "string" || typeof row.user_id !== "string" || typeof row.stripe_subscription_id !== "string") continue
    const telegramId = typeof row.telegram_id === "string" ? row.telegram_id : ""
    const firstName = typeof row.first_name === "string" ? row.first_name.trim() : ""
    if (!telegramId || !firstName || !readyUsername(row.telegram_username)) continue

    let subscription
    try {
      subscription = await getStripe().subscriptions.retrieve(row.stripe_subscription_id, {
        expand: ["pending_setup_intent"],
      })
    } catch {
      continue
    }
    if (cardIsSaved(subscription) || subscription.status !== "incomplete") {
      await upsertSubscriptionFromStripe(row.user_id, subscription)
      continue
    }

    const claimed = await sql`
      UPDATE subscriptions
      SET reminder_1h_claimed_at = now()
      WHERE id = ${row.id}
        AND status = 'incomplete'
        AND reminder_1h_sent_at IS NULL
        AND reminder_1h_attempts < 3
        AND (reminder_1h_claimed_at IS NULL OR reminder_1h_claimed_at < now() - interval '15 minutes')
      RETURNING id
    `
    if (!claimed[0]) continue

    let delivered = false
    try {
      delivered = (await sendMessage(telegramId, REMINDER(firstName))).ok
    } catch {
      delivered = false
    }
    if (delivered) {
      await sql`
        UPDATE subscriptions
        SET reminder_1h_sent_at = now(), reminder_1h_claimed_at = NULL, updated_at = now()
        WHERE id = ${row.id}
          AND reminder_1h_sent_at IS NULL
      `
      sent += 1
      continue
    }
    await sql`
      UPDATE subscriptions
      SET
        reminder_1h_attempts = reminder_1h_attempts + 1,
        reminder_1h_claimed_at = NULL,
        updated_at = now()
      WHERE id = ${row.id}
        AND reminder_1h_sent_at IS NULL
        AND reminder_1h_attempts < 3
    `
  }
  return sent
}
