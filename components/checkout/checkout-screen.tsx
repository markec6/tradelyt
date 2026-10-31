"use client"

import { Elements, CardNumberElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { CardForm, type CardFields } from "./card-form"
import { CardPreview } from "./card-preview"
import { ui } from "./copy"
import type { CheckoutMode } from "./mode"
import { OrderSummary, TrialButton } from "./order-summary"
import { SuccessOverlay } from "./success-overlay"

const appearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#34d399",
    colorBackground: "#020617",
    colorText: "#ffffff",
    colorDanger: "#fda4af",
    borderRadius: "12px",
  },
}

let stripePromise: ReturnType<typeof loadStripe> | null = null

function stripeClient(publishableKey: string) {
  if (!stripePromise) stripePromise = loadStripe(publishableKey)
  return stripePromise
}

type Phase = "idle" | "submitting" | "confirming" | "success" | "error"

function readyFields(fields: CardFields) {
  return (
    fields.name.trim().length >= 2 &&
    fields.numberComplete &&
    fields.expiryComplete &&
    fields.cvcComplete &&
    !fields.numberError &&
    !fields.expiryError &&
    !fields.cvcError
  )
}

function CheckoutLayout({
  defaultName,
  activationError,
  mode,
}: {
  defaultName: string
  activationError: string
  mode: CheckoutMode
}) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [fields, setFields] = useState<CardFields>({
    name: defaultName,
    brand: "unknown",
    numberEmpty: true,
    numberComplete: false,
    numberError: "",
    expiryComplete: false,
    expiryError: "",
    cvcComplete: false,
    cvcError: "",
  })
  const [phase, setPhase] = useState<Phase>("idle")
  const [message, setMessage] = useState(activationError)
  const pending = phase === "submitting" || phase === "confirming" || phase === "success"
  const ready = readyFields(fields)
  const payable = mode === "trial" || mode === "past_due"
  const fallback = mode === "past_due" ? ui.pastDueError : ui.genericError
  const summaryCopy =
    mode === "past_due"
      ? { idle: ui.pastDueCta, pending: ui.pastDueCtaPending, disclaimer: ui.pastDueDisclaimer }
      : { idle: ui.cta, pending: ui.ctaPending, disclaimer: ui.disclaimer }

  async function openDashboard() {
    const response = await fetch("/api/activate-session", { method: "POST" })
    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null)
      const code = payload && typeof payload === "object" && "code" in payload ? payload.code : undefined
      const error =
        payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : ui.genericError
      if (code === "not_ready") {
        setMessage("Your trial is still confirming. Try again in a moment.")
        setPhase("idle")
        return
      }
      setMessage(error)
      setPhase("error")
      return
    }
    router.push("/dashboard")
  }

  async function startTrial() {
    if (!payable || !ready || pending || !stripe || !elements) return
    const card = elements.getElement(CardNumberElement)
    if (!card) return
    setPhase("submitting")
    setMessage("")
    try {
      const response = await fetch(mode === "past_due" ? "/api/pay-invoice" : "/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardholderName: fields.name.trim() }),
      })
      const payload: unknown = await response.json()
      const code = payload && typeof payload === "object" && "code" in payload ? payload.code : undefined
      if (code === "already_subscribed") {
        await openDashboard()
        return
      }
      if (!response.ok) {
        const error = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : fallback
        setMessage(error)
        setPhase("error")
        return
      }
      const clientSecret =
        payload && typeof payload === "object" && "clientSecret" in payload && typeof payload.clientSecret === "string"
          ? payload.clientSecret
          : ""
      if (!clientSecret) {
        setMessage(fallback)
        setPhase("error")
        return
      }
      setPhase("confirming")
      const billing = { payment_method: { card, billing_details: { name: fields.name.trim() } } }
      const result =
        mode === "past_due" ? await stripe.confirmCardPayment(clientSecret, billing) : await stripe.confirmCardSetup(clientSecret, billing)
      if (result.error) {
        setMessage(result.error.message ?? fallback)
        setPhase("error")
        return
      }
      setPhase("success")
      window.setTimeout(() => void openDashboard(), 1600)
    } catch {
      setMessage(fallback)
      setPhase("error")
    }
  }

  return (
    <div className="relative grid min-h-screen lg:h-dvh lg:grid-cols-2 lg:grid-rows-1">
      <section className="relative order-2 px-4 py-5 lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:px-10 lg:py-8">
        <div className="mx-auto flex w-full max-w-md flex-col lg:min-h-full lg:justify-center">
          {payable ? (
            <>
              <CardPreview fields={fields} locked={phase === "success"} />
              <CardForm fields={fields} onChange={(patch) => setFields((current) => ({ ...current, ...patch }))} onSubmit={() => void startTrial()} />
            </>
          ) : (
            <p className="text-sm leading-snug text-slate-300">
              {mode === "canceled" ? ui.canceledBody : ui.blockedBody}
            </p>
          )}
        </div>
        {phase === "success" ? (
          <SuccessOverlay
            title={mode === "past_due" ? ui.pastDueSuccessTitle : ui.successTitle}
            body={mode === "past_due" ? ui.pastDueSuccessBody : ui.successBody}
          />
        ) : null}
      </section>
      <aside className="order-1 border-b border-white/10 lg:order-2 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-l lg:border-white/10">
        <OrderSummary mode={mode} ready={ready} pending={pending} failed={phase === "error"} message={message} />
      </aside>
      {payable ? (
        <div className="order-3 border-t border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur lg:hidden">
          <TrialButton
            ready={ready}
            pending={pending}
            failed={phase === "error"}
            idleLabel={summaryCopy.idle}
            pendingLabel={summaryCopy.pending}
          />
          <p className="mt-2 text-[11px] leading-tight text-slate-500">{summaryCopy.disclaimer}</p>
          {message ? <p className="mt-2 text-[11px] leading-tight text-rose-300">{message}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export function CheckoutScreen({
  publishableKey,
  defaultName,
  activationError = "",
  mode = "trial",
}: {
  publishableKey: string
  defaultName: string
  activationError?: string
  mode?: CheckoutMode
}) {
  if (!publishableKey) {
    return (
      <main className="grid h-dvh place-items-center bg-slate-950 px-6 text-center text-sm text-slate-300">
        {ui.configError}
      </main>
    )
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 lg:h-dvh lg:overflow-hidden">
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
      <div className="relative min-h-screen lg:h-dvh">
        <Elements stripe={stripeClient(publishableKey)} options={{ appearance }}>
          <CheckoutLayout defaultName={defaultName} activationError={activationError} mode={mode} />
        </Elements>
      </div>
    </main>
  )
}
