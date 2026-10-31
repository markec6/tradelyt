import Stripe from "stripe"

const API_VERSION = "2026-10-28.endive"

let client: Stripe | null = null

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set")
  if (!client) {
    client = new Stripe(key, { apiVersion: API_VERSION, typescript: true })
  }
  return client
}

export function getPriceId() {
  const priceId = process.env.STRIPE_PRICE_ID
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not set")
  return priceId
}

export function cardIsSaved(subscription: Stripe.Subscription) {
  if (subscription.default_payment_method) return true
  const intent = subscription.pending_setup_intent
  return typeof intent === "object" && intent !== null && intent.status === "succeeded"
}

export function setupClientSecret(subscription: Stripe.Subscription) {
  const intent = subscription.pending_setup_intent
  if (!intent || typeof intent === "string") return null
  if (intent.status === "succeeded") return null
  return intent.client_secret
}
