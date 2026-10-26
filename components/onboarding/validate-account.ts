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
  "phoneNumber",
  "country",
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^[0-9+\s]{6,20}$/

function nameError(value: string, label: string) {
  const trimmed = value.trim()
  if (trimmed.length < 1) return `Enter your ${label}.`
  if (trimmed.length > 80) return "Use 80 characters or fewer."
  return undefined
}

export function validateAccount(draft: AccountDraft): AccountErrors {
  const errors: AccountErrors = {}

  const firstName = nameError(draft.firstName, "first name")
  const lastName = nameError(draft.lastName, "last name")
  if (firstName) errors.firstName = firstName
  if (lastName) errors.lastName = lastName

  if (!EMAIL.test(draft.email.trim())) {
    errors.email = "Enter a valid email address."
  }

  const password = draft.password
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.password = "Use at least 8 characters, with a letter and a number."
  }

  if (draft.confirmPassword.length === 0) {
    errors.confirmPassword = "Confirm your password."
  } else if (draft.confirmPassword !== draft.password) {
    errors.confirmPassword = "Passwords do not match."
  }

  const phone = draft.phoneNumber.trim()
  if (phone.length > 0 && (!PHONE.test(phone) || !/\d/.test(phone))) {
    errors.phoneNumber = "Use 6–20 digits, spaces, or +."
  }

  if (!/^[A-Z]{2}$/.test(draft.country)) {
    errors.country = "Select your country."
  }

  return errors
}
