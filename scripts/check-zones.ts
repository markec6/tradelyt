import {
  breachedWindow,
  classifyZone,
  detectMode,
  planTradeTick,
  priceMovePercent,
  windowLimits,
  type TickInput,
} from "../lib/zones.ts"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

assert(detectMode({ entry: 100, takeProfit1: 105, stopLoss: null }) === "scalper", "tp 5% is scalper")
assert(detectMode({ entry: 100, takeProfit1: 107.5, stopLoss: null }) === "classic", "tp 7.5% is classic")
assert(detectMode({ entry: 100, takeProfit1: 117.5, stopLoss: null }) === "moonshot", "tp 17.5% is moonshot")
assert(detectMode({ entry: 100, takeProfit1: null, stopLoss: 96 }) === "scalper", "sl 4% is scalper")
assert(detectMode({ entry: 100, takeProfit1: null, stopLoss: 95 }) === "classic", "sl 5% is classic")
assert(detectMode({ entry: 100, takeProfit1: null, stopLoss: 89 }) === "moonshot", "sl 11% is moonshot")
assert(detectMode({ entry: 100, takeProfit1: null, stopLoss: null }) === null, "no levels wait")
assert(detectMode({ entry: 100, takeProfit1: 130, stopLoss: 99 }) === "moonshot", "tp wins over a tight stop")

const basis = {
  mode: "scalper" as const,
  entry: 100,
  quantity: 1,
  side: "long" as const,
  equity: null,
  stopLoss: null,
  takeProfit1: null,
  takeProfit2: null,
}
assert(classifyZone({ ...basis, percent: 4 }) === "neutral", "scalper +4 is calm")
assert(classifyZone({ ...basis, percent: 4.5 }) === "approach_tp1", "scalper +4.5 approaches tp1")
assert(classifyZone({ ...basis, percent: 5 }) === "tp1", "scalper +5 is tp1")
assert(classifyZone({ ...basis, percent: 10 }) === "tp2", "scalper +10 is tp2")
assert(classifyZone({ ...basis, percent: -2 }) === "neutral", "scalper -2 is calm")
assert(classifyZone({ ...basis, percent: -2.5 }) === "approach_sl", "scalper -2.5 approaches stop")
assert(classifyZone({ ...basis, percent: -3 }) === "sl", "scalper -3 is stop")
assert(priceMovePercent(100, 90, "short") === 10, "short profit is a falling price")

const userTarget = classifyZone({
  ...basis,
  takeProfit1: 108,
  percent: 8,
})
assert(userTarget === "tp1", "a user target replaces the mode percent")

const limits = windowLimits(3)
assert(limits?.h24 === 3 && limits.h12 === 2 && limits.h6 === 1, "windows come from the daily limit")
assert(windowLimits(0) === null, "a zero limit disables the window")
assert(breachedWindow(2, 1) && !breachedWindow(1, 1), "only a count above the limit fires")

function tick(patch: Partial<TickInput>): TickInput {
  return {
    now: 10 * 60_000,
    openedAt: 0,
    entry: 100,
    side: "long",
    quantity: 1,
    stopLoss: 97,
    takeProfit1: 105,
    takeProfit2: 110,
    equityAtOpen: null,
    lastPrice: 100,
    highPrice: 100,
    lowPrice: 100,
    liveMessageId: null,
    storedZone: null,
    zoneChangedAt: null,
    notifiedAt: null,
    tpArmed: true,
    tp1Confirmed: false,
    slAlertCount: 0,
    slAlertAt: null,
    lastEditPnl: null,
    lastEditAt: null,
    passiveRefreshedAt: null,
    deferredZone: null,
    paused: false,
    quiet: false,
    tradeNotes: true,
    riskNotes: true,
    priceSupported: true,
    ...patch,
  }
}

const opened = planTradeTick(tick({}))
assert(opened.action === "send" && opened.sendZone === "neutral" && opened.silent, "a new trade opens with a silent calm message")

const waiting = planTradeTick(tick({ now: 60_000, stopLoss: null, takeProfit1: null, takeProfit2: null }))
assert(waiting.action === "wait" && waiting.mode === null, "no stop and no target waits")

const classicLater = planTradeTick(tick({ now: 3 * 60_000, stopLoss: null, takeProfit1: null, takeProfit2: null }))
assert(classicLater.mode === "classic" && classicLater.action === "send", "after two minutes the trade becomes classic")

const tp = planTradeTick(tick({ lastPrice: 105, highPrice: 105, liveMessageId: "1", storedZone: "neutral" }))
assert(tp.action === "send" && tp.sendZone === "tp1" && tp.disarmTp, "touching tp1 sends an alarm")

const repeatTooSoon = planTradeTick(
  tick({
    lastPrice: 105,
    highPrice: 105,
    liveMessageId: "1",
    storedZone: "neutral",
    tpArmed: true,
    notifiedAt: 9 * 60_000,
  }),
)
assert(repeatTooSoon.action !== "send" || repeatTooSoon.sendZone !== "tp1", "tp1 does not repeat inside the pause")

const quiet = planTradeTick(tick({ lastPrice: 105, highPrice: 105, liveMessageId: "1", quiet: true }))
assert(quiet.action === "defer" && quiet.setDeferred === "tp1", "a target hit during quiet hours waits")

const stop = planTradeTick(tick({ lastPrice: 97, lowPrice: 97, liveMessageId: "1", quiet: true }))
assert(stop.action === "send" && stop.sendZone === "sl", "a stop alarm is not delayed by quiet hours")

const paused = planTradeTick(tick({ lastPrice: 97, lowPrice: 97, paused: true }))
assert(paused.action === "none", "pause blocks even the stop alarm")

const wick = planTradeTick(tick({ lastPrice: 100, highPrice: 110, lowPrice: 100, liveMessageId: "1", storedZone: "neutral" }))
assert(wick.sendZone === "tp2", "a one-minute wick that reaches tp2 still alarms")

console.log("zone checks passed")
