"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const SCENARIO_COUNT = 3
const SCENARIO_MS = 3500

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReducedMotion(media.matches)
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])

  return reducedMotion
}

export function useShowcasePlayback() {
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const reducedMotion = useReducedMotion()
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const arm = useCallback(
    (delay: number) => {
      clearTimer()
      timerRef.current = window.setTimeout(() => {
        setScenarioIndex((index) => (index + 1) % SCENARIO_COUNT)
        arm(SCENARIO_MS)
      }, Math.max(0, delay))
    },
    [clearTimer],
  )

  useEffect(() => {
    arm(SCENARIO_MS)
    return clearTimer
  }, [arm, clearTimer])

  const selectScenario = useCallback(
    (index: number) => {
      setScenarioIndex(index)
      arm(SCENARIO_MS)
    },
    [arm],
  )

  return { scenarioIndex, reducedMotion, selectScenario }
}
