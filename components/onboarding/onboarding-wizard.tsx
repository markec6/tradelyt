"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { launchTradelyt, saveAccount, saveExchange, saveRisk, saveTelegram } from "@/app/onboarding/actions"
import { AccountStep } from "./account-step"
import { ExchangeStep } from "./exchange-step"
import { useOnboarding } from "./onboarding-context"
import { ReviewStep } from "./review-step"
import { RiskStep } from "./risk-step"
import { TelegramStep } from "./telegram-step"
import {
  ACCOUNT_FIELD_ORDER,
  EMPTY_ACCOUNT,
  validateAccount,
  type AccountDraft,
  type AccountErrors,
} from "./validate-account"
import { EMPTY_TELEGRAM, telegramHandleError, type TelegramDraft } from "./validate-telegram"
import type { OnboardingResume } from "./resume"
import {
  EMPTY_EXCHANGE,
  EXCHANGE_FIELD_ORDER,
  validateExchange,
  type ExchangeDraft,
  type ExchangeErrors,
} from "./validate-exchange"
import {
  EMPTY_RISK,
  RISK_FIELD_ORDER,
  validateRisk,
  withDefaults,
  type RiskDraft,
  type RiskErrors,
} from "./validate-risk"

const STEP_COPY = {
  1: {
    title: "Create your account",
    body: "Name, email, and phone.",
  },
  2: {
    title: "Connect Telegram",
    body: "Your name and the alerts you want.",
  },
  3: {
    title: "Connect your exchange",
    body: "Sandbox keys only.",
  },
  4: {
    title: "Set your risk limits",
    body: "One strategy and the limits that stop the bot.",
  },
  5: {
    title: "Review and launch",
    body: "Telegram, exchange, strategy, and risk. Next: start your free trial.",
  },
} as const

function StepIndicator({ step }: { step: 1 | 2 | 3 | 4 | 5 }) {
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

export function OnboardingWizard({ resume }: { resume: OnboardingResume | null }) {
  const reduced = useReducedMotion()
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(resume?.step ?? 1)
  const [draft, setDraft] = useState<AccountDraft>(resume?.account ?? EMPTY_ACCOUNT)
  const [telegram, setTelegram] = useState<TelegramDraft>(resume?.telegram ?? EMPTY_TELEGRAM)
  const [exchange, setExchange] = useState<ExchangeDraft>(resume?.exchange ?? EMPTY_EXCHANGE)
  const [risk, setRisk] = useState<RiskDraft>(resume?.risk ?? EMPTY_RISK)
  const { userId, setUserId } = useOnboarding()
  const [errors, setErrors] = useState<AccountErrors>({})
  const [telegramErrors, setTelegramErrors] = useState<{ handle?: string; form?: string }>({})
  const [exchangeErrors, setExchangeErrors] = useState<ExchangeErrors>({})
  const [riskErrors, setRiskErrors] = useState<RiskErrors>({})
  const [launchError, setLaunchError] = useState("")
  const [saving, setSaving] = useState(false)
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

  async function submitAccount() {
    const keepPassword = Boolean(userId) && draft.password.length === 0 && draft.confirmPassword.length === 0
    const nextErrors = validateAccount(draft, { keepPassword })
    setErrors(nextErrors)
    const firstInvalid = ACCOUNT_FIELD_ORDER.find((field) => nextErrors[field])
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    setSaving(true)
    try {
      const result = await saveAccount(draft)
      if (!result.ok) {
        setErrors(result.errors)
        const field = ACCOUNT_FIELD_ORDER.find((key) => result.errors[key])
        if (field) document.getElementById(field)?.focus()
        return
      }
      setUserId(result.userId)
      setDraft((current) => ({ ...current, phoneNumber: result.phoneNumber }))
      setStep(2)
    } finally {
      setSaving(false)
    }
  }

  function updateTelegram(patch: Partial<TelegramDraft>) {
    setTelegram((current) => ({ ...current, ...patch }))
    setTelegramErrors((current) => {
      const next = { ...current }
      if ("handle" in patch) delete next.handle
      delete next.form
      return next
    })
  }

  async function submitTelegram() {
    const handleError = telegramHandleError(telegram.handle)
    if (handleError) {
      setTelegramErrors({ handle: handleError })
      document.getElementById("telegramHandle")?.focus()
      return
    }
    if (!userId) {
      setTelegramErrors({ form: "Save your account before connecting Telegram." })
      return
    }

    setSaving(true)
    try {
      const result = await saveTelegram(telegram)
      if (!result.ok) {
        setTelegramErrors(result.errors)
        if (result.errors.handle) document.getElementById("telegramHandle")?.focus()
        return
      }
      setStep(3)
    } finally {
      setSaving(false)
    }
  }

  function updateExchange(patch: Partial<ExchangeDraft>) {
    setExchange((current) => ({ ...current, ...patch }))
    setExchangeErrors((current) => {
      const next = { ...current }
      if ("apiKey" in patch) delete next.apiKey
      if ("apiSecret" in patch) delete next.apiSecret
      if ("passphrase" in patch) delete next.passphrase
      if ("mode" in patch) delete next.form
      if ("exchange" in patch) {
        delete next.apiKey
        delete next.apiSecret
        delete next.passphrase
        delete next.form
      }
      delete next.form
      return next
    })
  }

  async function submitExchange() {
    const nextErrors = validateExchange(exchange)
    setExchangeErrors(nextErrors)
    if (nextErrors.form) return
    const field = EXCHANGE_FIELD_ORDER.find((key) => nextErrors[key])
    if (field) {
      document.getElementById(field)?.focus()
      return
    }
    if (!userId) {
      setExchangeErrors({ form: "Save your account before connecting an exchange." })
      return
    }

    setSaving(true)
    try {
      const result = await saveExchange(exchange)
      if (!result.ok) {
        setExchangeErrors(result.errors)
        if (result.errors.apiKey) document.getElementById("apiKey")?.focus()
        else if (result.errors.apiSecret) document.getElementById("apiSecret")?.focus()
        else if (result.errors.passphrase) document.getElementById("passphrase")?.focus()
        return
      }
      setStep(4)
    } finally {
      setSaving(false)
    }
  }

  function updateRisk(patch: Partial<RiskDraft>) {
    setRisk((current) => ({ ...current, ...patch }))
    setRiskErrors((current) => {
      const next = { ...current }
      if ("maxDrawdown" in patch) delete next.maxDrawdown
      if ("riskPerTrade" in patch) delete next.riskPerTrade
      if ("strategy" in patch) delete next.form
      delete next.form
      return next
    })
  }

  async function submitRisk() {
    const draft = withDefaults(risk)
    if (draft.maxDrawdown !== risk.maxDrawdown || draft.riskPerTrade !== risk.riskPerTrade) setRisk(draft)
    const nextErrors = validateRisk(draft)
    setRiskErrors(nextErrors)
    if (nextErrors.form) return
    const field = RISK_FIELD_ORDER.find((key) => nextErrors[key])
    if (field) {
      document.getElementById(field)?.focus()
      return
    }
    if (!userId) {
      setRiskErrors({ form: "Save your account before setting risk limits." })
      return
    }

    setSaving(true)
    try {
      const result = await saveRisk(draft)
      if (!result.ok) {
        setRiskErrors(result.errors)
        if (result.errors.maxDrawdown) document.getElementById("maxDrawdown")?.focus()
        else if (result.errors.riskPerTrade) document.getElementById("riskPerTrade")?.focus()
        return
      }
      setStep(5)
    } finally {
      setSaving(false)
    }
  }

  async function launch() {
    if (!userId) {
      setLaunchError("Save your account before launching.")
      return
    }

    setSaving(true)
    setLaunchError("")
    try {
      const result = await launchTradelyt()
      if (!result.ok) {
        setLaunchError(result.error)
        return
      }
      router.push("/checkout")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="relative min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
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

      <div className="relative flex min-h-dvh flex-col px-3 py-4 sm:px-4">
        <section
          data-account-id={userId ?? undefined}
          className="m-auto w-full max-w-lg rounded-3xl border border-emerald-400/35 bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_20px_60px_rgba(0,0,0,0.45),0_0_40px_rgba(16,185,129,0.12)] backdrop-blur-xl sm:p-8"
        >
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
              {copy.body ? <p className="mt-1.5 text-sm leading-snug text-slate-400">{copy.body}</p> : null}
              {step === 1 ? (
                <AccountStep
                  draft={draft}
                  errors={errors}
                  passwordHint={
                    userId
                      ? "Leave blank to keep your password. Or use 8+ characters, with a letter and a number."
                      : undefined
                  }
                  onChange={update}
                  onSubmit={submitAccount}
                />
              ) : step === 2 ? (
                <TelegramStep
                  draft={telegram}
                  handleError={telegramErrors.handle}
                  formError={telegramErrors.form}
                  onChange={updateTelegram}
                  onSubmit={submitTelegram}
                />
              ) : step === 3 ? (
                <ExchangeStep
                  draft={exchange}
                  errors={exchangeErrors}
                  onChange={updateExchange}
                  onSubmit={submitExchange}
                />
              ) : step === 4 ? (
                <RiskStep draft={risk} errors={riskErrors} onChange={updateRisk} onSubmit={submitRisk} />
              ) : (
                <ReviewStep telegram={telegram} exchange={exchange} risk={risk} />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 sm:mt-6">
            <div className="flex items-center justify-end gap-3">
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
                onClick={() => {
                  setLaunchError("")
                  setStep(step === 5 ? 4 : step === 4 ? 3 : step === 3 ? 2 : 1)
                }}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors duration-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                Back
              </button>
            )}
            {step < 5 ? (
              <button
                type="submit"
                form={
                  step === 1 ? "account-step" : step === 2 ? "telegram-step" : step === 3 ? "exchange-step" : "risk-step"
                }
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.28)] transition-colors duration-200 hover:bg-emerald-400 disabled:opacity-70"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void launch()}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.28)] transition-colors duration-200 hover:bg-emerald-400 disabled:opacity-70"
              >
                Launch Tradelyt
              </button>
            )}
            </div>
            {launchError ? <p className="mt-2 text-right text-[11px] leading-tight text-rose-300">{launchError}</p> : null}
          </div>
        </section>
      </div>
    </main>
  )
}
