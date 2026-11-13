import { neon } from "@neondatabase/serverless"

import { consumeLinkToken, hashLinkToken } from "@/lib/link-tokens"
import {
  TELEGRAM_AVATAR_PATH,
  getUserProfilePhotos,
  parseUpdate,
  returnToTradelytKeyboard,
  sendMessage,
  verifyTelegramSecret,
  type TelegramMessage,
  type TelegramReplyMarkup,
  type TelegramUpdate,
} from "@/lib/telegram"

const START_FROM_SITE = "Start verification from the Tradelyt site."
const TAKEN = "Ovaj Telegram nalog je već povezan sa drugim Tradelyt nalogom."
const CONNECTED =
  "🚀 Your Tradelyt account is successfully connected via Telegram! Click the button below to return to the platform and continue your setup."
const START = /^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(\S+))?\s*$/

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

function startPayload(text: string | undefined) {
  if (!text) return { command: false as const }
  const trimmed = text.trim()
  if (!/^\/start(?:@|\s|$)/.test(trimmed)) return { command: false as const }
  const payload = START.exec(trimmed)?.[1]
  if (!payload || payload.length > 64) return { command: true as const, payload: null }
  return { command: true as const, payload }
}

async function claimUpdate(updateId: string) {
  const rows = await database()`
    INSERT INTO telegram_updates (update_id)
    VALUES (${updateId})
    ON CONFLICT (update_id) DO NOTHING
    RETURNING update_id
  `
  return rows.length > 0
}

async function releaseUpdate(updateId: string) {
  await database()`DELETE FROM telegram_updates WHERE update_id = ${updateId}`
}

async function syncAvatar(userId: string, telegramId: string) {
  const photo = await getUserProfilePhotos(telegramId)
  if (!photo.ok) return
  const sql = database()
  if (!photo.fileId) {
    await sql`
      UPDATE users
      SET telegram_photo_file_id = NULL, telegram_avatar_url = NULL, updated_at = now()
      WHERE id = ${userId}::uuid
    `
    return
  }
  await sql`
    UPDATE users
    SET
      telegram_photo_file_id = ${photo.fileId},
      telegram_avatar_url = ${TELEGRAM_AVATAR_PATH},
      updated_at = now()
    WHERE id = ${userId}::uuid
  `
}

function logWebhook(reason: string, errorCode?: number | null, description?: string) {
  if (description) {
    console.error("telegram webhook", reason, errorCode ?? "", description)
    return
  }
  console.error("telegram webhook", reason)
}

async function reply(message: TelegramMessage, text: string, replyMarkup?: TelegramReplyMarkup) {
  const sent = await sendMessage(message.chat.id, text, replyMarkup)
  if (!sent.ok) logWebhook("sendMessage", sent.errorCode, sent.description)
}

async function handleUpdate(update: TelegramUpdate) {
  const message = update.message
  if (!message || message.chat.type !== "private" || message.chat.id !== message.from.id) {
    logWebhook("ignored")
    return
  }
  const start = startPayload(message.text)
  if (!start.command) {
    logWebhook("ignored")
    return
  }
  if (!start.payload) {
    await reply(message, START_FROM_SITE)
    return
  }
  const result = await consumeLinkToken({
    tokenHash: hashLinkToken(start.payload),
    telegramId: message.from.id,
  })
  if ((result.status === "link" || result.status === "refresh") && result.userId) {
    try {
      await syncAvatar(result.userId, message.from.id)
    } catch {
      // A missing photo does not undo the link.
    }
  }
  if (result.status === "link" || result.status === "refresh") {
    await reply(message, CONNECTED, returnToTradelytKeyboard() ?? undefined)
  } else if (result.status === "taken") await reply(message, TAKEN)
  else if (result.status === "invalid" || result.status === "already_other") await reply(message, START_FROM_SITE)
}

export async function POST(request: Request) {
  if (!verifyTelegramSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    logWebhook("unauthorized")
    return Response.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    logWebhook("invalid update")
    return Response.json({ error: "Invalid JSON." }, { status: 400 })
  }
  const update = parseUpdate(body)
  if (!update) {
    logWebhook("invalid update")
    return Response.json({ error: "Invalid update." }, { status: 400 })
  }

  let claimed = false
  try {
    claimed = await claimUpdate(update.updateId)
  } catch {
    logWebhook("db")
    return Response.json({ error: "Webhook handler failed." }, { status: 500 })
  }
  if (!claimed) return Response.json({ ok: true })

  try {
    await handleUpdate(update)
  } catch {
    logWebhook("db")
    try {
      await releaseUpdate(update.updateId)
    } catch {
      // The next Telegram retry will hit the claimed row and stop.
    }
    return Response.json({ error: "Webhook handler failed." }, { status: 500 })
  }

  return Response.json({ ok: true })
}
