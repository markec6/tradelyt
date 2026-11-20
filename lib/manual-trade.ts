import { neon } from "@neondatabase/serverless"

import { normalizeSymbol, validateDraft, type TradeDraft } from "@/lib/trade-input"
import { detectMode, type Language, type Side } from "@/lib/zones"

export type TradeError = "invalid" | "hedge" | "subscription" | "missing" | "closed" | "price"

export type OpenTradeResult =
  | { ok: true; tradeId: string; scaled: boolean; entries: number }
  | { ok: false; error: TradeError }

type OpenRow = {
  id: string
  side: Side
  entry: number
  quantity: number
  remaining: number
  entries: number
}

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

function text(value: unknown) {
  return typeof value === "string" ? value : null
}

function amount(value: unknown) {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

function sqlNum(value: number) {
  return value.toFixed(8)
}

export async function subscriptionAllowsMessages(userId: string) {
  const sql = database()
  const rows = await sql`
    SELECT status, trial_ends_at, current_period_end
    FROM subscriptions
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return false
  const status = text(row.status)
  const trialEnds = row.trial_ends_at instanceof Date ? row.trial_ends_at.getTime() : Date.parse(String(row.trial_ends_at ?? ""))
  const periodEnd = row.current_period_end instanceof Date ? row.current_period_end.getTime() : Date.parse(String(row.current_period_end ?? ""))
  const now = Date.now()
  if (status === "active") return true
  if (status === "trialing") return !Number.isFinite(trialEnds) || trialEnds > now
  if (status === "canceled") return Number.isFinite(periodEnd) && periodEnd > now
  return false
}

export async function findUserByTelegram(telegramId: string) {
  const sql = database()
  const rows = await sql`
    SELECT id::text AS id, language, first_name, telegram_first_name
    FROM users
    WHERE telegram_id = ${telegramId}::bigint
    LIMIT 1
  `
  const row = rows[0]
  const id = text(row?.id)
  if (!id) return null
  const language = text(row?.language) === "sr" ? "sr" : "en"
  return {
    id,
    language: language as Language,
    name: text(row?.first_name) || text(row?.telegram_first_name) || (language === "sr" ? "trader" : "there"),
  }
}

async function openOnSymbol(userId: string, symbol: string): Promise<OpenRow | null> {
  const sql = database()
  const rows = await sql`
    SELECT
      id::text AS id,
      position_type,
      entry_price,
      quantity,
      remaining_quantity,
      position_entries
    FROM trades
    WHERE user_id = ${userId}::uuid
      AND token_symbol = ${symbol}
      AND status IN ('open', 'tp1_hit')
    ORDER BY opened_at DESC
    LIMIT 1
  `
  const row = rows[0]
  const id = text(row?.id)
  const side = text(row?.position_type)
  const entry = amount(row?.entry_price)
  const quantity = amount(row?.quantity)
  const remaining = amount(row?.remaining_quantity)
  const entries = Number(row?.position_entries)
  if (!id || (side !== "long" && side !== "short") || entry == null || quantity == null || remaining == null || !Number.isInteger(entries)) {
    return null
  }
  return { id, side, entry, quantity, remaining, entries }
}

export async function openManualTrade(userId: string, draft: TradeDraft): Promise<OpenTradeResult> {
  const symbol = normalizeSymbol(draft.symbol)
  if (!symbol || validateDraft({ ...draft, symbol })) return { ok: false, error: "invalid" }
  if (!(await subscriptionAllowsMessages(userId))) return { ok: false, error: "subscription" }
  const sql = database()
  const existing = await openOnSymbol(userId, symbol)
  if (existing && existing.side !== draft.side) return { ok: false, error: "hedge" }
  if (existing) {
    const total = existing.quantity + draft.quantity
    const remaining = existing.remaining + draft.quantity
    const entry = (existing.entry * existing.quantity + draft.entry * draft.quantity) / total
    const stopLoss = draft.stopLoss
    const takeProfit1 = draft.takeProfit1
    const takeProfit2 = draft.takeProfit2
    const current = await sql`
      SELECT stop_loss, take_profit_1, take_profit_2
      FROM trades
      WHERE id = ${existing.id}::uuid
      LIMIT 1
    `
    const nextStop = stopLoss ?? amount(current[0]?.stop_loss)
    const nextTp1 = takeProfit1 ?? amount(current[0]?.take_profit_1)
    const mode = detectMode({ entry, takeProfit1: nextTp1, stopLoss: nextStop })
    await sql`
      UPDATE trades
      SET
        entry_price = ${sqlNum(entry)}::numeric,
        quantity = ${sqlNum(total)}::numeric,
        remaining_quantity = ${sqlNum(remaining)}::numeric,
        stop_loss = COALESCE(${stopLoss == null ? null : sqlNum(stopLoss)}::numeric, stop_loss),
        take_profit_1 = COALESCE(${takeProfit1 == null ? null : sqlNum(takeProfit1)}::numeric, take_profit_1),
        take_profit_2 = COALESCE(${takeProfit2 == null ? null : sqlNum(takeProfit2)}::numeric, take_profit_2),
        position_entries = position_entries + 1,
        mode = ${mode},
        updated_at = now()
      WHERE id = ${existing.id}::uuid
        AND user_id = ${userId}::uuid
        AND status IN ('open', 'tp1_hit')
    `
    return { ok: true, tradeId: existing.id, scaled: true, entries: existing.entries + 1 }
  }
  const mode = detectMode({ entry: draft.entry, takeProfit1: draft.takeProfit1, stopLoss: draft.stopLoss })
  const rows = await sql`
    INSERT INTO trades (
      user_id,
      token_symbol,
      position_type,
      entry_price,
      stop_loss,
      take_profit_1,
      take_profit_2,
      quantity,
      remaining_quantity,
      source,
      mode,
      position_entries,
      status
    )
    VALUES (
      ${userId}::uuid,
      ${symbol},
      ${draft.side},
      ${sqlNum(draft.entry)}::numeric,
      ${draft.stopLoss == null ? null : sqlNum(draft.stopLoss)}::numeric,
      ${draft.takeProfit1 == null ? null : sqlNum(draft.takeProfit1)}::numeric,
      ${draft.takeProfit2 == null ? null : sqlNum(draft.takeProfit2)}::numeric,
      ${sqlNum(draft.quantity)}::numeric,
      ${sqlNum(draft.quantity)}::numeric,
      'manual',
      ${mode},
      1,
      'open'
    )
    RETURNING id::text AS id
  `
  const tradeId = text(rows[0]?.id)
  if (!tradeId) return { ok: false, error: "invalid" }
  return { ok: true, tradeId, scaled: false, entries: 1 }
}

export async function closeManualTrade(userId: string, tradeId: string) {
  const sql = database()
  const rows = await sql`
    UPDATE trades
    SET status = 'closed_manual', closed_at = now(), updated_at = now(), alert_claimed_at = NULL
    WHERE id = ${tradeId}::uuid
      AND user_id = ${userId}::uuid
      AND status IN ('open', 'tp1_hit')
    RETURNING id::text AS id, live_message_id, token_symbol
  `
  const id = text(rows[0]?.id)
  if (!id) return null
  return { id, liveMessageId: text(rows[0]?.live_message_id), symbol: text(rows[0]?.token_symbol) ?? "" }
}

export async function closeManualTradeBySymbol(userId: string, symbol: string) {
  const normalized = normalizeSymbol(symbol)
  if (!normalized) return null
  const sql = database()
  const rows = await sql`
    SELECT id::text AS id
    FROM trades
    WHERE user_id = ${userId}::uuid
      AND token_symbol = ${normalized}
      AND status IN ('open', 'tp1_hit')
    ORDER BY opened_at DESC
    LIMIT 1
  `
  const id = text(rows[0]?.id)
  if (!id) return null
  return closeManualTrade(userId, id)
}

export async function confirmPortion(userId: string, tradeId: string, fraction: number, price: number) {
  if (![0.25, 0.5, 0.75].includes(fraction) || !(price > 0)) return { ok: false as const, error: "invalid" as const }
  const sql = database()
  const rows = await sql`
    SELECT entry_price, remaining_quantity, position_type, pnl_amount, status
    FROM trades
    WHERE id = ${tradeId}::uuid
      AND user_id = ${userId}::uuid
      AND status IN ('open', 'tp1_hit')
    LIMIT 1
  `
  const row = rows[0]
  const entry = amount(row?.entry_price)
  const remaining = amount(row?.remaining_quantity)
  const side = text(row?.position_type)
  const realized = amount(row?.pnl_amount) ?? 0
  if (entry == null || remaining == null || (side !== "long" && side !== "short")) return { ok: false as const, error: "closed" as const }
  const closedQty = remaining * fraction
  const nextRemaining = remaining - closedQty
  const diff = side === "long" ? price - entry : entry - price
  const added = diff * closedQty
  await sql`
    UPDATE trades
    SET
      remaining_quantity = ${sqlNum(nextRemaining)}::numeric,
      pnl_amount = ${sqlNum(realized + added)}::numeric,
      status = 'tp1_hit',
      tp1_confirmed_at = now(),
      tp_armed = false,
      updated_at = now()
    WHERE id = ${tradeId}::uuid
      AND user_id = ${userId}::uuid
      AND status IN ('open', 'tp1_hit')
  `
  return { ok: true as const, realized: realized + added }
}

export async function finishTrade(userId: string, tradeId: string, status: "tp2_hit" | "stopped" | "closed_manual") {
  const sql = database()
  const rows = await sql`
    UPDATE trades
    SET status = ${status}, closed_at = now(), updated_at = now(), alert_claimed_at = NULL
    WHERE id = ${tradeId}::uuid
      AND user_id = ${userId}::uuid
      AND status IN ('open', 'tp1_hit')
    RETURNING id::text AS id
  `
  return text(rows[0]?.id)
}

export type OpenTradeView = {
  id: string
  symbol: string
  side: Side
  entry: number
  quantity: number
  remaining: number
  stopLoss: number | null
  takeProfit1: number | null
  takeProfit2: number | null
  mode: string | null
  zone: string | null
  pnlPercent: number
  openedAt: string
}

export async function listOpenTrades(userId: string): Promise<OpenTradeView[]> {
  const sql = database()
  const rows = await sql`
    SELECT
      id::text AS id,
      token_symbol,
      position_type,
      entry_price,
      quantity,
      remaining_quantity,
      stop_loss,
      take_profit_1,
      take_profit_2,
      mode,
      zone,
      pnl_percentage,
      opened_at
    FROM trades
    WHERE user_id = ${userId}::uuid
      AND status IN ('open', 'tp1_hit')
    ORDER BY opened_at DESC
  `
  const trades: OpenTradeView[] = []
  for (const row of rows) {
    const id = text(row.id)
    const symbol = text(row.token_symbol)
    const side = text(row.position_type)
    const entry = amount(row.entry_price)
    const quantity = amount(row.quantity)
    const remaining = amount(row.remaining_quantity)
    if (!id || !symbol || (side !== "long" && side !== "short") || entry == null || quantity == null || remaining == null) continue
    const openedAt = row.opened_at instanceof Date ? row.opened_at.toISOString() : text(row.opened_at) ?? ""
    trades.push({
      id,
      symbol,
      side,
      entry,
      quantity,
      remaining,
      stopLoss: amount(row.stop_loss),
      takeProfit1: amount(row.take_profit_1),
      takeProfit2: amount(row.take_profit_2),
      mode: text(row.mode),
      zone: text(row.zone),
      pnlPercent: amount(row.pnl_percentage) ?? 0,
      openedAt,
    })
  }
  return trades
}
