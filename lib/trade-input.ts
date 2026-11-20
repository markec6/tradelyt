import type { Side } from "@/lib/zones"

export type TradeDraft = {
  symbol: string
  side: Side
  entry: number
  quantity: number
  stopLoss: number | null
  takeProfit1: number | null
  takeProfit2: number | null
}

export function normalizeSymbol(raw: string) {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (cleaned.length < 2 || cleaned.length > 20) return null
  if (cleaned.endsWith("USDT") || cleaned.endsWith("USDC")) return cleaned
  if (cleaned.length > 16) return null
  return `${cleaned}USDT`
}

function positive(value: number) {
  return Number.isFinite(value) && value > 0 && value < 1_000_000_000_000
}

export function validateDraft(draft: TradeDraft) {
  if (!normalizeSymbol(draft.symbol)) return "invalid" as const
  if (!positive(draft.entry) || !positive(draft.quantity)) return "invalid" as const
  const { side, entry, stopLoss, takeProfit1, takeProfit2 } = draft
  if (stopLoss != null && !positive(stopLoss)) return "invalid" as const
  if (takeProfit1 != null && !positive(takeProfit1)) return "invalid" as const
  if (takeProfit2 != null && !positive(takeProfit2)) return "invalid" as const
  if (side === "long") {
    if (stopLoss != null && stopLoss >= entry) return "invalid" as const
    if (takeProfit1 != null && takeProfit1 <= entry) return "invalid" as const
    if (takeProfit2 != null && (takeProfit1 == null || takeProfit2 <= takeProfit1)) return "invalid" as const
  } else {
    if (stopLoss != null && stopLoss <= entry) return "invalid" as const
    if (takeProfit1 != null && takeProfit1 >= entry) return "invalid" as const
    if (takeProfit2 != null && (takeProfit1 == null || takeProfit2 >= takeProfit1)) return "invalid" as const
  }
  return null
}

export function parseTradeCommand(text: string): TradeDraft | null {
  const match =
    /^\/trade(?:@[A-Za-z0-9_]+)?\s+(\S+)\s+(long|short)\s+([0-9]*\.?[0-9]+)\s+Q\s+([0-9]*\.?[0-9]+)(?:\s+SL\s+([0-9]*\.?[0-9]+))?(?:\s+TP\s+([0-9]*\.?[0-9]+))?(?:\s+TP2\s+([0-9]*\.?[0-9]+))?\s*$/i.exec(
      text.trim(),
    )
  if (!match) return null
  const symbol = normalizeSymbol(match[1] ?? "")
  if (!symbol) return null
  const draft: TradeDraft = {
    symbol,
    side: (match[2] ?? "").toLowerCase() === "short" ? "short" : "long",
    entry: Number(match[3]),
    quantity: Number(match[4]),
    stopLoss: match[5] ? Number(match[5]) : null,
    takeProfit1: match[6] ? Number(match[6]) : null,
    takeProfit2: match[7] ? Number(match[7]) : null,
  }
  if (validateDraft(draft)) return null
  return draft
}

export function parseCloseCommand(text: string) {
  const match = /^\/close(?:@[A-Za-z0-9_]+)?\s+(\S+)\s*$/i.exec(text.trim())
  if (!match) return null
  return normalizeSymbol(match[1] ?? "")
}
