"use client"

import { Activity, Bot, ShieldCheck } from "lucide-react"
import { useSyncExternalStore } from "react"

import { cn } from "@/lib/utils"
import { ui } from "./copy"
import type { CheckoutMode } from "./mode"

const ICONS = [Bot, ShieldCheck, Activity] as const

type TrialButtonProps = {
  ready: boolean
  pending: boolean
  failed: boolean
  idleLabel?: string
  pendingLabel?: string
  className?: string
}

export function TrialButton({ ready, pending, failed, idleLabel, pendingLabel, className }: TrialButtonProps) {
  const label = pending ? (pendingLabel ?? ui.ctaPending) : failed ? ui.ctaRetry : (idleLabel ?? ui.cta)
  return (
    <button
      type="submit"
      form="checkout-card"
      disabled={!ready || pending}
      className={cn(
        "inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.28)] transition-colors duration-200 hover:bg-emerald-400 disabled:opacity-60",
        className,
      )}
    >
      {label}
    </button>
  )
}

type OrderSummaryProps = {
  mode: CheckoutMode
  ready: boolean
  pending: boolean
  failed: boolean
  message?: string
}

function firstChargeLabel() {
  const charge = new Date()
  charge.setUTCDate(charge.getUTCDate() + 7)
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(charge)
}

function subscribeToNothing() {
  return () => {}
}

function useFirstCharge() {
  return useSyncExternalStore(subscribeToNothing, firstChargeLabel, () => "—")
}
function summaryCopy(mode: CheckoutMode) {
  if (mode === "past_due") {
    return { title: ui.pastDueTitle, body: ui.pastDueBody, disclaimer: ui.pastDueDisclaimer, idle: ui.pastDueCta, pending: ui.pastDueCtaPending }
  }
  if (mode === "canceled") return { title: ui.canceledTitle, body: ui.canceledBody, disclaimer: "", idle: ui.cta, pending: ui.ctaPending }
  if (mode === "blocked") return { title: ui.blockedTitle, body: ui.blockedBody, disclaimer: "", idle: ui.cta, pending: ui.ctaPending }
  return { title: ui.title, body: ui.body, disclaimer: ui.disclaimer, idle: ui.cta, pending: ui.ctaPending }
}

export function OrderSummary({ mode, ready, pending, failed, message }: OrderSummaryProps) {
  const firstCharge = useFirstCharge()
  const copy = summaryCopy(mode)
  const payable = mode === "trial" || mode === "past_due"

  return (
    <div className="flex flex-col px-4 py-5 sm:px-8 lg:h-full lg:justify-center lg:px-12">
      <p className="text-xs font-medium tracking-[0.18em] text-emerald-300 uppercase">{ui.eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{copy.title}</h2>
      <p className="mt-1.5 text-sm text-slate-400">{copy.body}</p>

      {mode === "trial" ? (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-3">
            <span className="text-sm text-emerald-100">{ui.today}</span>
            <span className="text-sm font-semibold text-white">{ui.todayAmount}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5 py-3">
            <span className="text-sm text-slate-400">{ui.after}</span>
            <span className="text-sm font-medium text-white">{ui.afterAmount}</span>
          </div>
          <p className="text-right text-[11px] text-slate-500">
            {ui.firstCharge}: {firstCharge}
          </p>
        </div>
      ) : null}

      <ul className="mt-5 space-y-3">
        {ui.benefits.map((benefit, index) => {
          const Icon = ICONS[index] ?? Activity
          return (
            <li key={benefit.title} className="flex gap-3">
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-white">{benefit.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-slate-400">{benefit.body}</span>
              </span>
            </li>
          )
        })}
      </ul>

      {payable ? (
        <div className="mt-6 hidden lg:block">
          <TrialButton
            ready={ready}
            pending={pending}
            failed={failed}
            idleLabel={copy.idle}
            pendingLabel={copy.pending}
          />
          {copy.disclaimer ? <p className="mt-2 text-[11px] leading-tight text-slate-500">{copy.disclaimer}</p> : null}
          {message ? <p className="mt-2 text-[11px] leading-tight text-rose-300">{message}</p> : null}
        </div>
      ) : message ? (
        <p className="mt-6 hidden text-[11px] leading-tight text-rose-300 lg:block">{message}</p>
      ) : null}
    </div>
  )
}
