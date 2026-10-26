"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { AccountStep } from "./account-step"
import { TelegramPlaceholder } from "./telegram-placeholder"
import {
  ACCOUNT_FIELD_ORDER,
  EMPTY_ACCOUNT,
  validateAccount,
  type AccountDraft,
  type AccountErrors,
} from "./validate-account"

const STEP_COPY = {
  1: {
    title: "Create your account",
    body: "Name, email, and country. Your password stays in this tab.",
  },
  2: {
    title: "Connect Telegram",
    body: "Alerts land in a private chat. This step is next.",
  },
} as const

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-slate-400">Step {step} of 5</p>
      <div className="mt-2 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-200",
              index < step ? "bg-emerald-400" : "bg-slate-700",
            )}
          />
        ))}
      </div>
    </div>
  )
}

export function OnboardingWizard() {
  const reduced = useReducedMotion()
  const [step, setStep] = useState<1 | 2>(1)
  const [draft, setDraft] = useState<AccountDraft>(EMPTY_ACCOUNT)
  const [errors, setErrors] = useState<AccountErrors>({})
  const copy = STEP_COPY[step]

  function update(patch: Partial<AccountDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(patch) as (keyof AccountDraft)[]) {
        delete next[key]
      }
      return next
    })
  }

  function submitAccount() {
    const nextErrors = validateAccount(draft)
    setErrors(nextErrors)
    const firstInvalid = ACCOUNT_FIELD_ORDER.find((field) => nextErrors[field])
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }
    setStep(2)
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="pointer-events-none fixed top-0 left-1/3 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none fixed top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />

      <div className="relative flex h-full items-center justify-center px-3 sm:px-4">
        <section className="max-h-[94dvh] w-full max-w-lg rounded-3xl border border-emerald-400/35 bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_20px_60px_rgba(0,0,0,0.45),0_0_40px_rgba(16,185,129,0.12)] backdrop-blur-xl sm:p-8">
          <StepIndicator step={step} />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={reduced ? false : { opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: -18 }}
              transition={reduced ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
            >
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:mt-5">{copy.title}</h1>
              <p className="mt-1.5 text-sm leading-snug text-slate-400">{copy.body}</p>
              {step === 1 ? (
                <AccountStep draft={draft} errors={errors} onChange={update} onSubmit={submitAccount} />
              ) : (
                <TelegramPlaceholder />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 flex items-center justify-end gap-3 sm:mt-6">
            {step === 1 ? (
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors duration-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                Back
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors duration-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                Back
              </button>
            )}
            {step === 1 && (
              <button
                type="submit"
                form="account-step"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.28)] transition-colors duration-200 hover:bg-emerald-400"
              >
                Next
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
