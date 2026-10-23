"use client"

import { useEffect, useState } from "react"
import { TelegramBubble } from "@/components/live-showcase/telegram-bubble"
import type { BubbleTone } from "@/components/live-showcase/data"

const MESSAGES: readonly { time: string; tone: BubbleTone; text: string }[] = [
  {
    time: "10:42 AM",
    tone: "emerald",
    text: "🟢 TRADE DETECTED: BTC/USDT Long | Entry: $64,200 | SL: $63,000",
  },
  {
    time: "11:08 AM",
    tone: "emerald",
    text: "🎯 TP1 SMASHED (+2.5%) | 30% Profit locked. Stop-Loss shifted to Entry. Trade is now 100% RISK-FREE.",
  },
  {
    time: "11:14 AM",
    tone: "rose",
    text: "⚠️ OVERTRADING PREVENTED | Daily 2/2 limit reached. System locked to protect your balance.",
  },
]

export function BotSimulator() {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % MESSAGES.length)
    }, 3000)
    return () => window.clearInterval(id)
  }, [])

  const message = MESSAGES[activeIndex]

  return (
    <div className="w-full">
      <div className="relative min-h-[176px]">
        <TelegramBubble
          className="mx-auto max-w-lg"
          text={message.text}
          time={message.time}
          tone={message.tone}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden="true">
        {MESSAGES.map((_, index) => (
          <span
            key={index}
            className={`rounded-full transition-all duration-300 ${
              index === activeIndex ? "h-1.5 w-6 bg-emerald-400" : "h-1.5 w-1.5 bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
