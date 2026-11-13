import { neon } from "@neondatabase/serverless"

import { telegramHandleError } from "@/components/onboarding/validate-telegram"

export async function telegramReady(userId: string) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return false
  const sql = neon(databaseUrl)
  const rows = await sql`
    SELECT telegram_id::text AS telegram_id, telegram_username
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `
  const telegramId = rows[0]?.telegram_id
  const username = typeof rows[0]?.telegram_username === "string" ? rows[0].telegram_username.replace(/^@+/, "") : ""
  if (typeof telegramId !== "string" || telegramId.length === 0) return false
  return !telegramHandleError(username)
}
