import { timingSafeEqual } from "node:crypto"

export const TELEGRAM_AVATAR_PATH = "/api/telegram/avatar"
export const TELEGRAM_BOT_USERNAME = "Tradelyt_bot"

export function telegramDeepLink(token: string) {
  return `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${encodeURIComponent(token)}`
}

const SECRET_PATTERN = /^[A-Za-z0-9_-]{1,256}$/

export async function ensureTelegramWebhook(): Promise<{ ok: true } | { ok: false; reason: "unauthorized" | "webhook" }> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL
  if (!token || !secret || !webhookUrl || !SECRET_PATTERN.test(secret)) {
    console.error("telegram webhook config")
    return { ok: false, reason: "webhook" }
  }
  let target: URL
  try {
    target = new URL(webhookUrl)
  } catch {
    console.error("telegram webhook config")
    return { ok: false, reason: "webhook" }
  }
  if (target.protocol !== "https:") {
    console.error("telegram webhook config")
    return { ok: false, reason: "webhook" }
  }

  const me = await fetch(apiUrl("getMe"))
  const meBody = asRecord(await me.json().catch(() => null))
  if (!me.ok || meBody?.ok !== true) {
    console.error("telegram webhook unauthorized", me.status)
    return { ok: false, reason: "unauthorized" }
  }

  const info = await fetch(apiUrl("getWebhookInfo"))
  const infoBody = asRecord(await info.json().catch(() => null))
  const result = infoBody?.ok === true ? asRecord(infoBody.result) : null
  const current = typeof result?.url === "string" ? result.url : ""
  const allowed = Array.isArray(result?.allowed_updates) ? result.allowed_updates.filter((item): item is string => typeof item === "string") : []
  const hasCallback = allowed.includes("callback_query")
  if (current === webhookUrl && hasCallback) return { ok: true }

  const set = await fetch(apiUrl("setWebhook"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "my_chat_member", "callback_query"],
    }),
  })
  const setBody = asRecord(await set.json().catch(() => null))
  if (!set.ok || setBody?.ok !== true) {
    const errorCode = typeof setBody?.error_code === "number" ? setBody.error_code : set.status
    const description = typeof setBody?.description === "string" ? setBody.description : ""
    console.error("telegram webhook set failed", errorCode, description)
    return { ok: false, reason: "webhook" }
  }
  console.log("telegram webhook registered", target.host, target.pathname)
  return { ok: true }
}

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

export type TelegramChatMember = {
  chatId: string
  chatType: string
  status: string
}

export type TelegramCallback = {
  id: string
  data: string
  from: TelegramUser
  chatId: string
  messageId: string
}

export type TelegramUpdate = {
  updateId: string
  message?: TelegramMessage
  myChatMember?: TelegramChatMember
  callback?: TelegramCallback
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
  const callback = asRecord(update.callback_query)
  if (callback) {
    const callbackId = typeof callback.id === "string" ? callback.id : ""
    const data = typeof callback.data === "string" ? callback.data : ""
    const from = asRecord(callback.from)
    const callbackMessage = asRecord(callback.message)
    const callbackChat = callbackMessage ? asRecord(callbackMessage.chat) : null
    const fromId = from ? safeId(from.id) : null
    const chatId = callbackChat ? safeId(callbackChat.id) : null
    const messageId = callbackMessage ? safeId(callbackMessage.message_id) : null
    if (callbackId && data && from && fromId && chatId && messageId) {
      parsed.callback = {
        id: callbackId,
        data,
        from: {
          id: fromId,
          username: cleanUsername(from.username),
          firstName: cleanFirstName(from.first_name),
        },
        chatId,
        messageId,
      }
    }
  }
  const memberUpdate = asRecord(update.my_chat_member)
  if (memberUpdate) {
    const memberChat = asRecord(memberUpdate.chat)
    const nextMember = asRecord(memberUpdate.new_chat_member)
    const memberChatId = memberChat ? safeId(memberChat.id) : null
    const memberChatType = memberChat && typeof memberChat.type === "string" ? memberChat.type : ""
    const memberStatus = nextMember && typeof nextMember.status === "string" ? nextMember.status : ""
    if (memberChatId && memberChatType === "private" && memberStatus) {
      parsed.myChatMember = { chatId: memberChatId, chatType: memberChatType, status: memberStatus }
    }
  }
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

export type TelegramButton = { text: string; data: string }

export type TelegramSendOptions = {
  html?: boolean
  silent?: boolean
  buttons?: TelegramButton[]
  prefix?: boolean
}

export type TelegramSendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; errorCode: number | null; description: string; retryAfter: number | null }

function markup(buttons: TelegramButton[] | undefined) {
  if (!buttons || buttons.length === 0) return undefined
  return { inline_keyboard: [buttons.map((button) => ({ text: button.text, callback_data: button.data }))] }
}

function sendFailure(body: Record<string, unknown> | null, fallback: string) {
  const parameters = body ? asRecord(body.parameters) : null
  const retryAfter = parameters && typeof parameters.retry_after === "number" ? parameters.retry_after : null
  return {
    ok: false as const,
    errorCode: typeof body?.error_code === "number" ? body.error_code : null,
    description: typeof body?.description === "string" && body.description ? body.description : fallback,
    retryAfter,
  }
}

export async function sendMessage(chatId: string, text: string, options: TelegramSendOptions = {}): Promise<TelegramSendResult> {
  try {
    const response = await fetch(apiUrl("sendMessage"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: options.prefix === false ? text : `Tradelyt\n${text}`,
        disable_notification: options.silent === true,
        parse_mode: options.html ? "HTML" : undefined,
        reply_markup: markup(options.buttons),
      }),
    })
    const body = asRecord(await response.json().catch(() => null))
    if (response.ok && body?.ok === true) {
      const result = asRecord(body.result)
      const messageId = result ? safeId(result.message_id) : null
      return { ok: true, messageId }
    }
    return sendFailure(body, "Telegram sendMessage failed.")
  } catch {
    return { ok: false, errorCode: null, description: "Telegram sendMessage failed.", retryAfter: null }
  }
}

export async function editMessage(chatId: string, messageId: string, text: string, options: TelegramSendOptions = {}): Promise<TelegramSendResult> {
  try {
    const response = await fetch(apiUrl("editMessageText"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: Number(messageId),
        text,
        parse_mode: options.html ? "HTML" : undefined,
        reply_markup: markup(options.buttons) ?? { inline_keyboard: [] },
      }),
    })
    const body = asRecord(await response.json().catch(() => null))
    const description = typeof body?.description === "string" ? body.description : ""
    if (response.ok && body?.ok === true) return { ok: true, messageId }
    if (description.includes("message is not modified")) return { ok: true, messageId }
    return sendFailure(body, "Telegram editMessageText failed.")
  } catch {
    return { ok: false, errorCode: null, description: "Telegram editMessageText failed.", retryAfter: null }
  }
}

export async function clearButtons(chatId: string, messageId: string) {
  try {
    await fetch(apiUrl("editMessageReplyMarkup"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: Number(messageId),
        reply_markup: { inline_keyboard: [] },
      }),
    })
  } catch {
    // The next zone message still stands if the old keyboard stays.
  }
}

export async function answerCallback(callbackId: string, text: string) {
  try {
    await fetch(apiUrl("answerCallbackQuery"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackId, text: text.slice(0, 180) }),
    })
  } catch {
    // Telegram hides the button spinner if this is late. The trade change still stands.
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
