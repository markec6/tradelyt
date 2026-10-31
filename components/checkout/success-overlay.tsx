"use client"

import { motion, useReducedMotion } from "framer-motion"

import { ui } from "./copy"

export function SuccessOverlay({ title = ui.successTitle, body = ui.successBody }: { title?: string; body?: string }) {
  const reduced = useReducedMotion()
  const draw = reduced ? { duration: 0 } : { duration: 0.45, ease: "easeOut" as const }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
      <div className="flex flex-col items-center px-6 text-center">
        <motion.svg viewBox="0 0 52 52" className="size-16" aria-hidden="true">
          <motion.circle
            cx="26"
            cy="26"
            r="24"
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={draw}
          />
          <motion.path
            d="M15 27.5 L23 35 L37 18"
            fill="none"
            stroke="#34d399"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={reduced ? { duration: 0 } : { duration: 0.35, delay: 0.2, ease: "easeOut" }}
          />
        </motion.svg>
        <p className="mt-3 text-lg font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-300">{body}</p>
      </div>
    </div>
  )
}
