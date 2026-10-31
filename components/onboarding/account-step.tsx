import Link from "next/link"

import { CountrySelect } from "./country-select"
import { FloatingField } from "./floating-field"
import { PhoneField } from "./phone-field"
import { withDialPrefix } from "./phone-number"
import type { AccountDraft, AccountErrors } from "./validate-account"

type AccountStepProps = {
  draft: AccountDraft
  errors: AccountErrors
  passwordHint?: string
  onChange: (patch: Partial<AccountDraft>) => void
  onSubmit: () => void
}

export function AccountStep({ draft, errors, passwordHint, onChange, onSubmit }: AccountStepProps) {
  return (
    <form
      id="account-step"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3"
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <FloatingField
          id="firstName"
          label="First name"
          autoComplete="given-name"
          value={draft.firstName}
          error={errors.firstName}
          onChange={(firstName) => onChange({ firstName })}
        />
        <FloatingField
          id="lastName"
          label="Last name"
          autoComplete="family-name"
          value={draft.lastName}
          error={errors.lastName}
          onChange={(lastName) => onChange({ lastName })}
        />
      </div>
      <FloatingField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        value={draft.email}
        error={errors.email}
        onChange={(email) => onChange({ email })}
      />
      <p className="text-right text-[11px] leading-tight text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-300 hover:text-emerald-200">
          Sign in
        </Link>
      </p>
      <FloatingField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        revealable
        hint={passwordHint ?? "At least 8 characters, with a letter and a number."}
        value={draft.password}
        error={errors.password}
        onChange={(password) => onChange({ password })}
      />
      <FloatingField
        id="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        revealable
        value={draft.confirmPassword}
        error={errors.confirmPassword}
        onChange={(confirmPassword) => onChange({ confirmPassword })}
      />
      <CountrySelect
        id="country"
        value={draft.country}
        error={errors.country}
        onChange={(country) => {
          onChange({
            country,
            phoneNumber: withDialPrefix(draft.phoneNumber, draft.country, country),
          })
          requestAnimationFrame(() => {
            const field = document.getElementById("phoneNumber")
            if (!(field instanceof HTMLInputElement)) return
            field.focus()
            const end = field.value.length
            field.setSelectionRange(end, end)
          })
        }}
      />
      <PhoneField
        id="phoneNumber"
        country={draft.country}
        value={draft.phoneNumber}
        error={errors.phoneNumber}
        onChange={(phoneNumber) => onChange({ phoneNumber })}
      />
    </form>
  )
}
