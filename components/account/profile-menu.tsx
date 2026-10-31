"use client"

import { Outfit } from "next/font/google"
import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"

import { signOut } from "@/app/account/actions"
import { UserAvatar } from "@/components/user-avatar"
import type { SessionProfile } from "@/lib/profile"

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
})

export function ProfileMenu({ profile }: { profile: SessionProfile }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const label = profile.username ? `@${profile.username}` : "Nalog"

  useEffect(() => {
    if (!open) return
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
  }, [open])

  return (
    <div ref={rootRef} className={`${outfit.className} relative shrink-0`}>
      <button
        type="button"
        className="flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 py-1 pr-2 pl-1 text-left text-sm text-white backdrop-blur transition-colors hover:border-emerald-400/40"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <UserAvatar url={profile.avatarUrl} name={label} className="size-8" />
        {profile.username ? (
          <span className="hidden max-w-[9rem] truncate sm:inline">@{profile.username}</span>
        ) : null}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-48 rounded-2xl border border-emerald-400/30 bg-slate-900/90 p-1.5 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <Link
            href="/"
            role="menuitem"
            className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Nazad na sajt
          </Link>
          <Link
            href="/dashboard"
            role="menuitem"
            className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5 hover:text-white"
            >
              Odjava
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
