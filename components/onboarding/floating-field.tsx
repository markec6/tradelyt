"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"

type FloatingFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: "text" | "email" | "password" | "tel"
  autoComplete?: string
  revealable?: boolean
  hint?: string
}

export function FloatingField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  revealable = false,
  hint,
}: FloatingFieldProps) {
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)
  const floated = focused || value.length > 0
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={revealable && visible ? "text" : type}
          value={value}
          autoComplete={autoComplete}
          autoCapitalize={type === "email" ? "none" : undefined}
          spellCheck={type === "email" || type === "password" ? false : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            "peer h-12 w-full rounded-xl border bg-slate-950/70 px-3.5 pb-1 pt-5 text-sm text-white outline-none transition-[border-color,box-shadow] duration-200 sm:h-14 sm:pb-2 sm:pt-6",
            revealable && "pr-12",
            error
              ? "border-rose-400/80 shadow-[0_0_0_3px_rgba(244,63,94,0.16)]"
              : "border-slate-700/80 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.18),0_0_24px_rgba(16,185,129,0.14)]",
          )}
        />
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-3.5 transition-all duration-200",
            floated ? "top-1.5 text-[11px] tracking-wide" : "top-1/2 -translate-y-1/2 text-sm",
            error ? "text-rose-300" : floated && focused ? "text-emerald-300" : "text-slate-400",
          )}
        >
          {label}
        </label>
        {revealable && (
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors duration-200 hover:text-white"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[11px] leading-tight text-rose-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[11px] leading-tight text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
