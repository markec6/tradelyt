"use client"

import { AnimatePresence, motion } from "framer-motion"
import { COPY } from "./data"

export function MiniLandingScreen({ tapped }: { tapped: boolean }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 px-4 pt-10">
      <div className="pointer-events-none absolute -left-6 top-16 h-28 w-28 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide text-white">Tradelyt</span>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center pb-10 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">{COPY.miniKicker}</p>
        <p className="mt-3 text-lg font-bold leading-tight text-white">
          {COPY.miniHeadlineLead}
          <span className="block">{COPY.miniHeadlineTail}</span>
        </p>
        <p className="mt-2 max-w-[200px] text-[11px] leading-relaxed text-slate-400">{COPY.miniSub}</p>

        <div className="relative mt-7">
          {!tapped && (
            <span className="absolute -inset-1 rounded-xl bg-emerald-400/35 motion-reduce:animate-none animate-pulse" />
          )}
          <motion.div
            animate={tapped ? { scale: 0.96 } : { scale: 1 }}
            transition={{ duration: 0.15 }}
            className="relative rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.45)]"
          >
            {COPY.buttonLabel}
          </motion.div>
          <AnimatePresence>
            {tapped && (
              <>
                <motion.span
                  key="ripple"
                  initial={{ scale: 0.5, opacity: 0.85 }}
                  animate={{ scale: 2.6, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-200"
                />
                <motion.span
                  key="burst"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: [0, 0.95, 0], scale: [0.85, 1.35, 1.6] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="pointer-events-none absolute inset-0 rounded-xl bg-emerald-300/60 blur-md"
                />
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
