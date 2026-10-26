"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { RobotIcon } from "./robot-icon"
import { useStageInView } from "./stage-in-view"

const ENTER_MS = 800

type Outcome = "lock" | "terminate"
type Phase = "empty" | "live" | Outcome

const RESULT = {
  lock: {
    text: "TP1 locked! 30% position secured in profit. Stop-loss moved to entry.",
    time: "11:28 AM",
  },
  terminate: {
    text: "Trade terminated manually. Capital secured, waiting for next setup.",
    time: "11:31 AM",
  },
} as const

const CHAR_MS = 42

function LiveTradingBox({
  onLock,
  onTerminate,
}: {
  onLock: () => void
  onTerminate: () => void
}) {
  return (
    <div className="relative">
      <div className="absolute -top-1.5 left-3 rounded border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 text-[8px] font-medium text-emerald-400 sm:-top-2 sm:left-4 sm:px-2 sm:text-[10px]">
        PINNED
      </div>
      <div className="rounded-xl border border-emerald-500/40 bg-slate-800/90 p-3 shadow-xl shadow-emerald-500/10 backdrop-blur-md sm:rounded-2xl sm:p-4">
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <svg className="h-3.5 w-3.5 text-emerald-400 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[10px] font-semibold tracking-wide text-white sm:text-xs">LIVE TRADING: SOL/USDT</span>
        </div>
        <div className="mb-4 text-center sm:mb-5">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <span className="text-xl font-bold text-emerald-400 sm:text-2xl">+14.20%</span>
            <span className="text-sm text-emerald-500 sm:text-base">(+$42.60)</span>
          </div>
          <span className="mt-1 block text-[10px] text-slate-400 sm:text-xs">Entry: $142.50 → Current: $162.72</span>
        </div>
        <div className="mb-4 sm:mb-5">
          <div className="mb-1.5 flex justify-between px-0.5 text-[8px] text-slate-400 sm:mb-2 sm:text-[10px]">
            <span>Stop Loss</span>
            <span>Entry</span>
            <span>TP1</span>
            <span>TP2</span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-slate-700/80 sm:h-3.5">
            <div className="absolute bottom-0 left-0 top-0 w-[20%] bg-gradient-to-r from-red-600 to-red-500" />
            <div className="absolute bottom-0 left-[20%] top-0 w-[25%] bg-gradient-to-r from-slate-600 to-slate-500" />
            <div className="absolute bottom-0 left-[45%] top-0 w-[25%] bg-gradient-to-r from-emerald-600 to-emerald-500" />
            <div className="absolute bottom-0 left-[70%] top-0 w-[30%] bg-gradient-to-r from-cyan-600 to-cyan-500" />
            <div className="absolute left-[62%] top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-emerald-500 bg-white shadow-lg shadow-emerald-500/50 sm:h-4 sm:w-4">
              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-50" />
            </div>
          </div>
          <div className="mt-1.5 flex sm:mt-2">
            <div className="w-[20%] text-center">
              <span className="text-[7px] font-medium text-red-400 sm:text-[9px]">-8%</span>
            </div>
            <div className="w-[25%] text-center">
              <span className="text-[7px] font-medium text-slate-400 sm:text-[9px]">0%</span>
            </div>
            <div className="w-[25%] text-center">
              <span className="text-[7px] font-medium text-emerald-400 sm:text-[9px]">+15%</span>
            </div>
            <div className="w-[30%] text-center">
              <span className="text-[7px] font-medium text-cyan-400 sm:text-[9px]">+30%</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onLock}
            className="animate-live-lock-glow flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-2 py-2 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/30 sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs"
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Lock TP1
          </button>
          <button
            type="button"
            onClick={onTerminate}
            className="animate-live-terminate-glow flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-500/50 bg-red-500/20 px-2 py-2 text-[10px] font-semibold text-red-400 hover:bg-red-500/30 sm:gap-2 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs"
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Terminate
          </button>
        </div>
      </div>
    </div>
  )
}

function ResultMessage({ outcome }: { outcome: Outcome }) {
  const message = RESULT[outcome]
  const [count, setCount] = useState(0)

  useEffect(() => {
    const origin = Date.now()
    const length = message.text.length
    const id = window.setInterval(() => {
      const next = Math.min(length, Math.floor((Date.now() - origin) / CHAR_MS))
      setCount((current) => (current === next ? current : next))
      if (next >= length) window.clearInterval(id)
    }, CHAR_MS)
    return () => window.clearInterval(id)
  }, [message.text])

  const done = count >= message.text.length
  const shown = message.text.slice(0, count)

  return (
    <div className="absolute bottom-12 left-2.5 right-2.5 z-20 mb-4 flex gap-1.5 lg:bottom-[80px] lg:mb-0">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
        <RobotIcon className="h-3.5 w-3.5 text-emerald-300" />
      </div>
      <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-slate-800/80 px-2.5 py-1.5 sm:rounded-2xl sm:px-3 sm:py-2">
        <p className="text-[10px] text-slate-200 sm:text-xs">
          {shown}
          {done ? null : (
            <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-emerald-400 align-middle" aria-hidden="true" />
          )}
        </p>
        {done ? (
          <span className="mt-0.5 block text-[8px] text-slate-500 sm:mt-1 sm:text-[10px]">{message.time}</span>
        ) : null}
      </div>
    </div>
  )
}

export function PhoneMockup() {
  const inView = useStageInView()
  const [reduced, setReduced] = useState(false)
  const [phase, setPhase] = useState<Phase>("empty")
  const [showBox, setShowBox] = useState(false)
  const [result, setResult] = useState<Outcome | null>(null)
  const outcomeRef = useRef<Outcome | null>(null)

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  useEffect(() => {
    if (!inView) {
      outcomeRef.current = null
      setPhase("empty")
      setShowBox(false)
      setResult(null)
      return
    }

    const id = window.setTimeout(() => {
      setPhase("live")
      setShowBox(true)
    }, ENTER_MS)

    return () => window.clearTimeout(id)
  }, [inView])

  function choose(outcome: Outcome) {
    if (phase !== "live") return
    outcomeRef.current = outcome
    setPhase(outcome)
    setShowBox(false)
  }

  return (
    <div className="relative flex w-full justify-center">
      <div className="relative w-full max-w-[256px] overflow-hidden rounded-[32px] border-[5px] border-slate-800 bg-slate-950 shadow-2xl sm:max-w-[276px] sm:rounded-[40px] sm:border-[7px]">
        <div className="absolute left-1/2 top-1.5 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-slate-800 sm:top-2 sm:h-5 sm:w-20" />
        <div className="relative h-[520px] overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 sm:h-[540px]">
          <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 px-3 pb-2 pt-6 backdrop-blur-sm sm:px-4 sm:pb-3 sm:pt-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <svg className="h-4 w-4 text-slate-400 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <div className="relative h-7 w-7 flex-shrink-0 sm:h-8 sm:w-8">
                <div className="flex h-full w-full items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-950/80 p-1.5">
                  <RobotIcon className="h-4 w-4 text-emerald-300 sm:h-5 sm:w-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-white sm:text-xs">Tradelyt Bot</p>
                <p className="truncate text-[10px] text-emerald-400 sm:text-xs">● active guardrail</p>
              </div>
              <svg className="h-4 w-4 flex-shrink-0 text-slate-400 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5">
            <AnimatePresence
              mode="wait"
              onExitComplete={() => {
                const outcome = outcomeRef.current
                if (outcome) setResult(outcome)
              }}
            >
              {showBox ? (
                <motion.div
                  key="live"
                  initial={reduced ? { opacity: 0 } : { scale: 0.9, opacity: 0, y: 20 }}
                  animate={reduced ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
                  exit={
                    reduced
                      ? { opacity: 0, transition: { duration: 0.2 } }
                      : { opacity: 0, y: -16, scale: 0.96, transition: { duration: 0.35, ease: "easeOut" } }
                  }
                  transition={
                    reduced ? { duration: 0.2 } : { type: "spring", duration: 0.7, bounce: 0.25 }
                  }
                >
                  <LiveTradingBox
                    onLock={() => choose("lock")}
                    onTerminate={() => choose("terminate")}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {result ? <ResultMessage key={result} outcome={result} /> : null}

          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-900/95 p-2.5 backdrop-blur-sm sm:p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 flex-1 items-center rounded-full bg-slate-800 px-3 sm:h-10 sm:px-4">
                <span className="text-[10px] text-slate-500 sm:text-xs">Message...</span>
              </div>
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 sm:h-10 sm:w-10">
                <svg className="h-4 w-4 text-white sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
