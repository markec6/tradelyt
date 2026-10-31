import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { OnboardingProvider } from "@/components/onboarding/onboarding-context"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"
import { readActorUserId, readUserIdFromCookies } from "@/lib/session-store"
import { loadOnboardingResume } from "@/lib/onboarding-resume"
import { cardConfirmed, getBillingAccount } from "@/lib/subscriptions"

export const metadata: Metadata = {
  title: "Create your account · Tradelyt",
  description: "Create your Tradelyt account.",
}

export default async function OnboardingPage() {
  const durableUserId = await readUserIdFromCookies()
  if (durableUserId) {
    const account = await getBillingAccount(durableUserId)
    if (account && (await cardConfirmed(account))) redirect("/dashboard")
  }

  const userId = durableUserId ?? (await readActorUserId())
  const resume = userId ? await loadOnboardingResume(userId) : null

  return (
    <OnboardingProvider initialUserId={userId}>
      <OnboardingWizard resume={resume} />
    </OnboardingProvider>
  )
}
