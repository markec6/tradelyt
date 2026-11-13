import { NextResponse } from "next/server"

import { completeSignup } from "@/lib/complete-signup"

export async function POST() {
  const result = await completeSignup()
  if (!result.ok) {
    return Response.json({ error: result.error, code: result.code }, { status: result.status })
  }
  return Response.json({ ok: true })
}

export async function GET(request: Request) {
  const result = await completeSignup()
  const path = result.ok
    ? "/dashboard"
    : result.code === "not_ready"
      ? "/checkout?activation=pending"
      : result.code === "expired"
        ? "/onboarding"
        : "/checkout?activation=failed"
  return NextResponse.redirect(new URL(path, request.url))
}
