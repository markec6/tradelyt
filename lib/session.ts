import { createHmac, timingSafeEqual } from "node:crypto"

export const SESSION_COOKIE = "tradelyt_uid"
export const ONBOARDING_COOKIE = "tradelyt_onboarding"
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30
export const ONBOARDING_MAX_AGE = 60 * 60 * 2

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type SessionKind = "session" | "onboarding"

export type SessionClaims = {
  sub: string
  iat: number
  exp: number
  ver: number
  kind: SessionKind
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  }
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null
  return secret
}

export function signSession(input: { sub: string; ver: number; kind: SessionKind; maxAge: number }) {
  const secret = sessionSecret()
  if (!secret) throw new Error("SESSION_SECRET is not set")
  const iat = Math.floor(Date.now() / 1000)
  const claims: SessionClaims = {
    sub: input.sub,
    ver: input.ver,
    kind: input.kind,
    iat,
    exp: iat + input.maxAge,
  }
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url")
  const signature = createHmac("sha256", secret).update(body).digest("base64url")
  return `${body}.${signature}`
}

export function verifySession(token: string): SessionClaims | null {
  const secret = sessionSecret()
  if (!secret) return null
  const dot = token.lastIndexOf(".")
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const expected = createHmac("sha256", secret).update(body).digest("base64url")
  const actualBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)
  if (actualBytes.length !== expectedBytes.length) return null
  if (!timingSafeEqual(actualBytes, expectedBytes)) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const claims = parsed as Partial<SessionClaims>
  if (typeof claims.sub !== "string" || !USER_ID.test(claims.sub)) return null
  if (typeof claims.iat !== "number" || typeof claims.exp !== "number" || typeof claims.ver !== "number") return null
  if (!Number.isInteger(claims.ver) || claims.ver < 0) return null
  if (claims.kind !== "session" && claims.kind !== "onboarding") return null
  const now = Math.floor(Date.now() / 1000)
  if (claims.exp <= now || claims.iat > now + 60) return null
  return { sub: claims.sub, iat: claims.iat, exp: claims.exp, ver: claims.ver, kind: claims.kind }
}
