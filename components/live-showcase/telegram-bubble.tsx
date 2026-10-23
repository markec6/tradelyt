"use client"

import { AnimatePresence, motion } from "framer-motion"
import { RobotIcon } from "@/components/hero/robot-icon"
import { cn } from "@/lib/utils"
import type { BubbleTone } from "./data"
import { useReducedMotion } from "./use-showcase-playback"

export function TelegramBubble({
  text,
  time,
  tone,
  className,
  compact = false,
}: {
  text: string
  time: string
  tone: BubbleTone
  className?: string
  compact?: boolean
}) {
  const reducedMotion = useReducedMotion()
  const accent =
    tone === "rose" ? "border-rose-500 bg-rose-500/5" : "border-emerald-500 bg-emerald-500/5"

  return (
    <AnimatePresence mode="wait">
      <motion.article
        key={text}
        initial={reducedMotion ? false : { x: 16, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={reducedMotion ? undefined : { x: -12, opacity: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}
        className={cn(
          "rounded-2xl border border-slate-700/80 bg-slate-950/80 shadow-xl",
          compact ? "p-3.5" : "p-4",
          className,
        )}
      >
        <div className={cn("flex items-center gap-2.5", compact ? "mb-2" : "mb-3")}>
          <div className={cn("relative flex-shrink-0", compact ? "h-7 w-7" : "h-8 w-8")}>
            <div
              className={cn(
                "flex items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-950/80 p-1",
                compact ? "h-7 w-7" : "h-8 w-8",
              )}
            >
              <RobotIcon className={cn("text-emerald-300", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
            </div>
            <span
              className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400"
              aria-hidden="true"
            />
          </div>
          <p className="min-w-0 flex-1 truncate text-xs font-bold text-white">Tradelyt Guardrail Bot</p>
          <time className="flex-shrink-0 text-xs text-slate-500">{time}</time>
        </div>
        <p
          className={cn(
            "rounded-r-lg border-l-4 leading-relaxed text-slate-200",
            compact ? "p-2.5 text-xs sm:text-sm" : "p-3 text-sm",
            accent,
          )}
        >
          {text}
        </p>
      </motion.article>
    </AnimatePresence>
  )
}
