import { cookies, headers } from "next/headers"

import { readAccess } from "@/lib/access"
import {
  ONBOARDING_COOKIE,
  ONBOARDING_MAX_AGE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  SIGNUP_COOKIE,
  SIGNUP_SECRET_COOKIE,
  cookieOptions,
  signSession,
  verifySession,
  type SessionClaims,
  type SessionKind,
} from "@/lib/session"

export async function requestCookieOptions(maxAge: number) {
  let secure = process.env.NODE_ENV === "production"
  if (!secure) {
    try {
      secure = (await headers()).get("x-forwarded-proto") === "https"
    } catch {
      secure = false
    }
  }
  return cookieOptions(maxAge, secure)
}

function cookieName(kind: SessionKind) {
  if (kind === "session") return SESSION_COOKIE
  if (kind === "signup") return SIGNUP_COOKIE
  return ONBOARDING_COOKIE
}

async function readClaims(kind: SessionKind): Promise<SessionClaims | null> {
  const store = await cookies()
  const token = store.get(cookieName(kind))?.value
  if (!token) return null
  const claims = verifySession(token)
  if (!claims || claims.kind !== kind) return null
  return claims
}

async function claimsStillValid(claims: SessionClaims, allowed: string[]) {
  const access = await readAccess(claims.sub)
  if (!access || access.sessionVersion !== claims.ver) return null
  if (!allowed.includes(access.accountStatus)) return null
  return claims.sub
}

export async function readUserIdFromCookies() {
  const claims = await readClaims("session")
  if (!claims) return null
  return claimsStillValid(claims, ["active"])
}

export async function readOnboardingUserId() {
  const claims = await readClaims("onboarding")
  if (!claims) return null
  return claimsStillValid(claims, ["pending", "active"])
}

export async function readActorUserId() {
  return (await readUserIdFromCookies()) ?? (await readOnboardingUserId())
}

export async function readSignedUserId() {
  const session = await readClaims("session")
  if (session) return session.sub
  const onboarding = await readClaims("onboarding")
  return onboarding?.sub ?? null
}

export async function readPendingSignupId() {
  const claims = await readClaims("signup")
  return claims?.sub ?? null
}

export async function setSignupCookie(pendingId: string, maxAge: number) {
  const store = await cookies()
  store.set(
    SIGNUP_COOKIE,
    signSession({ sub: pendingId, ver: 0, kind: "signup", maxAge }),
    await requestCookieOptions(maxAge),
  )
}

export async function clearSignupCookie() {
  const store = await cookies()
  const options = await requestCookieOptions(0)
  store.set(SIGNUP_COOKIE, "", options)
  store.set(SIGNUP_SECRET_COOKIE, "", options)
}

export async function setSessionCookie(userId: string, ver: number) {
  const store = await cookies()
  store.set(
    SESSION_COOKIE,
    signSession({ sub: userId, ver, kind: "session", maxAge: SESSION_MAX_AGE }),
    await requestCookieOptions(SESSION_MAX_AGE),
  )
}

export async function setOnboardingCookie(userId: string, ver: number) {
  const store = await cookies()
  store.set(
    ONBOARDING_COOKIE,
    signSession({ sub: userId, ver, kind: "onboarding", maxAge: ONBOARDING_MAX_AGE }),
    await requestCookieOptions(ONBOARDING_MAX_AGE),
  )
}

export async function clearAuthCookies() {
  const store = await cookies()
  const options = await requestCookieOptions(0)
  store.set(SESSION_COOKIE, "", options)
  store.set(ONBOARDING_COOKIE, "", options)
  store.set(SIGNUP_COOKIE, "", options)
  store.set(SIGNUP_SECRET_COOKIE, "", options)
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.set(SESSION_COOKIE, "", await requestCookieOptions(0))
}

export async function clearOnboardingCookie() {
  const store = await cookies()
  store.set(ONBOARDING_COOKIE, "", await requestCookieOptions(0))
}
