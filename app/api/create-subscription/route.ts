import Stripe from "stripe"

import { readActorUserId } from "@/lib/session-store"
import { cardIsSaved, getPriceId, getStripe, setupClientSecret } from "@/lib/stripe"
import { getBillingAccount, upsertSubscriptionFromStripe, type BillingAccount } from "@/lib/subscriptions"
import { toE164 } from "@/components/onboarding/phone-number"
import { telegramHandleError } from "@/components/onboarding/validate-telegram"
import { neon } from "@neondatabase/serverless"

const OPEN_STATUSES = new Set(["trialing", "active", "incomplete"])

function jsonError(error: string, status: number, code?: string) {
  return Response.json(code ? { error, code } : { error }, { status })
}

function publicStripeError(error: unknown) {
  if (error instanceof Stripe.errors.StripeCardError && error.message) return error.message
  return "Could not start your trial."
}

async function reuseOpenSubscription(account: BillingAccount) {
  const stored = account.subscription
  if (!stored || !OPEN_STATUSES.has(stored.status)) return null
  let subscription: Stripe.Subscription
  try {
    subscription = await getStripe().subscriptions.retrieve(stored.stripeSubscriptionId, {
      expand: ["pending_setup_intent"],
    })
  } catch {
    return null
  }
  if (cardIsSaved(subscription) && (subscription.status === "trialing" || subscription.status === "active")) {
    await upsertSubscriptionFromStripe(account.userId, subscription)
    return jsonError("You already have Tradelyt Pro.", 409, "already_subscribed")
  }
  const clientSecret = setupClientSecret(subscription)
  if (!clientSecret) return null
  return Response.json({
    clientSecret,
    subscriptionId: subscription.id,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    status: subscription.status,
  })
}

export async function POST(request: Request) {
  const userId = await readActorUserId()
  if (!userId) return jsonError("Save your account before starting the trial.", 401)

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return jsonError("Could not start your trial.", 500)
  const sql = neon(databaseUrl)
  const profiles = await sql`
    SELECT account_status, phone_number, telegram_username, country
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `
  const profile = profiles[0]
  if (!profile || profile.account_status === "suspended" || profile.account_status === "deleted") {
    return jsonError("Save your account before starting the trial.", 401)
  }

  let cardholderName = ""
  try {
    const body: unknown = await request.json()
    if (body && typeof body === "object" && "cardholderName" in body && typeof body.cardholderName === "string") {
      cardholderName = body.cardholderName.trim()
    }
  } catch {
    return jsonError("Enter the name on the card.", 400)
  }
  if (cardholderName.length < 2 || cardholderName.length > 80) {
    return jsonError("Enter the name on the card.", 400)
  }

  const account = await getBillingAccount(userId)
  if (!account) return jsonError("Save your account before starting the trial.", 401)

  try {
    const stripe = getStripe()
    const priceId = getPriceId()
    const reusable = await reuseOpenSubscription(account)
    if (reusable) return reusable

    if (profile.account_status !== "pending") {
      return jsonError("Save your account before starting the trial.", 401)
    }
    if (account.subscription && !OPEN_STATUSES.has(account.subscription.status)) {
      return jsonError("Could not start your trial.", 401)
    }

    const country = typeof profile.country === "string" ? profile.country.trim() : ""
    const phone = typeof profile.phone_number === "string" ? profile.phone_number : ""
    const telegram = typeof profile.telegram_username === "string" ? profile.telegram_username.replace(/^@+/, "") : ""
    if (!toE164(phone, country)) return jsonError("Enter a valid phone number.", 400)
    if (telegramHandleError(telegram)) return jsonError("Enter your Telegram username.", 400)

    let customerId = account.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: account.email,
          name: cardholderName,
          metadata: { user_id: userId },
        },
        { idempotencyKey: `cust:${userId}` },
      )
      customerId = customer.id
    }

    const previousId = account.subscription?.stripeSubscriptionId
    const idempotencyKey =
      previousId && !OPEN_STATUSES.has(account.subscription?.status ?? "")
        ? `sub:${userId}:${priceId}:${previousId}`
        : `sub:${userId}:${priceId}`

    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: 7,
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        metadata: { user_id: userId },
        expand: ["pending_setup_intent"],
      },
      { idempotencyKey },
    )

    const saved = await upsertSubscriptionFromStripe(userId, subscription)
    if (cardIsSaved(subscription)) {
      return jsonError("You already have Tradelyt Pro.", 409, "already_subscribed")
    }
    const clientSecret = setupClientSecret(subscription)
    if (!clientSecret) return jsonError("Could not start your trial.", 502)
    return Response.json({
      clientSecret,
      subscriptionId: subscription.id,
      trialEndsAt: saved.trialEndsAt,
      status: saved.status,
    })
  } catch (error) {
    return jsonError(publicStripeError(error), 502)
  }
}
