"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CHAT_PHASE_MS, STATS_MS } from "./data"
import { DisciplineStatsScreen } from "./discipline-stats-screen"
import { MiniLandingScreen } from "./mini-landing-screen"
import { PhoneFrame } from "./phone-frame"
import { TelegramChatScreen } from "./telegram-chat-screen"
import { TelegramToast } from "./telegram-toast"

type ScreenPhase = "landing" | "toast" | "chat" | "stats"

const PHASE_MS: Record<ScreenPhase, number> = {
  landing: 2000,
  toast: 1500,
  chat: CHAT_PHASE_MS,
  stats: STATS_MS,
}

const NEXT_PHASE: Record<ScreenPhase, ScreenPhase> = {
  landing: "toast",
  toast: "chat",
  chat: "stats",
  stats: "landing",
}

const screenMotion = {
  initial: { opacity: 0, x: 18, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -18, scale: 0.98 },
  transition: { duration: 0.35, ease: "easeOut" as const },
}

export function MobileFlowSimulator() {
  const [phase, setPhase] = useState<ScreenPhase>("landing")

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPhase((current) => NEXT_PHASE[current])
    }, PHASE_MS[phase])

    return () => window.clearTimeout(id)
  }, [phase])

  return (
    <div className="flex w-full justify-center" data-phase={phase}>
      <div aria-hidden="true">
        <PhoneFrame>
          <AnimatePresence mode="wait">
            {phase === "stats" ? (
              <motion.div key="stats" className="absolute inset-0" {...screenMotion}>
                <DisciplineStatsScreen />
              </motion.div>
            ) : phase === "chat" ? (
              <motion.div key="chat" className="absolute inset-0" {...screenMotion}>
                <TelegramChatScreen />
              </motion.div>
            ) : (
              <motion.div key="landing" className="absolute inset-0" {...screenMotion}>
                <MiniLandingScreen tapped={false} />
                {phase === "toast" && <TelegramToast key="toast" tapped={false} />}
              </motion.div>
            )}
          </AnimatePresence>
        </PhoneFrame>
      </div>
    </div>
  )
}
