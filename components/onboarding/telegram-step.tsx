"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"
import { FloatingField } from "./floating-field"
import type { TelegramDraft } from "./validate-telegram"

type TelegramStepProps = {
  draft: TelegramDraft
  handleError?: string
  formError?: string
  onChange: (patch: Partial<TelegramDraft>) => void
  onSubmit: () => void
}

const SWITCHES = [
  { key: "tradeExecutions", label: "Trade executions" },
  { key: "riskWarnings", label: "Risk guardrail warnings" },
  { key: "dailyPnl", label: "Daily PnL summary" },
] as const

export function TelegramStep({ draft, handleError, formError, onChange, onSubmit }: TelegramStepProps) {
  const [copied, setCopied] = useState(false)

  async function copyStart() {
    try {
      await navigator.clipboard.writeText("/start")
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

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
      <FloatingField
        id="telegramHandle"
        label="Telegram username*"
        autoComplete="username"
        maxLength={32}
        value={draft.handle}
        error={handleError}
        startPadding={40}
        start={
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-medium text-slate-200">
            @
          </span>
        }
        onChange={(value) => onChange({ handle: value.replace(/^@+/, "").slice(0, 32) })}
      />
      <div className="flex items-center justify-between gap-3">
        <a
          href="https://t.me/TradelytBot"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm leading-snug text-emerald-300 underline-offset-2 hover:underline"
        >
          Open @TradelytBot on Telegram and send /start
        </a>
        <button
          type="button"
          onClick={() => void copyStart()}
          className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition-colors duration-200 hover:border-slate-500 hover:text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
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
