import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { OnboardingProvider } from "@/components/onboarding/onboarding-context"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"
import { getPendingBilling, signupMaxAge } from "@/lib/pending-signup"
import { verifySession } from "@/lib/session"
import { readActorUserId, readPendingSignupId, readUserIdFromCookies, setOnboardingCookie, setSignupCookie } from "@/lib/session-store"
import { loadOnboardingResume, loadPendingResume } from "@/lib/onboarding-resume"
import { cardConfirmed, getBillingAccount } from "@/lib/subscriptions"

async function rememberSession(write: () => Promise<void>) {
  try {
    await write()
  } catch (error) {
    const digest = error && typeof error === "object" && "digest" in error ? String(error.digest) : ""
    if (digest.startsWith("NEXT_")) throw error
  }
}

export const metadata: Metadata = {
  title: "Create your account · Tradelyt",
  description: "Create your Tradelyt account.",
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string }>
}) {
  const params = await searchParams
  let resumeUserId: string | null = null
  let resumePendingId: string | null = null
  if (params.resume) {
    const claims = verifySession(params.resume)
    if (claims?.kind === "signup") {
      const billing = await getPendingBilling(claims.sub)
      const maxAge = billing ? signupMaxAge(billing.expiresAt) : 0
      if (billing && maxAge) {
        resumePendingId = billing.id
        await rememberSession(() => setSignupCookie(billing.id, maxAge))
      }
    } else if (claims?.kind === "onboarding") {
      resumeUserId = claims.sub
      await rememberSession(() => setOnboardingCookie(claims.sub, claims.ver))
    }
  }

  const durableUserId = await readUserIdFromCookies()
  if (durableUserId) {
    const account = await getBillingAccount(durableUserId)
    if (account && (await cardConfirmed(account))) redirect("/dashboard")
  }

  const userId = durableUserId ?? (await readActorUserId()) ?? resumeUserId
  const pendingId = userId ? null : ((await readPendingSignupId()) ?? resumePendingId)
  const resume = userId ? await loadOnboardingResume(userId) : pendingId ? await loadPendingResume(pendingId) : null

  return (
    <OnboardingProvider initialUserId={userId ?? pendingId}>
      <OnboardingWizard resume={resume} />
    </OnboardingProvider>
  )
}
