import { cookies } from "next/headers"

import { readAccess } from "@/lib/access"
import {
  ONBOARDING_COOKIE,
  ONBOARDING_MAX_AGE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  cookieOptions,
  signSession,
  verifySession,
  type SessionClaims,
  type SessionKind,
} from "@/lib/session"

async function readClaims(kind: SessionKind): Promise<SessionClaims | null> {
  const store = await cookies()
  const token = store.get(kind === "session" ? SESSION_COOKIE : ONBOARDING_COOKIE)?.value
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

export async function setSessionCookie(userId: string, ver: number) {
  const store = await cookies()
  store.set(
    SESSION_COOKIE,
    signSession({ sub: userId, ver, kind: "session", maxAge: SESSION_MAX_AGE }),
    cookieOptions(SESSION_MAX_AGE),
  )
}

export async function setOnboardingCookie(userId: string, ver: number) {
  const store = await cookies()
  store.set(
    ONBOARDING_COOKIE,
    signSession({ sub: userId, ver, kind: "onboarding", maxAge: ONBOARDING_MAX_AGE }),
    cookieOptions(ONBOARDING_MAX_AGE),
  )
}

export async function clearAuthCookies() {
  const store = await cookies()
  store.set(SESSION_COOKIE, "", cookieOptions(0))
  store.set(ONBOARDING_COOKIE, "", cookieOptions(0))
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.set(SESSION_COOKIE, "", cookieOptions(0))
}

export async function clearOnboardingCookie() {
  const store = await cookies()
  store.set(ONBOARDING_COOKIE, "", cookieOptions(0))
}
