"use client"

import { cn } from "@/lib/utils"
import type { TelegramDraft } from "./validate-telegram"

type TelegramStepProps = {
  draft: TelegramDraft
  formError?: string
  onChange: (patch: Partial<TelegramDraft>) => void
  onSubmit: () => void
}

const SWITCHES = [
  { key: "tradeExecutions", label: "Trade executions" },
  { key: "riskWarnings", label: "Risk guardrail warnings" },
  { key: "dailyPnl", label: "Daily PnL summary" },
] as const

export function TelegramStep({ draft, formError, onChange, onSubmit }: TelegramStepProps) {
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
      <div className="space-y-2">
        {SWITCHES.map((item) => {
          const checked = draft[item.key]
          return (
            <div
              key={item.key}
              className="flex h-12 items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 sm:h-14"
            >
              <span className="text-sm text-slate-200">{item.label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={item.label}
                onClick={() => onChange({ [item.key]: !checked })}
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
          )
        })}
      </div>
      {formError && <p className="text-[11px] leading-tight text-rose-300">{formError}</p>}
    </form>
  )
}
