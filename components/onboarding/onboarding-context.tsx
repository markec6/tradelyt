"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

type OnboardingContextValue = {
  userId: string | null
  setUserId: (userId: string | null) => void
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const value = useMemo(() => ({ userId, setUserId }), [userId])

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const value = useContext(OnboardingContext)
  if (!value) {
    throw new Error("useOnboarding must be used within OnboardingProvider")
  }
  return value
}
