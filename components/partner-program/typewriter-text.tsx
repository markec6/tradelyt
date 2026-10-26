"use client"

import { useEffect, useState } from "react"
import { WELCOME_WORDS, WORD_MS } from "./data"

export function TypewriterText() {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const origin = Date.now()
    const id = window.setInterval(() => {
      const count = Math.min(WELCOME_WORDS.length, Math.floor((Date.now() - origin) / WORD_MS) + 1)
      setShown((current) => (current === count ? current : count))
      if (count >= WELCOME_WORDS.length) window.clearInterval(id)
    }, 40)

    return () => window.clearInterval(id)
  }, [])

  const text = WELCOME_WORDS.slice(0, shown).join(" ")
  const typing = shown < WELCOME_WORDS.length

  return (
    <p className="text-[12px] leading-relaxed text-slate-100">
      {text}
      {typing && (
        <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-emerald-400 align-middle" aria-hidden="true" />
      )}
    </p>
  )
}
