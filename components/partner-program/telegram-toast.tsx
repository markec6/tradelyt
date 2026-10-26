"use client"

import { motion } from "framer-motion"
import { RobotIcon } from "@/components/hero/robot-icon"
import { COPY } from "./data"

export function TelegramToast({ tapped }: { tapped: boolean }) {
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: tapped ? 0.5 : 1, scale: tapped ? 0.97 : 1 }}
      transition={
        tapped
          ? { duration: 0.25, ease: "easeOut" }
          : { type: "spring", stiffness: 300, damping: 20 }
      }
      className="absolute left-2.5 right-2.5 top-9 z-20"
    >
      <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-slate-800/90 p-2.5 shadow-2xl backdrop-blur-xl">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-emerald-500/30 bg-emerald-950/80">
          <RobotIcon className="h-5 w-5 text-emerald-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[11px] font-semibold text-white">{COPY.toastTitle}</p>
            <span className="flex-shrink-0 text-[10px] text-slate-400">{COPY.toastTime}</span>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-300">{COPY.toastBody}</p>
        </div>
      </div>
    </motion.div>
  )
}
