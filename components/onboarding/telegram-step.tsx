"use client"

import { useEffect, useId, useRef, useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TelegramDraft } from "./validate-telegram"

type TelegramStepProps = {
  draft: TelegramDraft
  formError?: string
  onChange: (patch: Partial<TelegramDraft>) => void
  onSubmit: () => void
}

const SWITCHES = [
  {
    key: "tradeExecutions",
    label: "Trade executions",
    help: "Instant Telegram alerts whenever your bot executes a buy or sell trade in the market, so you're always tracking your fills in real time.",
  },
  {
    key: "riskWarnings",
    label: "Risk guardrail warnings",
    help: "Immediate safety alerts sent to your phone if market volatility spikes, drawdown limits are approached, or risk rules are triggered to protect your capital.",
  },
  {
    key: "dailyPnl",
    label: "Daily PnL summary",
    help: "An automated end-of-day performance report delivered straight to your chat, breaking down your net profit, loss, and win rate for the session.",
  },
] as const

type SwitchKey = (typeof SWITCHES)[number]["key"]

export function TelegramStep({ draft, formError, onChange, onSubmit }: TelegramStepProps) {
  const [open, setOpen] = useState<Partial<Record<SwitchKey, boolean>>>({})
  const listRef = useRef<HTMLDivElement>(null)
  const uid = useId()
  const anyOpen = SWITCHES.some((item) => open[item.key])

  useEffect(() => {
    if (!anyOpen) return

    function onPointerDown(event: PointerEvent) {
      const target = event.target
      const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null
      if (!element || !listRef.current?.contains(element) || !element.closest("[data-alert-group]")) {
        setOpen({})
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen({})
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [anyOpen])

  return (
    <form
      id="telegram-step"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3"
    >
      <div ref={listRef} className="space-y-2">
        {SWITCHES.map((item) => {
          const checked = draft[item.key]
          const isOpen = Boolean(open[item.key])
          const panelId = `${uid}-${item.key}-panel`
          const descId = `${uid}-${item.key}-desc`
          return (
            <div key={item.key} data-alert-group>
              <div className="flex h-12 items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 sm:h-14">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen((current) => ({ ...current, [item.key]: !current[item.key] }))}
                >
                  <span className="text-sm text-slate-200">{item.label}</span>
                  <motion.span
                    aria-hidden
                    initial={false}
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.24, ease: "easeInOut" }}
                    className="inline-flex"
                  >
                    <ChevronDown className="size-4 shrink-0 text-slate-400" />
                  </motion.span>
                </button>
                <button
                  type="button"
                  role="switch"
                  aria-checked={checked}
                  aria-label={item.label}
                  aria-describedby={descId}
                  onClick={(event) => {
                    event.stopPropagation()
                    onChange({ [item.key]: !checked })
                  }}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
                    checked ? "bg-emerald-500" : "bg-slate-700",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform duration-200",
                      checked && "translate-x-5",
                    )}
                  />
                </button>
              </div>
              <motion.div
                id={panelId}
                initial={false}
                animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.24, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <p
                  id={descId}
                  className="mt-2 rounded-xl border border-emerald-500/40 bg-slate-900 px-3.5 py-2.5 text-sm leading-relaxed text-slate-300"
                >
                  {item.help}
                </p>
              </motion.div>
            </div>
          )
        })}
      </div>
      {formError && <p className="text-[11px] leading-tight text-rose-300">{formError}</p>}
    </form>
  )
}
