"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useState, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import { FloatingField } from "./floating-field"
import type { ExchangeDraft, ExchangeErrors, ExchangeId, TradingMode } from "./validate-exchange"

type ExchangeStepProps = {
  draft: ExchangeDraft
  errors: ExchangeErrors
  onChange: (patch: Partial<ExchangeDraft>) => void
  onSubmit: () => void
}

const SANDBOX: { id: ExchangeId; label: string }[] = [
  { id: "paper", label: "Tradelyt Paper" },
  { id: "binance_testnet", label: "Binance Testnet" },
  { id: "bybit_testnet", label: "Bybit Testnet" },
]

const LIVE: { id: "binance" | "bybit" | "okx"; label: string }[] = [
  { id: "binance", label: "Binance" },
  { id: "bybit", label: "Bybit" },
  { id: "okx", label: "OKX" },
]

const LINKS = {
  binance_testnet: {
    href: "https://testnet.binance.vision/",
    label: "Create a free Binance Testnet key",
  },
  bybit_testnet: {
    href: "https://testnet.bybit.com/",
    label: "Create a free Bybit Testnet key",
  },
} as const

function BinanceMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="#F3BA2F"
        d="M16.624 13.92 19.341 16.636 11.988 23.989 4.636 16.636 7.352 13.921 11.988 18.557 16.624 13.92zM21.26 9.669 23.977 12.386 21.26 15.103 18.544 12.386 21.26 9.669zM6.717 9.669 9.434 12.386 6.717 15.103 4 12.386 6.717 9.669zM11.988.011 19.341 7.364 16.624 10.081 11.988 5.445 7.352 10.081 4.636 7.364 11.988.011zM12.001 9.173 14.814 11.986 12.001 14.799 9.188 11.986 12.001 9.173z"
      />
    </svg>
  )
}

function BybitMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#F7A600" />
      <path
        fill="#121212"
        fillRule="evenodd"
        d="M8 6.2h4.8c1.7 0 2.8.9 2.8 2.2 0 1-.6 1.7-1.5 2 1.1.3 1.8 1.2 1.8 2.3 0 1.5-1.2 2.5-3.1 2.5H8Zm2 3.1h2.4c.7 0 1.1-.3 1.1-.8s-.4-.8-1.1-.8H10Zm0 4.3h2.7c.8 0 1.2-.35 1.2-.9s-.4-.85-1.2-.85H10Z"
      />
    </svg>
  )
}

function OkxMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#ffffff" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="#111111"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="8"
        fontWeight="800"
      >
        OKX
      </text>
    </svg>
  )
}

const MARKS = {
  binance: BinanceMark,
  bybit: BybitMark,
  okx: OkxMark,
} as const

function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  const [overflow, setOverflow] = useState<"hidden" | "visible">("hidden")

  return (
    <AnimatePresence initial={false} onExitComplete={() => setOverflow("hidden")}>
      {show ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          onAnimationStart={() => setOverflow("hidden")}
          onAnimationComplete={(definition) => {
            if (definition && typeof definition === "object" && "opacity" in definition && definition.opacity === 1) {
              setOverflow("visible")
            }
          }}
          style={{ overflow }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function ExchangeStep({ draft, errors, onChange, onSubmit }: ExchangeStepProps) {
  const link = draft.exchange && draft.exchange in LINKS ? LINKS[draft.exchange as keyof typeof LINKS] : null
  const showKeys =
    (draft.mode === "live" && (draft.exchange === "binance" || draft.exchange === "bybit" || draft.exchange === "okx")) ||
    (draft.mode === "sandbox" && (draft.exchange === "binance_testnet" || draft.exchange === "bybit_testnet"))

  function selectMode(mode: TradingMode) {
    onChange(mode === "live" ? { mode, exchange: null } : { mode, exchange: "paper" })
  }

  return (
    <form
      id="exchange-step"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3"
    >
      <div>
        <div
          id="tradingMode"
          tabIndex={-1}
          role="radiogroup"
          aria-label="Mode"
          className="grid h-12 grid-cols-2 rounded-xl border border-slate-700/80 bg-slate-950/70 p-1 sm:h-14"
        >
          {(
            [
              ["sandbox", "Sandbox"],
              ["live", "Live"],
            ] as const
          ).map(([mode, label]) => {
            const selected = draft.mode === mode
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectMode(mode)}
                className={cn(
                  "rounded-lg text-sm font-medium transition-colors duration-200",
                  selected ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:text-white",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
      {draft.mode === "live" ? (
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Exchange">
          {LIVE.map((item) => {
            const selected = draft.exchange === item.id
            const Mark = MARKS[item.id]
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ exchange: item.id })}
                className={cn(
                  "flex h-12 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm transition-colors duration-200",
                  selected
                    ? "border-emerald-400 bg-emerald-500/10 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                    : "border-slate-700/80 bg-slate-950/70 text-slate-200 hover:border-slate-500",
                )}
              >
                <Mark />
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2" role="radiogroup" aria-label="Exchange">
          {SANDBOX.map((item) => {
            const selected = draft.exchange === item.id
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ exchange: item.id })}
                className={cn(
                  "flex h-12 w-full items-center rounded-xl border px-3.5 text-left text-sm transition-colors duration-200 sm:h-14",
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
      )}
      {errors.form && <p className="text-[11px] leading-tight text-rose-300">{errors.form}</p>}
      {link && (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm leading-snug text-emerald-300 underline-offset-2 hover:underline"
        >
          {link.label}
        </a>
      )}
      <Reveal show={showKeys}>
        <div className="space-y-2.5 sm:space-y-3">
          <p className="text-[11px] leading-snug text-slate-400">
            We only ask for read-only access to view your balance. Your funds stay safe and cannot be withdrawn.
          </p>
          <FloatingField
            id="apiKey"
            label="API Key"
            type="password"
            revealable
            autoComplete="off"
            maxLength={128}
            value={draft.apiKey}
            error={errors.apiKey}
            onChange={(apiKey) => onChange({ apiKey })}
          />
          <FloatingField
            id="apiSecret"
            label="API Secret"
            type="password"
            revealable
            autoComplete="off"
            maxLength={128}
            value={draft.apiSecret}
            error={errors.apiSecret}
            onChange={(apiSecret) => onChange({ apiSecret })}
          />
          <Reveal show={draft.exchange === "okx"}>
            <FloatingField
              id="passphrase"
              label="Passphrase"
              type="password"
              revealable
              autoComplete="off"
              maxLength={64}
              value={draft.passphrase}
              error={errors.passphrase}
              onChange={(passphrase) => onChange({ passphrase })}
            />
          </Reveal>
        </div>
      </Reveal>
    </form>
  )
}
