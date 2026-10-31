import Stripe from "stripe"

import { readActorUserId } from "@/lib/session-store"
import { getStripe } from "@/lib/stripe"
import { cardConfirmed, getBillingAccount } from "@/lib/subscriptions"

function jsonError(error: string, status: number, code?: string) {
  return Response.json(code ? { error, code } : { error }, { status })
}

export async function POST() {
  const userId = await readActorUserId()
  if (!userId) return jsonError("Could not renew your subscription.", 401)

  const account = await getBillingAccount(userId)
  const subscription = account?.subscription
  if (!account || !subscription || account.accountStatus === "suspended" || account.accountStatus === "deleted") {
    return jsonError("Could not renew your subscription.", 401)
  }
  if (subscription.status === "trialing" || subscription.status === "active") {
    if (await cardConfirmed(account)) return jsonError("You already have Tradelyt Pro.", 409, "already_subscribed")
  }
  if (subscription.status !== "past_due") return jsonError("Could not renew your subscription.", 401)

  try {
    const stripe = getStripe()
    const listed = await stripe.invoices.list({
      subscription: subscription.stripeSubscriptionId,
      status: "open",
      limit: 1,
    })
    const invoiceId = listed.data[0]?.id
    if (!invoiceId) return jsonError("Could not renew your subscription.", 409)
    const invoice = await stripe.invoices.retrieve(invoiceId, { expand: ["confirmation_secret"] })
    const clientSecret = invoice.confirmation_secret?.client_secret
    if (!clientSecret) return jsonError("Could not renew your subscription.", 502)
    return Response.json({ clientSecret })
  } catch (error) {
    if (error instanceof Stripe.errors.StripeCardError && error.message) {
      return jsonError(error.message, 402)
    }
    return jsonError("Could not renew your subscription.", 502)
  }
}
