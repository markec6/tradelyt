import Stripe from "stripe"

import { toE164 } from "@/components/onboarding/phone-number"
import { telegramHandleError } from "@/components/onboarding/validate-telegram"
import { getPendingBilling, pendingSubscriptionOpen, recordPendingStripe } from "@/lib/pending-signup"
import { cardIsSaved, getPriceId, getStripe, setupClientSecret } from "@/lib/stripe"

function jsonError(error: string, status: number, code?: string) {
  return Response.json(code ? { error, code } : { error }, { status })
}

function publicStripeError(error: unknown) {
  if (error instanceof Stripe.errors.StripeCardError && error.message) return error.message
  return "Could not start your trial."
}

export async function startPendingCheckout(pendingId: string, request: Request) {
  const billing = await getPendingBilling(pendingId)
  if (!billing) return jsonError("Save your account before starting the trial.", 401)
  if (!billing.telegramReady) return jsonError("Connect Telegram before checkout.", 403, "telegram_required")
  if (!billing.exchangeName) return jsonError("Connect your exchange before checkout.", 403)
  if (!toE164(billing.phoneNumber, billing.country)) return jsonError("Enter a valid phone number.", 400)
  const telegramError = telegramHandleError(billing.telegramUsername)
  if (telegramError) return jsonError(telegramError, 400)
  if (!billing.strategy) return jsonError("Choose a strategy before checkout.", 400)

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

  try {
    const stripe = getStripe()
    const priceId = getPriceId()
    if (billing.stripeSubscriptionId && pendingSubscriptionOpen(billing.stripeStatus)) {
      try {
        const open = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId, {
          expand: ["pending_setup_intent"],
        })
        if (cardIsSaved(open) && (open.status === "trialing" || open.status === "active")) {
          await recordPendingStripe(pendingId, open)
          return jsonError("You already have Tradelyt Pro.", 409, "already_subscribed")
        }
        const clientSecret = setupClientSecret(open)
        if (clientSecret) {
          return Response.json({
            clientSecret,
            subscriptionId: open.id,
            trialEndsAt: open.trial_end ? new Date(open.trial_end * 1000).toISOString() : null,
            status: open.status,
          })
        }
      } catch {
        // The stored subscription is gone. A new one is created below.
      }
    }

    let customerId = billing.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: billing.email,
          name: cardholderName,
          metadata: { pending_signup_id: pendingId },
        },
        { idempotencyKey: `cust:${pendingId}` },
      )
      customerId = customer.id
    }

    const previousId = billing.stripeSubscriptionId
    const idempotencyKey =
      previousId && !pendingSubscriptionOpen(billing.stripeStatus)
        ? `sub:${pendingId}:${priceId}:${previousId}`
        : `sub:${pendingId}:${priceId}`

    const subscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: 7,
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
        metadata: { pending_signup_id: pendingId },
        expand: ["pending_setup_intent"],
      },
      { idempotencyKey },
    )

    await recordPendingStripe(pendingId, subscription)
    if (cardIsSaved(subscription) && (subscription.status === "trialing" || subscription.status === "active")) {
      return jsonError("You already have Tradelyt Pro.", 409, "already_subscribed")
    }
    const clientSecret = setupClientSecret(subscription)
    if (!clientSecret) return jsonError("Could not start your trial.", 502)
    return Response.json({
      clientSecret,
      subscriptionId: subscription.id,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      status: subscription.status,
    })
  } catch (error) {
    return jsonError(publicStripeError(error), 502)
  }
}
