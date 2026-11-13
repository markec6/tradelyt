import { timingSafeEqual } from "node:crypto"

export const TELEGRAM_AVATAR_PATH = "/api/telegram/avatar"
export const TELEGRAM_BOT_USERNAME = "Tradelyt_bot"

export type TelegramReplyMarkup = {
  inline_keyboard: Array<Array<{ text: string; url: string }>>
}

export function returnToTradelytKeyboard(): TelegramReplyMarkup | null {
  const webhook = process.env.TELEGRAM_WEBHOOK_URL
  if (!webhook) return null
  try {
    const url = new URL(webhook)
    if (url.protocol !== "https:") return null
    return {
      inline_keyboard: [[{ text: "🚀 Return to Tradelyt & Continue", url: `${url.origin}/onboarding` }]],
    }
  } catch {
    return null
  }
}

export function telegramDeepLink(token: string) {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(token)}`
}

const SECRET_PATTERN = /^[A-Za-z0-9_-]{1,256}$/

export type TelegramUser = {
  id: string
  username?: string
  firstName?: string
}

export type TelegramMessage = {
  chat: { id: string; type: string }
  from: TelegramUser
  text?: string
}

export type TelegramUpdate = {
  updateId: string
  message?: TelegramMessage
}

export type ProfilePhoto =
  | { ok: true; fileId: string | null }
  | { ok: false }

type PhotoSize = {
  file_id?: string
  width?: number
  height?: number
}

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set")
  return token
}

function apiUrl(method: string) {
  return `https://api.telegram.org/bot${botToken()}/${method}`
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}

function safeId(value: unknown) {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value)
  if (typeof value === "string" && /^[0-9]{1,20}$/.test(value)) return value
  return null
}

function cleanUsername(value: unknown) {
  if (typeof value !== "string") return undefined
  const username = value.replace(/^@+/, "").trim()
  if (!username || username.length > 32) return undefined
  return username
}

function cleanFirstName(value: unknown) {
  if (typeof value !== "string") return undefined
  const firstName = value.trim()
  if (!firstName) return undefined
  return firstName.slice(0, 64)
}

export function verifyTelegramSecret(header: string | null) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || !SECRET_PATTERN.test(secret) || !header) return false
  const actual = Buffer.from(header)
  const expected = Buffer.from(secret)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export function parseUpdate(value: unknown): TelegramUpdate | null {
  const update = asRecord(value)
  const updateId = update ? safeId(update.update_id) : null
  if (!update || !updateId) return null
  const parsed: TelegramUpdate = { updateId }
  const message = asRecord(update.message)
  if (!message) return parsed
  const chat = asRecord(message.chat)
  const from = asRecord(message.from)
  const chatId = chat ? safeId(chat.id) : null
  const fromId = from ? safeId(from.id) : null
  if (!chat || typeof chat.type !== "string" || !chatId || !from || !fromId) return parsed
  parsed.message = {
    chat: { id: chatId, type: chat.type },
    from: {
      id: fromId,
      username: cleanUsername(from.username),
      firstName: cleanFirstName(from.first_name),
    },
    text: typeof message.text === "string" ? message.text : undefined,
  }
  return parsed
}

export type TelegramSendResult =
  | { ok: true }
  | { ok: false; errorCode: number | null; description: string }

export async function sendMessage(
  chatId: string,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
): Promise<TelegramSendResult> {
  try {
    const response = await fetch(apiUrl("sendMessage"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(replyMarkup ? { chat_id: chatId, text, reply_markup: replyMarkup } : { chat_id: chatId, text }),
    })
    if (response.ok) return { ok: true }
    let errorCode: number | null = null
    let description = "Telegram sendMessage failed."
    try {
      const body = asRecord(await response.json())
      if (typeof body?.error_code === "number") errorCode = body.error_code
      if (typeof body?.description === "string" && body.description) description = body.description
    } catch {
      description = "Telegram sendMessage failed."
    }
    return { ok: false, errorCode, description }
  } catch {
    return { ok: false, errorCode: null, description: "Telegram sendMessage failed." }
  }
}

export async function getUserProfilePhotos(telegramId: string): Promise<ProfilePhoto> {
  try {
    const url = new URL(apiUrl("getUserProfilePhotos"))
    url.searchParams.set("user_id", telegramId)
    url.searchParams.set("limit", "1")
    const response = await fetch(url)
    if (!response.ok) return { ok: false }
    const body = asRecord(await response.json())
    const result = body?.ok === true ? asRecord(body.result) : null
    if (!result) return { ok: false }
    const photos = Array.isArray(result.photos) ? result.photos : []
    const sizes = Array.isArray(photos[0]) ? photos[0].filter((item): item is PhotoSize => Boolean(asRecord(item))) : []
    if (sizes.length === 0) return { ok: true, fileId: null }
    const largest = sizes.reduce((best, photo) => {
      const area = (photo.width ?? 0) * (photo.height ?? 0)
      const bestArea = (best.width ?? 0) * (best.height ?? 0)
      return area > bestArea ? photo : best
    })
    if (!largest.file_id) return { ok: true, fileId: null }
    return { ok: true, fileId: largest.file_id }
  } catch {
    return { ok: false }
  }
}

export async function openProfilePhoto(fileId: string) {
  try {
    const metaUrl = new URL(apiUrl("getFile"))
    metaUrl.searchParams.set("file_id", fileId)
    const metaResponse = await fetch(metaUrl)
    if (!metaResponse.ok) return null
    const meta = asRecord(await metaResponse.json())
    const result = meta?.ok === true ? asRecord(meta.result) : null
    const filePath = result && typeof result.file_path === "string" ? result.file_path : ""
    if (!filePath || filePath.includes("..") || filePath.startsWith("/") || filePath.includes("://")) return null
    const fileResponse = await fetch(`https://api.telegram.org/file/bot${botToken()}/${filePath}`)
    if (!fileResponse.ok) return null
    const bytes = new Uint8Array(await fileResponse.arrayBuffer())
    const contentType = fileResponse.headers.get("content-type") || "application/octet-stream"
    return { bytes, contentType }
  } catch {
    return null
  }
}
