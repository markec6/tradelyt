"use client"

import { useCallback, useEffect, useRef, useState } from "react"

const SCENARIO_COUNT = 3
const SCENARIO_MS = 5000

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
  const [paused, setPaused] = useState(false)
  const reducedMotion = useReducedMotion()
  const pausedRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef(0)
  const delayRef = useRef(SCENARIO_MS)
  const remainingRef = useRef(SCENARIO_MS)

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const arm = useCallback(
    (delay: number) => {
      clearTimer()
      const wait = Math.max(0, delay)
      delayRef.current = wait
      startedAtRef.current = Date.now()
      timerRef.current = window.setTimeout(() => {
        setScenarioIndex((index) => (index + 1) % SCENARIO_COUNT)
        if (!pausedRef.current) arm(SCENARIO_MS)
      }, wait)
    },
    [clearTimer],
  )

  useEffect(() => {
    arm(SCENARIO_MS)
    return clearTimer
  }, [arm, clearTimer])

  const pause = useCallback(() => {
    if (pausedRef.current) return
    const elapsed = Date.now() - startedAtRef.current
    remainingRef.current = Math.max(0, delayRef.current - elapsed)
    pausedRef.current = true
    setPaused(true)
    clearTimer()
  }, [clearTimer])

  const resume = useCallback(() => {
    if (!pausedRef.current) return
    pausedRef.current = false
    setPaused(false)
    arm(remainingRef.current)
  }, [arm])

  const selectScenario = useCallback(
    (index: number) => {
      setScenarioIndex(index)
      remainingRef.current = SCENARIO_MS
      delayRef.current = SCENARIO_MS
      if (!pausedRef.current) arm(SCENARIO_MS)
    },
    [arm],
  )

  return { scenarioIndex, paused, reducedMotion, pause, resume, selectScenario }
}
