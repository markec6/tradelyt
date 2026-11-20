import { neon } from "@neondatabase/serverless"

import { telegramHandleError } from "@/components/onboarding/validate-telegram"
import { consumeLinkToken, hashLinkToken } from "@/lib/link-tokens"
import { handleTradeCallback, handleTradeCommand } from "@/lib/telegram-actions"
import {
  TELEGRAM_AVATAR_PATH,
  getUserProfilePhotos,
  parseUpdate,
  sendMessage,
  verifyTelegramSecret,
  type TelegramMessage,
  type TelegramUpdate,
} from "@/lib/telegram"

const START_FROM_SITE = "Start verification from the Tradelyt site."
const TAKEN = "Ovaj Telegram nalog je već povezan sa drugim Tradelyt nalogom."
const CONNECTED = "🚀 Your Tradelyt account is successfully connected via Telegram!"
const READ_ONLY = "This chat is for notifications only. Please use the platform."
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

async function syncAvatar(owner: "user" | "pending", ownerId: string, telegramId: string) {
  const photo = await getUserProfilePhotos(telegramId)
  if (!photo.ok) return
  const sql = database()
  const fileId = photo.fileId || null
  const avatarUrl = fileId ? TELEGRAM_AVATAR_PATH : null
  if (owner === "pending") {
    await sql`
      UPDATE pending_signups
      SET
        telegram_photo_file_id = ${fileId},
        telegram_avatar_url = ${avatarUrl},
        updated_at = now()
      WHERE id = ${ownerId}::uuid
        AND expires_at > now()
    `
    return
  }
  await sql`
    UPDATE users
    SET
      telegram_photo_file_id = ${fileId},
      telegram_avatar_url = ${avatarUrl},
      updated_at = now()
    WHERE id = ${ownerId}::uuid
  `
}

function logWebhook(reason: string, detail?: Record<string, string | number | boolean | null>) {
  if (detail) {
    console.error("telegram webhook", reason, detail)
    return
  }
  console.error("telegram webhook", reason)
}

function dbDetail(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : ""
  const message = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]") : ""
  return { code, message: message.slice(0, 300) }
}

async function reply(message: TelegramMessage, text: string) {
  const sent = await sendMessage(message.chat.id, text)
  if (sent.ok) {
    console.log("telegram webhook sendMessage", { ok: true })
    return
  }
  logWebhook("sendMessage", { ok: false, errorCode: sent.errorCode, description: sent.description })
}

async function rememberBlock(chatId: string, blocked: boolean) {
  const sql = database()
  if (blocked) {
    await sql`
      UPDATE users
      SET telegram_blocked_at = now(), updated_at = now()
      WHERE telegram_id = ${chatId}::bigint
    `
    await sql`
      UPDATE pending_signups
      SET telegram_blocked_at = now(), updated_at = now()
      WHERE telegram_id = ${chatId}::bigint
    `
    return
  }
  await sql`
    UPDATE users
    SET telegram_blocked_at = NULL, updated_at = now()
    WHERE telegram_id = ${chatId}::bigint
  `
  await sql`
    UPDATE pending_signups
    SET telegram_blocked_at = NULL, updated_at = now()
    WHERE telegram_id = ${chatId}::bigint
  `
}

async function handleUpdate(update: TelegramUpdate) {
  if (update.callback) {
    await handleTradeCallback(update.callback)
    return
  }
  const member = update.myChatMember
  if (member) {
    if (member.status === "kicked") await rememberBlock(member.chatId, true)
    else if (member.status === "member") await rememberBlock(member.chatId, false)
    return
  }
  const message = update.message
  console.log("telegram webhook received", {
    updateId: update.updateId,
    chatType: message?.chat.type ?? null,
    hasText: Boolean(message?.text),
  })
  if (!message || message.chat.type !== "private" || message.chat.id !== message.from.id) {
    logWebhook("ignored", { reason: "not-private" })
    return
  }
  const start = startPayload(message.text)
  console.log("telegram webhook parsed", {
    command: start.command,
    payloadLength: start.command && start.payload ? start.payload.length : 0,
  })
  if (!start.command) {
    if (await handleTradeCommand(message)) return
    await reply(message, READ_ONLY)
    return
  }
  if (!start.payload) {
    await reply(message, START_FROM_SITE)
    return
  }
  const username = message.from.username && !telegramHandleError(message.from.username) ? message.from.username : null
  const result = await consumeLinkToken({
    tokenHash: hashLinkToken(start.payload),
    telegramId: message.from.id,
    username,
  })
  console.log("telegram webhook link", {
    status: result.status,
    wrote: result.wrote,
    userFound: Boolean(result.userId),
    owner: result.owner,
  })
  if ((result.status === "link" || result.status === "refresh") && result.userId && result.owner) {
    try {
      await syncAvatar(result.owner, result.userId, message.from.id)
    } catch {
      // A missing photo does not undo the link.
    }
  }
  if (result.status === "link" || result.status === "refresh") {
    await reply(message, CONNECTED)
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
  } catch (error) {
    logWebhook("db", dbDetail(error))
    return Response.json({ error: "Webhook handler failed." }, { status: 500 })
  }
  if (!claimed) {
    console.log("telegram webhook duplicate", { updateId: update.updateId })
    return Response.json({ ok: true })
  }

  try {
    await handleUpdate(update)
  } catch (error) {
    logWebhook("db", dbDetail(error))
    try {
      await releaseUpdate(update.updateId)
    } catch {
      // The next Telegram retry will hit the claimed row and stop.
    }
    return Response.json({ error: "Webhook handler failed." }, { status: 500 })
  }

  return Response.json({ ok: true })
}
