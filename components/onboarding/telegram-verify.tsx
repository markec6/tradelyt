"use client"

import { useEffect, useRef, useState } from "react"

import { issueTelegramLink } from "@/app/onboarding/actions"
import { UserAvatar } from "@/components/user-avatar"
import type { TelegramPhase } from "./resume"

type TelegramStatus = {
  verified: boolean
  hasUsername: boolean
  username: string
  avatarUrl: string | null
}

type TelegramVerifyProps = {
  phase: Extract<TelegramPhase, "wait" | "needs-username" | "expired">
  onVerified: (username: string) => void
  onNeedsUsername: (avatarUrl: string | null) => void
  onExpired: () => void
  onAuthError: () => void
  onRestart: () => void
}

const POLL_MS = 1000

let pendingLink: Promise<{ url: string; expiresAt: string }> | null = null

function loadTelegramLink() {
  if (!pendingLink) {
    pendingLink = issueTelegramLink().then((result) => {
      if (!result.ok) {
        pendingLink = null
        throw new Error(result.error)
      }
      return { url: result.url, expiresAt: result.expiresAt }
    })
  }
  return pendingLink
}

export function resetTelegramLink() {
  pendingLink = null
}

export function TelegramVerify({
  phase,
  onVerified,
  onNeedsUsername,
  onExpired,
  onAuthError,
  onRestart,
}: TelegramVerifyProps) {
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null)
  const [linkError, setLinkError] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const onVerifiedRef = useRef(onVerified)
  const onNeedsUsernameRef = useRef(onNeedsUsername)
  const onExpiredRef = useRef(onExpired)
  const onAuthErrorRef = useRef(onAuthError)
  onVerifiedRef.current = onVerified
  onNeedsUsernameRef.current = onNeedsUsername
  onExpiredRef.current = onExpired
  onAuthErrorRef.current = onAuthError

  useEffect(() => {
    if (phase !== "wait") return
    let cancelled = false
    setLinkError("")
    loadTelegramLink()
      .then((next) => {
        if (!cancelled) setLink(next)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLink(null)
        setLinkError(error instanceof Error ? error.message : "Could not open Telegram.")
      })
    return () => {
      cancelled = true
    }
  }, [phase])

  useEffect(() => {
    if (phase === "wait") return
    setLink(null)
  }, [phase])

  useEffect(() => {
    if (phase !== "wait" || !link) return
    const delay = new Date(link.expiresAt).getTime() - Date.now()
    if (delay <= 0) {
      onExpiredRef.current()
      return
    }
    const timer = window.setTimeout(() => onExpiredRef.current(), delay)
    return () => window.clearTimeout(timer)
  }, [phase, link])

  useEffect(() => {
    if (phase !== "wait") return
    let stopped = false
    let inFlight = false

    async function tick() {
      if (stopped || inFlight) return
      inFlight = true
      try {
        const response = await fetch("/api/telegram/status", { cache: "no-store" })
        if (stopped) return
        if (response.status === 401) {
          onAuthErrorRef.current()
          return
        }
        if (!response.ok) return
        const body = (await response.json()) as TelegramStatus
        if (stopped) return
        if (body.verified && body.hasUsername) {
          onVerifiedRef.current(body.username)
          return
        }
        if (body.verified && !body.hasUsername) {
          setAvatarUrl(body.avatarUrl)
          onNeedsUsernameRef.current(body.avatarUrl)
        }
      } catch {
        // The next tick tries again.
      } finally {
        inFlight = false
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void tick()
    }

    void tick()
    const timer = window.setInterval(() => void tick(), POLL_MS)
    window.addEventListener("focus", tick)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      stopped = true
      window.clearInterval(timer)
      window.removeEventListener("focus", tick)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [phase])

  function restart() {
    resetTelegramLink()
    setLink(null)
    setLinkError("")
    setAvatarUrl(null)
    onRestart()
    loadTelegramLink()
      .then((next) => setLink(next))
      .catch((error: unknown) => {
        setLinkError(error instanceof Error ? error.message : "Could not open Telegram.")
      })
  }

  if (phase === "needs-username") {
    return (
      <div className="mt-4 space-y-4 sm:mt-5">
        <div className="flex items-center gap-3">
          <UserAvatar url={avatarUrl} name="Telegram" className="size-12" />
          <p className="text-sm leading-snug text-slate-300">
            Your Telegram account needs a username before you can continue. Set one in Telegram, then open a new link.
          </p>
        </div>
        <NewLinkButton onClick={restart} />
        {linkError ? <p className="text-[11px] leading-tight text-rose-300">{linkError}</p> : null}
      </div>
    )
  }

  if (phase === "expired") {
    return (
      <div className="mt-4 space-y-4 sm:mt-5">
        <p className="text-sm leading-snug text-slate-300">This link expired.</p>
        <NewLinkButton onClick={restart} />
        {linkError ? <p className="text-[11px] leading-tight text-rose-300">{linkError}</p> : null}
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4 sm:mt-5">
      <div className="flex items-center gap-3">
        <UserAvatar url={null} name="Telegram" className="size-12" />
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
          </span>
          Waiting for Telegram
        </div>
      </div>
      {link ? (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.28)] transition-colors duration-200 hover:bg-emerald-400"
        >
          Open Telegram and verify
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 opacity-70"
        >
          Open Telegram and verify
        </button>
      )}
      {linkError ? (
        <>
          <p className="text-[11px] leading-tight text-rose-300">{linkError}</p>
          <NewLinkButton onClick={restart} />
        </>
      ) : null}
    </div>
  )
}

function NewLinkButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.28)] transition-colors duration-200 hover:bg-emerald-400"
    >
      Get a new link
    </button>
  )
}
