import type Stripe from "stripe"

import { getStripe } from "@/lib/stripe"
import {
  claimStripeEvent,
  findUserIdByCustomer,
  logTrialReminder,
  markSubscriptionPastDue,
  releaseStripeEvent,
  upsertSubscriptionFromStripe,
} from "@/lib/subscriptions"

function customerIdOf(customer: string | { id: string } | null | undefined) {
  if (!customer) return null
  return typeof customer === "string" ? customer : customer.id
}

function subscriptionIdOf(subscription: string | { id: string } | null | undefined) {
  if (!subscription) return null
  return typeof subscription === "string" ? subscription : subscription.id
}

async function userIdForSubscription(subscription: Stripe.Subscription) {
  const fromMetadata = subscription.metadata.user_id
  if (fromMetadata) return fromMetadata
  return findUserIdByCustomer(customerIdOf(subscription.customer) ?? "")
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const userId = await userIdForSubscription(subscription)
  if (!userId) return
  await upsertSubscriptionFromStripe(userId, subscription)
  return userId
}

async function handleEvent(event: Stripe.Event) {
  const stripe = getStripe()

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object)
      return
    }
    case "customer.subscription.trial_will_end": {
      const userId = await syncSubscription(event.data.object)
      if (userId) await logTrialReminder(userId)
      return
    }
    case "invoice.payment_succeeded": {
      const subscriptionId = subscriptionIdOf(event.data.object.parent?.subscription_details?.subscription)
      if (!subscriptionId) return
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await syncSubscription(subscription)
      return
    }
    case "setup_intent.succeeded": {
      const intent = event.data.object
      const customerId = customerIdOf(intent.customer)
      if (!customerId) return
      const userId = await findUserIdByCustomer(customerId)
      if (!userId) return
      const listed = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 5 })
      const match =
        listed.data.find((item) => item.status === "trialing" || item.status === "active" || item.status === "incomplete") ??
        listed.data[0]
      if (!match) return
      const subscription = await stripe.subscriptions.retrieve(match.id, { expand: ["pending_setup_intent"] })
      await upsertSubscriptionFromStripe(userId, subscription)
      return
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object
      await markSubscriptionPastDue({
        subscriptionId: subscriptionIdOf(invoice.parent?.subscription_details?.subscription),
        customerId: customerIdOf(invoice.customer),
      })
      return
    }
    default:
      return
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !secret) {
    return Response.json({ error: "Missing signature." }, { status: 400 })
  }

  const body = await request.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret)
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 })
  }

  const claimed = await claimStripeEvent(event.id, event.type)
  if (!claimed) return Response.json({ received: true })

  try {
    await handleEvent(event)
  } catch {
    await releaseStripeEvent(event.id)
    return Response.json({ error: "Webhook handler failed." }, { status: 500 })
  }

  return Response.json({ received: true })
}
