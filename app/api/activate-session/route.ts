import { NextResponse } from "next/server"

import { issueDurableSession } from "@/lib/auth"

export async function POST() {
  const result = await issueDurableSession()
  if (!result.ok) {
    return Response.json({ error: result.error, code: result.code }, { status: result.code === "not_ready" ? 409 : 401 })
  }
  return Response.json({ ok: true })
}

export async function GET(request: Request) {
  const result = await issueDurableSession()
  const path = result.ok
    ? "/dashboard"
    : result.code === "not_ready"
      ? "/checkout?activation=pending"
      : "/checkout?activation=failed"
  return NextResponse.redirect(new URL(path, request.url))
}
