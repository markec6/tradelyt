import { neon } from "@neondatabase/serverless"

import { publicPrice } from "@/lib/bybit-public"
import {
  closeManualTrade,
  closeManualTradeBySymbol,
  confirmPortion,
  findUserByTelegram,
  finishTrade,
  openManualTrade,
} from "@/lib/manual-trade"
import { parseCloseCommand, parseTradeCommand } from "@/lib/trade-input"
import { announceTrade, notifySpecial, repaintTrade } from "@/lib/trade-monitor"
import { answerCallback, editMessage, sendMessage, type TelegramCallback, type TelegramMessage } from "@/lib/telegram"
import { commandText } from "@/lib/zone-copy"
import type { Language } from "@/lib/zones"

const CALLBACK = /^(close|tp1|tp2|sl|ack|tp1p25|tp1p50|tp1p75):([0-9a-fA-F-]{36})$/
const PAUSE = /^\/pause(?:@[A-Za-z0-9_]+)?\s*$/i
const RESUME = /^\/resume(?:@[A-Za-z0-9_]+)?\s*$/i

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

function handledCommand(text: string) {
  return PAUSE.test(text) || RESUME.test(text) || /^\/trade(?:@|\s|$)/i.test(text) || /^\/close(?:@|\s|$)/i.test(text)
}

async function say(chatId: string, language: Language, key: string) {
  await sendMessage(chatId, commandText(language, key))
}

export async function handleTradeCommand(message: TelegramMessage) {
  const text = message.text?.trim() ?? ""
  if (!handledCommand(text)) return false
  const user = await findUserByTelegram(message.from.id)
  if (!user) return false
  if (PAUSE.test(text) || RESUME.test(text)) {
    const sql = database()
    if (PAUSE.test(text)) {
      await sql`
        UPDATE bot_settings
        SET paused_at = now(), updated_at = now()
        WHERE user_id = ${user.id}::uuid
      `
      await say(message.chat.id, user.language, "paused")
      return true
    }
    await sql`
      UPDATE bot_settings
      SET paused_at = NULL, updated_at = now()
      WHERE user_id = ${user.id}::uuid
    `
    await say(message.chat.id, user.language, "resumed")
    return true
  }
  if (/^\/close(?:@|\s|$)/i.test(text)) {
    const symbol = parseCloseCommand(text)
    const closed = symbol ? await closeManualTradeBySymbol(user.id, symbol) : null
    await say(message.chat.id, user.language, closed ? "closed" : "missing")
    if (closed?.liveMessageId) {
      await editMessage(message.chat.id, closed.liveMessageId, `Tradelyt\n${commandText(user.language, "closed")}`, { buttons: [] })
    }
    return true
  }
  const draft = parseTradeCommand(text)
  if (!draft) {
    await say(message.chat.id, user.language, "invalid")
    return true
  }
  const opened = await openManualTrade(user.id, draft)
  if (!opened.ok) {
    await say(message.chat.id, user.language, opened.error === "hedge" ? "hedge" : opened.error === "subscription" ? "subscription" : "invalid")
    return true
  }
  const announced = await announceTrade(opened.tradeId)
  if (!announced.ok || (announced.ok && !announced.uncovered && !announced.sent)) {
    await say(message.chat.id, user.language, "saved")
  }
  await notifySpecial(opened.tradeId)
  return true
}

export async function handleTradeCallback(callback: TelegramCallback) {
  if (callback.chatId !== callback.from.id) {
    await answerCallback(callback.id, "")
    return
  }
  const match = CALLBACK.exec(callback.data)
  const user = await findUserByTelegram(callback.from.id)
  if (!match || !user) {
    await answerCallback(callback.id, "")
    return
  }
  const action = match[1] ?? ""
  const tradeId = match[2] ?? ""
  const sql = database()
  const rows = await sql`
    SELECT status, token_symbol, user_id::text AS user_id
    FROM trades
    WHERE id = ${tradeId}::uuid
    LIMIT 1
  `
  const row = rows[0]
  const owner = typeof row?.user_id === "string" ? row.user_id : ""
  const status = typeof row?.status === "string" ? row.status : ""
  const symbol = typeof row?.token_symbol === "string" ? row.token_symbol : ""
  if (!row || owner !== user.id) {
    await answerCallback(callback.id, commandText(user.language, "already"))
    return
  }
  const open = status === "open" || status === "tp1_hit"
  if (!open && action !== "ack") {
    await answerCallback(callback.id, commandText(user.language, "already"))
    await editMessage(callback.chatId, callback.messageId, `Tradelyt\n${commandText(user.language, "already")}`, { buttons: [] })
    return
  }
  if (action === "ack") {
    await editMessage(callback.chatId, callback.messageId, `Tradelyt\n${commandText(user.language, "ack")}`, { buttons: [] })
    await answerCallback(callback.id, commandText(user.language, "ack"))
    return
  }
  if (action === "tp1") {
    await repaintTrade(tradeId, commandText(user.language, "tp1ask"), "ask")
    await answerCallback(callback.id, commandText(user.language, "tp1ask"))
    return
  }
  if (action === "tp1p25" || action === "tp1p50" || action === "tp1p75") {
    const fraction = action === "tp1p25" ? 0.25 : action === "tp1p50" ? 0.5 : 0.75
    const price = await publicPrice(symbol)
    if (!price || price === "down") {
      await answerCallback(callback.id, commandText(user.language, "price"))
      return
    }
    const confirmed = await confirmPortion(user.id, tradeId, fraction, price.last)
    if (!confirmed.ok) {
      await answerCallback(callback.id, commandText(user.language, "already"))
      return
    }
    await repaintTrade(tradeId, commandText(user.language, "tp1done"), "none")
    await answerCallback(callback.id, commandText(user.language, "tp1done"))
    return
  }
  if (action === "close") {
    await closeManualTrade(user.id, tradeId)
    await editMessage(callback.chatId, callback.messageId, `Tradelyt\n${commandText(user.language, "closed")}`, { buttons: [] })
    await answerCallback(callback.id, commandText(user.language, "closed"))
    return
  }
  if (action === "tp2") {
    await finishTrade(user.id, tradeId, "tp2_hit")
    await editMessage(callback.chatId, callback.messageId, `Tradelyt\n${commandText(user.language, "locked")}`, { buttons: [] })
    await answerCallback(callback.id, commandText(user.language, "locked"))
    return
  }
  if (action === "sl") {
    await finishTrade(user.id, tradeId, "stopped")
    await editMessage(callback.chatId, callback.messageId, `Tradelyt\n${commandText(user.language, "stopped")}`, { buttons: [] })
    await answerCallback(callback.id, commandText(user.language, "stopped"))
  }
}
