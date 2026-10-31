import { callingPrefix, toE164 } from "./phone-number"

export type AccountDraft = {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  phoneNumber: string
  country: string
}

export type AccountField = keyof AccountDraft

export type AccountErrors = Partial<Record<AccountField, string>>

export const EMPTY_ACCOUNT: AccountDraft = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phoneNumber: "",
  country: "",
}

export const ACCOUNT_FIELD_ORDER: AccountField[] = [
  "firstName",
  "lastName",
  "email",
  "password",
  "confirmPassword",
  "country",
  "phoneNumber",
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function nameError(value: string, label: string) {
  const trimmed = value.trim()
  if (trimmed.length < 1) return `Enter your ${label}.`
  if (trimmed.length > 80) return "Use 80 characters or fewer."
  return undefined
}

export function validateAccount(draft: AccountDraft, options?: { keepPassword?: boolean }): AccountErrors {
  const errors: AccountErrors = {}

  const firstName = nameError(draft.firstName, "first name")
  const lastName = nameError(draft.lastName, "last name")
  if (firstName) errors.firstName = firstName
  if (lastName) errors.lastName = lastName

  if (!EMAIL.test(draft.email.trim())) {
    errors.email = "Enter a valid email address."
  }

  const password = draft.password
  if (!options?.keepPassword) {
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      errors.password = "Use at least 8 characters, with a letter and a number."
    }

    if (draft.confirmPassword.length === 0) {
      errors.confirmPassword = "Confirm your password."
    } else if (draft.confirmPassword !== draft.password) {
      errors.confirmPassword = "Passwords do not match."
    }
  }

  const countrySelected = /^[A-Z]{2}$/.test(draft.country)
  if (!countrySelected) errors.country = "Select your country."

  const phone = draft.phoneNumber.trim()
  if (!countrySelected) {
    errors.phoneNumber = "Select your country first."
  } else if (!phone || phone === callingPrefix(draft.country)) {
    errors.phoneNumber = "Enter your phone number."
  } else if (!toE164(phone, draft.country)) {
    errors.phoneNumber = "Enter a valid phone number."
  }

  return errors
}
