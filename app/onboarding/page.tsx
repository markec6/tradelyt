import type { Metadata } from "next"

import { OnboardingProvider } from "@/components/onboarding/onboarding-context"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export const metadata: Metadata = {
  title: "Create your account · Tradelyt",
  description: "Create your Tradelyt account.",
}

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingWizard />
    </OnboardingProvider>
  )
}
