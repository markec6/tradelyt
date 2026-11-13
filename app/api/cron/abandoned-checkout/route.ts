import { timingSafeEqual } from "node:crypto"

import { sendAbandonedReminders } from "@/lib/abandoned-checkout"
import { retryPendingWelcomes } from "@/lib/welcome"

export const dynamic = "force-dynamic"

function authorized(header: string | null, secret: string) {
  if (!header?.startsWith("Bearer ")) return false
  const token = header.slice("Bearer ".length)
  const actual = Buffer.from(token)
  const expected = Buffer.from(secret)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: "Cron is not configured." }, { status: 500 })
  if (!authorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 })
  }

  const reminders = await sendAbandonedReminders()
  const welcomes = await retryPendingWelcomes()
  return Response.json({ reminders, welcomes })
}
