export type CheckoutMode = "trial" | "past_due" | "canceled" | "blocked"

export function checkoutMode(accountStatus: string, subscriptionStatus: string | null): CheckoutMode {
  if (subscriptionStatus === "past_due") return "past_due"
  if (subscriptionStatus === "canceled") return "canceled"
  if (
    subscriptionStatus === "unpaid" ||
    subscriptionStatus === "paused" ||
    subscriptionStatus === "incomplete_expired" ||
    (!subscriptionStatus && accountStatus === "active")
  ) {
    return "blocked"
  }
  return "trial"
}
