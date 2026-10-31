import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { CheckoutScreen } from "@/components/checkout/checkout-screen"
import { checkoutMode } from "@/components/checkout/mode"
import { readActorUserId, readUserIdFromCookies } from "@/lib/session-store"
import { cardConfirmed, getBillingAccount } from "@/lib/subscriptions"

export const metadata: Metadata = {
  title: "Start your free trial · Tradelyt",
  description: "Start Tradelyt Pro. Seven days free, then $49 a month.",
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ activation?: string }>
}) {
  const params = await searchParams
  const durableUserId = await readUserIdFromCookies()
  const userId = durableUserId ?? (await readActorUserId())
  if (!userId) redirect("/onboarding")

  const account = await getBillingAccount(userId)
  if (!account) redirect("/onboarding")
  if (durableUserId && (await cardConfirmed(account))) redirect("/dashboard")
  if (!durableUserId && params.activation !== "failed" && params.activation !== "pending" && (await cardConfirmed(account))) {
    redirect("/api/activate-session")
  }

  const name = `${account.firstName} ${account.lastName}`.trim()
  const mode = checkoutMode(account.accountStatus, account.subscription?.status ?? null)
  const activationError =
    params.activation === "pending"
      ? "Your trial is still confirming. Try again in a moment."
      : params.activation === "failed"
        ? "Finish your trial setup before opening the dashboard."
        : ""
  return (
    <CheckoutScreen
      publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""}
      defaultName={name}
      activationError={activationError}
      mode={mode}
    />
  )
}
