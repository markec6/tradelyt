"use server"

import { revalidatePath } from "next/cache"

import { closeManualTrade, openManualTrade } from "@/lib/manual-trade"
import { readUserIdFromCookies } from "@/lib/session-store"
import { announceTrade, notifySpecial } from "@/lib/trade-monitor"
import { validateDraft, type TradeDraft } from "@/lib/trade-input"
import type { Side } from "@/lib/zones"

export type TradeActionState = { error: string } | { ok: true } | null

function numberOrNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export async function openTradeAction(_state: TradeActionState, formData: FormData): Promise<TradeActionState> {
  const userId = await readUserIdFromCookies()
  if (!userId) return { error: "Sign in again." }
  const sideValue = formData.get("side")
  const side: Side = sideValue === "short" ? "short" : "long"
  const entry = numberOrNull(formData.get("entry"))
  const quantity = numberOrNull(formData.get("quantity"))
  const stopLoss = numberOrNull(formData.get("stopLoss"))
  const takeProfit1 = numberOrNull(formData.get("takeProfit1"))
  const takeProfit2 = numberOrNull(formData.get("takeProfit2"))
  if (entry == null || quantity == null || Number.isNaN(entry) || Number.isNaN(quantity)) {
    return { error: "Entry and size are required." }
  }
  if (Number.isNaN(stopLoss) || Number.isNaN(takeProfit1) || Number.isNaN(takeProfit2)) {
    return { error: "Check the stop and target prices." }
  }
  const draft: TradeDraft = {
    symbol: String(formData.get("symbol") ?? ""),
    side,
    entry,
    quantity,
    stopLoss,
    takeProfit1,
    takeProfit2,
  }
  if (validateDraft(draft)) return { error: "Check the symbol, side, entry, size, and targets." }
  const opened = await openManualTrade(userId, draft)
  if (!opened.ok) {
    if (opened.error === "hedge") return { error: "The opposite side is already open on this symbol." }
    if (opened.error === "subscription") return { error: "An active subscription is required." }
    return { error: "The trade could not be saved." }
  }
  await announceTrade(opened.tradeId)
  await notifySpecial(opened.tradeId)
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function closeTradeAction(formData: FormData) {
  const userId = await readUserIdFromCookies()
  const tradeId = formData.get("tradeId")
  if (!userId || typeof tradeId !== "string" || !/^[0-9a-f-]{36}$/i.test(tradeId)) return
  await closeManualTrade(userId, tradeId)
  revalidatePath("/dashboard")
}
