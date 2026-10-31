"use client"

import { CardCvcElement, CardExpiryElement, CardNumberElement } from "@stripe/react-stripe-js"
import type {
  StripeCardCvcElementChangeEvent,
  StripeCardExpiryElementChangeEvent,
  StripeCardNumberElementChangeEvent,
} from "@stripe/stripe-js"
import { useState, type ReactNode } from "react"

import { fieldControlClass, fieldLabelClass, FloatingField } from "@/components/onboarding/floating-field"
import { cn } from "@/lib/utils"
import { ui } from "./copy"

export type CardBrand = "visa" | "mastercard" | "amex" | "unknown"

export type CardFields = {
  name: string
  brand: CardBrand
  numberEmpty: boolean
  numberComplete: boolean
  numberError: string
  expiryComplete: boolean
  expiryError: string
  cvcComplete: boolean
  cvcError: string
}

const elementOptions = {
  style: {
    base: {
      color: "#ffffff",
      fontSize: "14px",
      fontSmoothing: "antialiased" as const,
      "::placeholder": { color: "#64748b" },
    },
    invalid: { color: "#fecdd3" },
  },
  placeholder: "",
}

function brandOf(brand: StripeCardNumberElementChangeEvent["brand"]): CardBrand {
  if (brand === "visa" || brand === "mastercard" || brand === "amex") return brand
  return "unknown"
}

function StripeElementField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: (setFocused: (focused: boolean) => void) => ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <div className="relative">
        <div className={cn(fieldControlClass(focused, error), "flex items-center")}>
          <div className="w-full">{children(setFocused)}</div>
        </div>
        <span className={fieldLabelClass(true, focused, error)}>{label}</span>
      </div>
      {error ? <p className="mt-1 text-[11px] leading-tight text-rose-300">{error}</p> : null}
    </div>
  )
}

type CardFormProps = {
  fields: CardFields
  onChange: (patch: Partial<CardFields>) => void
  onSubmit: () => void
}

export function CardForm({ fields, onChange, onSubmit }: CardFormProps) {
  return (
    <form
      id="checkout-card"
      className="mt-5 space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <FloatingField
        id="cardholderName"
        label={ui.nameLabel}
        value={fields.name}
        autoComplete="cc-name"
        onChange={(name) => onChange({ name })}
      />
      <StripeElementField label={ui.numberLabel} error={fields.numberError}>
        {(setFocused) => (
          <CardNumberElement
            options={{ ...elementOptions, showIcon: false }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event: StripeCardNumberElementChangeEvent) =>
              onChange({
                brand: brandOf(event.brand),
                numberEmpty: event.empty,
                numberComplete: event.complete,
                numberError: event.error?.message ?? "",
              })
            }
          />
        )}
      </StripeElementField>
      <div className="grid grid-cols-2 gap-3">
        <StripeElementField label={ui.expiryLabel} error={fields.expiryError}>
          {(setFocused) => (
            <CardExpiryElement
              options={elementOptions}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(event: StripeCardExpiryElementChangeEvent) =>
                onChange({
                  expiryComplete: event.complete,
                  expiryError: event.error?.message ?? "",
                })
              }
            />
          )}
        </StripeElementField>
        <StripeElementField label={ui.cvcLabel} error={fields.cvcError}>
          {(setFocused) => (
            <CardCvcElement
              options={elementOptions}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(event: StripeCardCvcElementChangeEvent) =>
                onChange({
                  cvcComplete: event.complete,
                  cvcError: event.error?.message ?? "",
                })
              }
            />
          )}
        </StripeElementField>
      </div>
    </form>
  )
}
