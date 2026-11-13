import { cookies } from "next/headers"

import { encryptionKey, openSecret, sealSecret } from "@/app/onboarding/secret-box"
import { SIGNUP_SECRET_COOKIE } from "@/lib/session"
import { requestCookieOptions } from "@/lib/session-store"

export async function setSignupPassword(password: string, maxAge: number) {
  const key = encryptionKey()
  if (!key) return false
  const store = await cookies()
  store.set(SIGNUP_SECRET_COOKIE, sealSecret(password, key), await requestCookieOptions(maxAge))
  return true
}

export async function readSignupPassword() {
  const key = encryptionKey()
  if (!key) return null
  const store = await cookies()
  const sealed = store.get(SIGNUP_SECRET_COOKIE)?.value
  if (!sealed) return null
  return openSecret(sealed, key)
}
