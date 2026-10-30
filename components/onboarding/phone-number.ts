import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js"

import { dialCode } from "./dial-codes"

const E164 = /^\+[1-9]\d{1,14}$/

function asCountry(country: string): CountryCode | null {
  if (!/^[A-Z]{2}$/.test(country)) return null
  return country as CountryCode
}

export function callingPrefix(country: string) {
  const code = asCountry(country)
  if (!code) return ""
  try {
    return `+${getCountryCallingCode(code)}`
  } catch {
    return dialCode(country)
  }
}

function stripDial(value: string, dial: string) {
  if (!dial || !value.startsWith(dial)) return null
  const rest = value.slice(dial.length)
  if (rest === "") return ""
  if (rest.startsWith(" ") || rest.startsWith("-") || /^\d/.test(rest)) {
    return rest.replace(/^[\s-]+/, "")
  }
  return null
}

export function withDialPrefix(value: string, previousCountry: string, nextCountry: string) {
  const next = callingPrefix(nextCountry)
  if (!next) return value
  const trimmed = value.trim()
  if (!trimmed) return `${next} `

  const previous = callingPrefix(previousCountry)
  const swapped = stripDial(trimmed, previous)
  if (swapped !== null) return swapped ? `${next} ${swapped}` : `${next} `

  if (!trimmed.startsWith("+")) return `${next} ${trimmed}`
  return value
}

export function toE164(value: string, country: string) {
  const code = asCountry(country)
  const trimmed = value.trim()
  if (!code || !trimmed || trimmed === callingPrefix(country)) return null

  let parsed: ReturnType<typeof parsePhoneNumberFromString>
  try {
    parsed = parsePhoneNumberFromString(trimmed, code)
  } catch {
    return null
  }

  if (!parsed?.isValid() || parsed.country !== country) return null
  return E164.test(parsed.number) ? parsed.number : null
}
