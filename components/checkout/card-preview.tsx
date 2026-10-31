"use client"

import { AlertCircle, Check } from "lucide-react"
import { useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { ui } from "./copy"
import type { CardFields } from "./card-form"

type CardPreviewProps = {
  fields: CardFields
  locked?: boolean
}

function BrandMark({ brand }: { brand: CardFields["brand"] }) {
  if (brand === "visa") {
    return (
      <svg viewBox="0 0 64 24" className="h-6 w-16" aria-label="Visa">
        <text x="0" y="19" fill="white" fontFamily="Georgia, serif" fontSize="22" fontStyle="italic" fontWeight="700">
          VISA
        </text>
      </svg>
    )
  }
  if (brand === "mastercard") {
    return (
      <svg viewBox="0 0 52 32" className="h-8 w-12" aria-label="Mastercard">
        <circle cx="18" cy="16" r="12" fill="#eb001b" />
        <circle cx="34" cy="16" r="12" fill="#f79e1b" fillOpacity="0.95" />
        <path d="M26 7.2a12 12 0 0 1 0 17.6 12 12 0 0 1 0-17.6z" fill="#ff5f00" />
      </svg>
    )
  }
  if (brand === "amex") {
    return (
      <svg viewBox="0 0 72 28" className="h-7 w-16" aria-label="American Express">
        <rect width="72" height="28" rx="4" fill="#1f6feb" />
        <text x="36" y="18" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" letterSpacing="0.5">
          AMEX
        </text>
      </svg>
    )
  }
  return <span className="text-[11px] font-medium tracking-[0.2em] text-white/40">CARD</span>
}

function Chip() {
  return (
    <svg viewBox="0 0 46 34" className="h-8 w-11" aria-hidden="true">
      <rect x="1" y="1" width="44" height="32" rx="6" fill="#d6b25e" stroke="#f3e2ae" strokeWidth="1" />
      <path d="M1 12h44M1 22h44M16 1v32M30 1v32" stroke="#8a6a2f" strokeWidth="1" opacity="0.7" />
    </svg>
  )
}

export function CardPreview({ fields, locked = false }: CardPreviewProps) {
  const reduced = useReducedMotion()
  const [ready, setReady] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const allowTilt = ready && reduced === false

  useEffect(() => {
    setReady(true)
  }, [])
  const groups = fields.brand === "amex" ? [4, 6, 5] : [4, 4, 4, 4]
  const filled = fields.numberError ? 0 : fields.numberComplete ? groups.length : fields.numberEmpty ? 0 : 1
  const name = fields.name.trim() ? fields.name.trim().toUpperCase() : ui.cardNamePlaceholder
  const expiry = fields.expiryComplete ? "••/••" : ui.cardExpiryPlaceholder

  return (
    <div className="[perspective:1200px]">
      <div
        onMouseMove={
          allowTilt
            ? (event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                const px = (event.clientX - rect.left) / rect.width
                const py = (event.clientY - rect.top) / rect.height
                setTilt({ x: (py - 0.5) * -8, y: (px - 0.5) * 10 })
              }
            : undefined
        }
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        style={
          allowTilt
            ? {
                transform: locked
                  ? "rotateX(0deg) rotateY(0deg) scale(0.96)"
                  : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              }
            : undefined
        }
        className={cn(
          "relative aspect-[1.586] w-full max-w-md overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-800/80 to-slate-950/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-transform duration-200 sm:p-6",
          locked ? "border-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.45),0_0_40px_rgba(16,185,129,0.25)]" : "border-emerald-400/25",
        )}
      >
        <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-8 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative flex items-start justify-between">
          <Chip />
          <BrandMark brand={fields.brand} />
        </div>
        <div className="relative mt-6 flex gap-3 sm:mt-8 sm:gap-4" aria-hidden="true">
          {groups.map((count, index) => (
            <span
              key={`${count}-${index}`}
              className={cn(
                "font-mono text-lg tracking-[0.18em] transition-colors duration-200 sm:text-2xl",
                fields.numberError
                  ? "text-rose-300"
                  : index < filled
                    ? "text-white"
                    : "text-white/25",
              )}
            >
              {"•".repeat(count)}
            </span>
          ))}
        </div>
        <div className="relative mt-6 flex items-end justify-between gap-4 sm:mt-8">
          <p className={cn("truncate text-sm tracking-[0.14em]", fields.name.trim() ? "text-white" : "text-white/35")}>
            {name}
          </p>
          <p className={cn("font-mono text-sm", fields.expiryError ? "text-rose-300" : fields.expiryComplete ? "text-white" : "text-white/35")}>
            {expiry}
          </p>
        </div>
        <div className="relative mt-3 flex gap-2">
          <FieldMark ok={fields.numberComplete} bad={Boolean(fields.numberError)} label="Number" />
          <FieldMark ok={fields.expiryComplete} bad={Boolean(fields.expiryError)} label="Expiry" />
          <FieldMark ok={fields.cvcComplete} bad={Boolean(fields.cvcError)} label="CVC" />
        </div>
      </div>
    </div>
  )
}

function FieldMark({ ok, bad, label }: { ok: boolean; bad: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] tracking-wide",
        bad
          ? "border-rose-400/50 text-rose-200"
          : ok
            ? "border-emerald-400/50 text-emerald-200"
            : "border-white/10 text-white/35",
      )}
    >
      {bad ? <AlertCircle className="size-3" /> : ok ? <Check className="size-3" /> : null}
      {label}
    </span>
  )
}
