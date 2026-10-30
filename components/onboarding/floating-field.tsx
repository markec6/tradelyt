"use client"

import { useState, type ReactNode } from "react"
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
  inputMode?: "text" | "tel" | "email" | "numeric" | "decimal"
  maxLength?: number
  revealable?: boolean
  hint?: string
  hintAccent?: boolean
  start?: ReactNode
  startPadding?: number
}

export function fieldControlClass(active: boolean, error?: string) {
  return cn(
    "h-12 w-full rounded-xl border bg-slate-950/70 px-3.5 text-left text-sm text-white outline-none transition-[border-color,box-shadow] duration-200 sm:h-14",
    error
      ? "border-rose-400/80 shadow-[0_0_0_3px_rgba(244,63,94,0.16)]"
      : active
        ? "border-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.18),0_0_24px_rgba(16,185,129,0.14)]"
        : "border-slate-700/80 focus:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.18),0_0_24px_rgba(16,185,129,0.14)]",
  )
}

export function fieldLabelClass(floated: boolean, active: boolean, error?: string) {
  return cn(
    "pointer-events-none absolute transition-all duration-200",
    floated
      ? "top-0 left-3 z-10 -translate-y-1/2 rounded-full bg-slate-900 px-1.5 py-0.5 leading-none"
      : "top-1/2 left-3.5 -translate-y-1/2 text-sm",
    floated && (active ? "text-sm font-medium" : "text-xs"),
    error ? "text-rose-300" : active ? "text-emerald-300" : "text-slate-400",
  )
}

export function FloatingField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  inputMode,
  maxLength,
  revealable = false,
  hint,
  hintAccent = false,
  start,
  startPadding = 52,
}: FloatingFieldProps) {
  const [focused, setFocused] = useState(false)
  const [visible, setVisible] = useState(false)
  const floated = focused || value.length > 0
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div>
      <div className="relative">
        {start}
        <input
          id={id}
          name={id}
          type={revealable && visible ? "text" : type}
          inputMode={inputMode}
          maxLength={maxLength}
          value={value}
          autoComplete={autoComplete}
          autoCapitalize={type === "email" ? "none" : undefined}
          spellCheck={type === "email" || type === "password" ? false : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={start ? { paddingLeft: startPadding } : undefined}
          className={cn(fieldControlClass(focused, error), revealable && "pr-12")}
        />
        <label
          htmlFor={id}
          style={!floated && start ? { left: startPadding } : undefined}
          className={fieldLabelClass(floated, focused, error)}
        >
          {label}
        </label>
        {revealable && (
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors duration-200 hover:text-white"
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
        <p
          id={`${id}-hint`}
          className={cn(
            "mt-1 text-[11px] leading-tight",
            hintAccent ? "font-medium text-emerald-300/90" : "text-slate-500",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  )
}
