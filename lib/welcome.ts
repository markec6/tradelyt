import { neon } from "@neondatabase/serverless"

import { sendMessage } from "@/lib/telegram"

const WELCOME = (firstName: string) =>
  `Hello ${firstName}, your Tradelyt account is successfully connected and active! Welcome aboard.`

const HYPE =
  "Hyped to get this rolling with you! Consider me your personal risk manager — I'm here to keep your emotions in check and your discipline locked in so we stack wins for the long haul. Let's get it! 📈"

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

export async function maybeSendWelcome(userId: string) {
  try {
    const sql = database()
    const rows = await sql`
      SELECT
        first_name,
        telegram_id::text AS telegram_id,
        welcome_sent_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `
    const row = rows[0]
    if (!row || row.welcome_sent_at) return false
    const telegramId = typeof row.telegram_id === "string" ? row.telegram_id : ""
    const firstName = typeof row.first_name === "string" ? row.first_name.trim() : ""
    if (!telegramId || !firstName) return false

    const hello = await sendMessage(telegramId, WELCOME(firstName))
    if (!hello.ok) {
      console.error("telegram welcome", { step: "hello", errorCode: hello.errorCode, description: hello.description })
      return false
    }

    const hype = await sendMessage(telegramId, HYPE)
    if (!hype.ok) {
      console.error("telegram welcome", { step: "hype", errorCode: hype.errorCode, description: hype.description })
      return false
    }

    const saved = await sql`
      UPDATE users
      SET welcome_sent_at = now()
      WHERE id = ${userId}
        AND welcome_sent_at IS NULL
        AND telegram_id IS NOT NULL
      RETURNING welcome_sent_at
    `
    return Boolean(saved[0]?.welcome_sent_at)
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    console.error("telegram welcome", { step: "failed", description: message.slice(0, 200) })
    return false
  }
}

export async function retryPendingWelcomes() {
  const sql = database()
  const rows = await sql`
    SELECT id
    FROM users
    WHERE welcome_sent_at IS NULL
      AND telegram_id IS NOT NULL
      AND first_name IS NOT NULL
      AND btrim(first_name) <> ''
    ORDER BY updated_at
    LIMIT 20
  `
  let sent = 0
  for (const row of rows) {
    if (typeof row.id !== "string") continue
    if (await maybeSendWelcome(row.id)) sent += 1
  }
  return sent
}
