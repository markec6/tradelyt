"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { ProfileMenu } from "@/components/account/profile-menu"
import type { SessionProfile } from "@/lib/profile"

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#logic", label: "Logic" },
  { href: "#docs", label: "Docs" },
] as const

export function Navigation({ profile = null }: { profile?: SessionProfile | null }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [loaded, setLoaded] = useState<SessionProfile | null | undefined>(undefined)
  const session = loaded === undefined ? profile : loaded
  const lastY = useRef(0)

  useEffect(() => {
    let cancelled = false
    fetch("/api/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (cancelled || !payload || typeof payload !== "object" || !("profile" in payload)) return
        const next = payload.profile
        if (next === null) {
          setLoaded(null)
          return
        }
        if (!next || typeof next !== "object") return
        const username = "username" in next && (typeof next.username === "string" || next.username === null) ? next.username : null
        const avatarUrl = "avatarUrl" in next && (typeof next.avatarUrl === "string" || next.avatarUrl === null) ? next.avatarUrl : null
        setLoaded({ username, avatarUrl })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y < 80) {
        setHidden(false)
      } else if (y > lastY.current) {
        setHidden(true)
        setIsMenuOpen(false)
      } else if (lastY.current - y >= 5) {
        setHidden(false)
      }
      lastY.current = y
    }

    lastY.current = window.scrollY
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav className="fixed top-2 lg:top-4 left-1/2 z-50 w-[95%] max-w-6xl -translate-x-1/2 lg:w-[92%]">
      <div
        className={`rounded-2xl bg-slate-900/90 backdrop-blur-xl border-[1.5px] border-emerald-500/60 shadow-[0_4px_16px_rgba(0,0,0,0.25),0_0_18px_rgba(16,185,129,0.22)] px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-3.5 transition-all duration-300 ease-in-out ${
          hidden
            ? "-translate-y-[120%] opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100"
        }`}
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-base sm:text-xl font-bold text-white truncate">Tradelyt</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" aria-hidden="true" />
          </div>

          {/* Center Links */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Link
              href="/onboarding"
              className="inline-flex bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-2.5 py-1.5 sm:px-5 sm:py-2 rounded-xl text-[11px] sm:text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors whitespace-nowrap"
            >
              Launch App
            </Link>
            {session ? <ProfileMenu profile={session} /> : null}

            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 mt-2 pt-2 pb-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  )
}
