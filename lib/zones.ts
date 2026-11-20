export type Mode = "scalper" | "classic" | "moonshot"
export type Side = "long" | "short"
export type Zone = "neutral" | "approach_tp1" | "tp1" | "approach_sl" | "tp2" | "sl"
export type Language = "en" | "sr"

export const MODES: readonly Mode[] = ["scalper", "classic", "moonshot"]

const TABLE = {
  scalper: { neutralLow: -2, tp1: 5, tp2: 10, sl: -3, approachTp: 0.8, approachSl: 2 / 3, passiveMs: 30 * 60_000, cooldownMs: 15 * 60_000, editMin: 0.3, editProfitMs: 0, editLossMs: 0 },
  classic: { neutralLow: -5, tp1: 10, tp2: 20, sl: -7, approachTp: 0.9, approachSl: 5 / 7, passiveMs: 2 * 60 * 60_000, cooldownMs: 60 * 60_000, editMin: 1, editProfitMs: 5 * 60_000, editLossMs: 2 * 60_000 },
  moonshot: { neutralLow: -10, tp1: 25, tp2: 50, sl: -15, approachTp: 0.96, approachSl: 10 / 15, passiveMs: 6 * 60 * 60_000, cooldownMs: 4 * 60 * 60_000, editMin: 3, editProfitMs: 30 * 60_000, editLossMs: 10 * 60_000 },
} as const

const MODE_WAIT_MS = 2 * 60_000
const SL_REPEAT_MS = 5 * 60_000
const SL_MAX_SENDS = 4

export function modeTable(mode: Mode) {
  return TABLE[mode]
}

export function priceMovePercent(entry: number, price: number, side: Side) {
  if (!(entry > 0) || !Number.isFinite(price)) return 0
  const raw = ((price - entry) / entry) * 100
  return side === "long" ? raw : -raw
}

export function pnlUsd(entry: number, price: number, quantity: number, side: Side) {
  if (!(quantity > 0) || !Number.isFinite(price) || !Number.isFinite(entry)) return 0
  const diff = side === "long" ? price - entry : entry - price
  return diff * quantity
}

export function detectMode(input: { entry: number; takeProfit1: number | null; stopLoss: number | null }): Mode | null {
  const { entry, takeProfit1, stopLoss } = input
  if (!(entry > 0)) return null
  if (takeProfit1 != null && Number.isFinite(takeProfit1)) {
    const distance = (Math.abs(takeProfit1 - entry) / entry) * 100
    if (distance < 7.5) return "scalper"
    if (distance < 17.5) return "classic"
    return "moonshot"
  }
  if (stopLoss != null && Number.isFinite(stopLoss)) {
    const distance = (Math.abs(stopLoss - entry) / entry) * 100
    if (distance < 5) return "scalper"
    if (distance < 11) return "classic"
    return "moonshot"
  }
  return null
}

export function resolveMode(input: {
  entry: number
  takeProfit1: number | null
  stopLoss: number | null
  openedAt: number
  now: number
}): { mode: Mode | null; waiting: boolean } {
  const detected = detectMode(input)
  if (detected) return { mode: detected, waiting: false }
  if (input.now - input.openedAt < MODE_WAIT_MS) return { mode: null, waiting: true }
  return { mode: "classic", waiting: false }
}

function asThreshold(price: number | null, fallback: number, basis: Basis) {
  if (price == null || !Number.isFinite(price)) return fallback
  if (basis.equity != null && basis.equity > 0) {
    return (pnlUsd(basis.entry, price, basis.quantity, basis.side) / basis.equity) * 100
  }
  return priceMovePercent(basis.entry, price, basis.side)
}

type Basis = {
  entry: number
  quantity: number
  side: Side
  equity: number | null
}

export function zonePercent(input: Basis & { price: number }) {
  const usd = pnlUsd(input.entry, input.price, input.quantity, input.side)
  if (input.equity != null && input.equity > 0) return (usd / input.equity) * 100
  return priceMovePercent(input.entry, input.price, input.side)
}

export function classifyZone(input: {
  mode: Mode
  percent: number
  entry: number
  quantity: number
  side: Side
  equity: number | null
  stopLoss: number | null
  takeProfit1: number | null
  takeProfit2: number | null
}): Zone {
  const basis: Basis = input
  const rules = TABLE[input.mode]
  const tp1At = asThreshold(input.takeProfit1, rules.tp1, basis)
  const tp2At = asThreshold(input.takeProfit2, rules.tp2, basis)
  const slAt = asThreshold(input.stopLoss, rules.sl, basis)
  const levels = [
    { zone: "tp1" as const, at: tp1At },
    { zone: "tp2" as const, at: tp2At },
  ]
    .filter((level) => Number.isFinite(level.at) && level.at > 0)
    .sort((a, b) => a.at - b.at)
  if (input.percent <= slAt) return "sl"
  let reached: "tp1" | "tp2" | null = null
  for (const level of levels) {
    if (input.percent >= level.at) reached = level.zone
  }
  if (reached) return reached
  if (Number.isFinite(tp1At) && tp1At > 0 && input.percent > tp1At * rules.approachTp) return "approach_tp1"
  if (Number.isFinite(slAt) && slAt < 0 && input.percent < slAt * rules.approachSl) return "approach_sl"
  return "neutral"
}

const ZONE_RANK: Record<Zone, number> = {
  neutral: 0,
  approach_tp1: 1,
  approach_sl: 2,
  tp1: 3,
  tp2: 4,
  sl: 5,
}

export function strongerZone(zones: readonly Zone[]): Zone {
  return zones.reduce((best, zone) => (ZONE_RANK[zone] > ZONE_RANK[best] ? zone : best), "neutral" as Zone)
}

export function windowLimits(maxDailyTrades: number) {
  if (!(maxDailyTrades > 0)) return null
  return {
    h6: Math.ceil(maxDailyTrades / 4),
    h12: Math.ceil(maxDailyTrades / 2),
    h24: maxDailyTrades,
  }
}

export function breachedWindow(count: number, limit: number) {
  return count > limit
}

export type TickInput = {
  now: number
  openedAt: number
  entry: number
  side: Side
  quantity: number
  stopLoss: number | null
  takeProfit1: number | null
  takeProfit2: number | null
  equityAtOpen: number | null
  lastPrice: number
  highPrice: number
  lowPrice: number
  liveMessageId: string | null
  storedZone: Zone | null
  zoneChangedAt: number | null
  notifiedAt: number | null
  tpArmed: boolean
  tp1Confirmed: boolean
  slAlertCount: number
  slAlertAt: number | null
  lastEditPnl: number | null
  lastEditAt: number | null
  passiveRefreshedAt: number | null
  deferredZone: "tp1" | "tp2" | null
  paused: boolean
  quiet: boolean
  tradeNotes: boolean
  riskNotes: boolean
  priceSupported: boolean
}

export type TickPlan = {
  mode: Mode | null
  waiting: boolean
  zone: Zone
  percent: number
  action: "wait" | "defer" | "send" | "edit" | "none"
  sendZone: "neutral" | "tp1" | "tp2" | "sl" | null
  silent: boolean
  passive: boolean
  disarmTp: boolean
  rearmTp: boolean
  slAlertCount: number
  clearDeferred: boolean
  setDeferred: "tp1" | "tp2" | null
}

function extremePrice(side: Side, high: number, low: number, favorable: boolean) {
  if (side === "long") return favorable ? high : low
  return favorable ? low : high
}

export function planTradeTick(input: TickInput): TickPlan {
  const resolved = resolveMode({
    entry: input.entry,
    takeProfit1: input.takeProfit1,
    stopLoss: input.stopLoss,
    openedAt: input.openedAt,
    now: input.now,
  })
  const empty: TickPlan = {
    mode: resolved.mode,
    waiting: resolved.waiting,
    zone: "neutral",
    percent: 0,
    action: resolved.waiting ? "wait" : "none",
    sendZone: null,
    silent: true,
    passive: false,
    disarmTp: false,
    rearmTp: false,
    slAlertCount: input.slAlertCount,
    clearDeferred: false,
    setDeferred: null,
  }
  if (!input.priceSupported || !(input.quantity > 0) || !(input.entry > 0) || !resolved.mode) return empty

  const mode = resolved.mode
  const basis = {
    mode,
    entry: input.entry,
    quantity: input.quantity,
    side: input.side,
    equity: input.equityAtOpen,
    stopLoss: input.stopLoss,
    takeProfit1: input.takeProfit1,
    takeProfit2: input.takeProfit2,
  }
  const percent = zonePercent({ ...basis, price: input.lastPrice })
  const zone = classifyZone({ ...basis, percent })
  const favorable = classifyZone({
    ...basis,
    percent: zonePercent({ ...basis, price: extremePrice(input.side, input.highPrice, input.lowPrice, true) }),
  })
  const adverse = classifyZone({
    ...basis,
    percent: zonePercent({ ...basis, price: extremePrice(input.side, input.highPrice, input.lowPrice, false) }),
  })
  const eventZone = strongerZone([zone, favorable, adverse])
  const rules = TABLE[mode]
  const rearmTp = zone === "neutral"
  let slAlertCount = input.slAlertCount
  if (eventZone !== "sl" && zone !== "sl") slAlertCount = 0

  const plan: TickPlan = {
    ...empty,
    mode,
    waiting: false,
    zone,
    percent,
    rearmTp,
    slAlertCount,
  }

  if (input.paused) return plan

  const slDue =
    eventZone === "sl" &&
    input.riskNotes &&
    slAlertCount < SL_MAX_SENDS &&
    (input.slAlertCount === 0 || input.slAlertAt == null || input.now - input.slAlertAt >= SL_REPEAT_MS)
  if (slDue) {
    return { ...plan, action: "send", sendZone: "sl", silent: false, slAlertCount: slAlertCount + 1, rearmTp: false }
  }

  const tpBlocked = (zoneName: "tp1" | "tp2") => zoneName === "tp1" && input.tp1Confirmed
  const cooldownOk = input.notifiedAt == null || input.now - input.notifiedAt >= rules.cooldownMs
  const profitEvent = eventZone === "tp1" || eventZone === "tp2" ? eventZone : null

  if (input.quiet && profitEvent && !tpBlocked(profitEvent)) {
    return { ...plan, action: "defer", setDeferred: input.deferredZone ?? profitEvent, rearmTp: false }
  }

  if (!input.quiet && input.deferredZone && input.tpArmed && input.tradeNotes && !tpBlocked(input.deferredZone) && cooldownOk) {
    return {
      ...plan,
      action: "send",
      sendZone: input.deferredZone,
      silent: false,
      disarmTp: true,
      rearmTp: false,
      clearDeferred: true,
    }
  }

  if (!input.quiet && profitEvent && input.tpArmed && input.tradeNotes && !tpBlocked(profitEvent) && cooldownOk) {
    return { ...plan, action: "send", sendZone: profitEvent, silent: false, disarmTp: true, rearmTp: false, clearDeferred: true }
  }

  if (!input.tradeNotes || input.quiet) return plan

  if (!input.liveMessageId) {
    return { ...plan, action: "send", sendZone: "neutral", silent: true }
  }

  const moved = input.lastEditPnl == null || Math.abs(percent - input.lastEditPnl) >= rules.editMin
  const wait = percent >= 0 ? rules.editProfitMs : rules.editLossMs
  const waited = input.lastEditAt == null || input.now - input.lastEditAt >= wait
  const zoneChanged = input.storedZone !== zone
  const passive =
    zone === "neutral" &&
    input.zoneChangedAt != null &&
    input.now - input.zoneChangedAt >= rules.passiveMs &&
    (input.passiveRefreshedAt == null || input.passiveRefreshedAt < input.zoneChangedAt)
  if (passive || zoneChanged || (moved && waited)) {
    return { ...plan, action: "edit", silent: true, passive }
  }
  return plan
}

export function inQuietHours(now: Date, timeZone: string, enabled: boolean, start: string | null, end: string | null) {
  if (!enabled || !start || !end) return false
  let clock = ""
  try {
    clock = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now)
  } catch {
    return false
  }
  const minutes = (value: string) => {
    const [hour, minute] = value.split(":")
    return Number(hour) * 60 + Number(minute)
  }
  const current = minutes(clock)
  const from = minutes(start)
  const to = minutes(end)
  if (!Number.isFinite(current) || !Number.isFinite(from) || !Number.isFinite(to) || from === to) return false
  if (from < to) return current >= from && current < to
  return current >= from || current < to
}
