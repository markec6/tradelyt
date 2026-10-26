import { CountrySelect } from "./country-select"
import { FloatingField } from "./floating-field"
import type { AccountDraft, AccountErrors } from "./validate-account"

type AccountStepProps = {
  draft: AccountDraft
  errors: AccountErrors
  onChange: (patch: Partial<AccountDraft>) => void
  onSubmit: () => void
}

export function AccountStep({ draft, errors, onChange, onSubmit }: AccountStepProps) {
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
      <FloatingField
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        revealable
        hint="At least 8 characters, with a letter and a number."
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
      <FloatingField
        id="phoneNumber"
        label="Phone (optional)"
        type="tel"
        autoComplete="tel"
        value={draft.phoneNumber}
        error={errors.phoneNumber}
        onChange={(phoneNumber) => onChange({ phoneNumber })}
      />
      <CountrySelect
        id="country"
        value={draft.country}
        error={errors.country}
        onChange={(country) => onChange({ country })}
      />
    </form>
  )
}
