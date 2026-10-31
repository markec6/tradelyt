import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { readAccess } from "@/lib/access"
import { SESSION_COOKIE, cookieOptions, verifySession } from "@/lib/session"

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const claims = token ? verifySession(token) : null
  if (!claims || claims.kind !== "session") {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  try {
    const access = await readAccess(claims.sub)
    if (!access || access.sessionVersion !== claims.ver || access.accountStatus !== "active") {
      const response = NextResponse.redirect(new URL("/onboarding", request.url))
      response.cookies.set(SESSION_COOKIE, "", cookieOptions(0))
      return response
    }
    if (access.subscriptionStatus !== "trialing" && access.subscriptionStatus !== "active") {
      return NextResponse.redirect(new URL("/checkout", request.url))
    }
  } catch {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
}
