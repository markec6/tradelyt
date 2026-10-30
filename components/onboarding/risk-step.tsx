"use client"

import { cn } from "@/lib/utils"
import { FloatingField } from "./floating-field"
import type { RiskDraft, RiskErrors, StrategyId } from "./validate-risk"

type RiskStepProps = {
  draft: RiskDraft
  errors: RiskErrors
  onChange: (patch: Partial<RiskDraft>) => void
  onSubmit: () => void
}

const STRATEGIES: { id: StrategyId; label: string }[] = [
  { id: "dca", label: "DCA" },
  { id: "grid", label: "Grid Trading" },
  { id: "momentum", label: "Momentum Breakout" },
]

const SWITCHES = [
  { key: "stopLoss", label: "Stop-Loss Trigger" },
  { key: "trailingTakeProfit", label: "Trailing Take Profit" },
  { key: "emergencyStop", label: "Emergency Stop on High Volatility" },
] as const

export function RiskStep({ draft, errors, onChange, onSubmit }: RiskStepProps) {
  return (
    <form
      id="risk-step"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3"
    >
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Strategy">
        {STRATEGIES.map((item) => {
          const selected = draft.strategy === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ strategy: item.id })}
              className={cn(
                "flex h-14 items-center justify-center rounded-xl border px-2 text-center text-xs font-medium leading-tight transition-colors duration-200 sm:text-sm",
                selected
                  ? "border-emerald-400 bg-emerald-500/10 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                  : "border-slate-700/80 bg-slate-950/70 text-slate-200 hover:border-slate-500",
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      {errors.form && <p className="text-[11px] leading-tight text-rose-300">{errors.form}</p>}
      <FloatingField
        id="maxDrawdown"
        label="Max Drawdown %"
        inputMode="decimal"
        autoComplete="off"
        maxLength={5}
        value={draft.maxDrawdown}
        error={errors.maxDrawdown}
        onChange={(maxDrawdown) => onChange({ maxDrawdown })}
      />
      <FloatingField
        id="riskPerTrade"
        label="Risk Per Trade %"
        inputMode="decimal"
        autoComplete="off"
        maxLength={5}
        value={draft.riskPerTrade}
        error={errors.riskPerTrade}
        onChange={(riskPerTrade) => onChange({ riskPerTrade })}
      />
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
    </form>
  )
}
