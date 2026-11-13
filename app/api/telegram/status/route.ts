import { neon } from "@neondatabase/serverless"

import { telegramHandleError } from "@/components/onboarding/validate-telegram"
import { TELEGRAM_AVATAR_PATH } from "@/lib/telegram"
import { readActorUserId } from "@/lib/session-store"

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export async function GET() {
  const userId = await readActorUserId()
  if (!userId) {
    return Response.json({ error: "Save your account before connecting Telegram." }, { status: 401 })
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return Response.json({ error: "Could not check Telegram." }, { status: 500 })
  }

  const sql = neon(databaseUrl)
  const rows = await sql`
    SELECT
      telegram_id::text AS telegram_id,
      telegram_username,
      telegram_photo_file_id
    FROM users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `
  const row = rows[0]
  if (!row) {
    return Response.json({ error: "Save your account before connecting Telegram." }, { status: 401 })
  }

  const username = text(row.telegram_username).replace(/^@+/, "")
  const verified = text(row.telegram_id).length > 0
  const hasUsername = !telegramHandleError(username)
  const avatarUrl = verified && text(row.telegram_photo_file_id) ? TELEGRAM_AVATAR_PATH : null

  return Response.json({
    verified,
    hasUsername,
    username: hasUsername ? username : "",
    avatarUrl,
  })
}
