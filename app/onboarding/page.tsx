import type { Metadata } from "next"

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export const metadata: Metadata = {
  title: "Create your account · Tradelyt",
  description: "Create your Tradelyt account. Your details stay in this browser until you leave.",
}

export default function OnboardingPage() {
  return <OnboardingWizard />
}
