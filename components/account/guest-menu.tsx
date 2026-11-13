"use client"

import { Outfit } from "next/font/google"
import { Lock } from "lucide-react"
import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
})

export function GuestMark({ className = "size-8" }: { className?: string }) {
  return (
    <span
      className={`${className} relative inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-slate-500 bg-slate-950/80 text-slate-300`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="12" cy="8" r="3.25" strokeWidth="1.75" />
        <path d="M5.5 19.25c1.4-2.7 3.7-4 6.5-4s5.1 1.3 6.5 4" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full border border-slate-950 bg-slate-500" />
    </span>
  )
}

function GuestActions({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link
        href="/login"
        role="menuitem"
        className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5 hover:text-white"
        onClick={onNavigate}
      >
        Log in
      </Link>
      <button
        type="button"
        role="menuitem"
        disabled
        aria-disabled="true"
        className="flex w-full cursor-not-allowed items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-500"
      >
        <span>Settings</span>
        <Lock className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Locked until you log in.</span>
      </button>
    </>
  )
}

export function GuestMenu({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (inline || !open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [inline, open])

  if (inline) {
    return (
      <div className={`${outfit.className} px-1 py-1`}>
        <div className="flex items-center gap-2 px-2 py-2">
          <GuestMark />
          <span className="text-sm text-slate-300">Guest</span>
        </div>
        <GuestActions />
      </div>
    )
  }

  return (
    <div ref={rootRef} className={`${outfit.className} relative shrink-0`}>
      <button
        type="button"
        className="flex items-center rounded-full border border-white/10 bg-slate-950/70 p-1 text-white backdrop-blur transition-colors hover:border-emerald-400/40"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label="Guest account"
        onClick={() => setOpen((current) => !current)}
      >
        <GuestMark />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-44 rounded-2xl border border-emerald-400/30 bg-slate-900/90 p-1.5 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <GuestActions onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  )
}
