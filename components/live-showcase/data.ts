export type SymbolId = "BTCUSDT" | "SOLUSDT"
export type TimeframeId = "1m" | "5m" | "1h" | "1D"
export type ChartView = "candles" | "depth"
export type BubbleTone = "emerald" | "rose"

export type Candle = {
  index: number
  open: number
  high: number
  low: number
  close: number
}

export type SymbolSpec = {
  id: SymbolId
  label: string
  entry: number
  stop: number
  target: number
  decimals: number
  tick: number
  volume: string
  high: number
  low: number
  candles: Candle[]
  eventIndex: readonly [number, number, number]
}

export type Scenario = {
  tab: string
  headline: string
  body: string
  time: string
  tone: BubbleTone
}

export type Timeframe = {
  id: TimeframeId
  window: number
  stepMs: number
}

export const ENTRY_INDEX = 28
export const TARGET_INDEX = 48
export const ALARM_INDEX = 62
const SERIES_LENGTH = 72

export const SCENARIOS: readonly Scenario[] = [
  {
    tab: "Risk containment",
    headline: "Instant Entry & SL Anchor",
    body: "The moment you open a trade, Tradelyt locks your risk profile in the same second and pins a guardrail you cannot quietly slide.",
    time: "10:42 AM",
    tone: "emerald",
  },
  {
    tab: "Profit protection",
    headline: "Profit Locked, Risk Destroyed",
    body: "When price tags TP1, the plan records a 30% partial and the stop sits at the entry. You do not have to stare at the screen to keep the gain.",
    time: "11:08 AM",
    tone: "emerald",
  },
  {
    tab: "Overtrade shield",
    headline: "Discipline Enforcement",
    body: "A revenge click or a daily-limit breach trips a red alarm and flags the next entry as a rule break.",
    time: "11:14 AM",
    tone: "rose",
  },
]

export const TIMEFRAMES: readonly Timeframe[] = [
  { id: "1m", window: 24, stepMs: 400 },
  { id: "5m", window: 36, stepMs: 800 },
  { id: "1h", window: 48, stepMs: 1400 },
  { id: "1D", window: 60, stepMs: 2200 },
]

export const BID_SIZES = [4.82, 3.1, 6.44, 2.05, 5.18, 1.66, 3.72, 2.4] as const
export const ASK_SIZES = [3.55, 5.9, 2.12, 4.4, 1.84, 6.02, 2.77, 3.33] as const

export function formatPrice(value: number, decimals: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function scenarioMessage(symbol: SymbolSpec, scenarioIndex: number) {
  const scenario = SCENARIOS[scenarioIndex] ?? SCENARIOS[0]
  const entry = formatPrice(symbol.entry, symbol.decimals)
  const stop = formatPrice(symbol.stop, symbol.decimals)

  const text =
    scenarioIndex === 1
      ? `🎯 TP1 HIT (+2.5%) | 30% of the position closed in profit. Stop-Loss now sits at Entry ($${entry}). This trade is risk-free.`
      : scenarioIndex === 2
        ? "⚠️ OVERTRADING ALARM | Daily limit of 2 trades reached. New entries are locked to protect capital."
        : `🟢 TRADE DETECTED: ${symbol.label} Long | Entry: $${entry} | Stop-Loss: $${stop} (-1.8%) | Risk per trade: 1.2%`

  return { text, time: scenario.time, tone: scenario.tone }
}

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 3
}

function wobble(index: number) {
  const raw = Math.sin(index * 12.9898) * 43758.5453
  return raw - Math.floor(raw)
}

function buildCloses(entry: number, stop: number, target: number) {
  const closes: number[] = []
  const approach = stop + (entry - stop) * 0.35
  const pullback = entry + (target - entry) * 0.45

  for (let i = 0; i < SERIES_LENGTH; i++) {
    let price: number
    if (i <= ENTRY_INDEX) {
      price = approach + (entry - approach) * easeOut(i / ENTRY_INDEX)
    } else if (i <= TARGET_INDEX) {
      const t = (i - ENTRY_INDEX) / (TARGET_INDEX - ENTRY_INDEX)
      price = entry + (target - entry) * easeOut(t)
    } else if (i <= ALARM_INDEX) {
      const t = (i - TARGET_INDEX) / (ALARM_INDEX - TARGET_INDEX)
      price = target + (pullback - target) * t
    } else {
      const t = (i - ALARM_INDEX) / (SERIES_LENGTH - 1 - ALARM_INDEX)
      const settle = entry + (target - entry) * 0.22
      price = pullback + (settle - pullback) * t
    }

    const span = target - stop
    price += Math.sin(i * 1.15) * span * 0.014
    if (i % 5 === 2) price -= span * 0.018
    closes.push(price)
  }

  closes[ENTRY_INDEX] = entry
  closes[TARGET_INDEX] = target
  return closes
}

function buildCandles(entry: number, stop: number, target: number, decimals: number): Candle[] {
  const closes = buildCloses(entry, stop, target)
  const wick = (target - stop) * 0.02

  return closes.map((close, index) => {
    const previous = index === 0 ? close - wick : closes[index - 1]
    const open = previous
    const noise = wobble(index)
    let high = Math.max(open, close) + wick * (0.35 + noise * 0.8)
    let low = Math.min(open, close) - wick * (0.3 + wobble(index + 3) * 0.7)

    if (index === TARGET_INDEX) {
      high = Math.max(high, target + wick * 0.2)
    }
    if (index === ENTRY_INDEX) {
      low = Math.min(low, Math.min(open, entry) - wick * 0.15)
    }

    const candle = {
      index,
      open: roundTo(open, decimals),
      high: roundTo(high, decimals),
      low: roundTo(low, decimals),
      close: roundTo(index === ENTRY_INDEX ? entry : index === TARGET_INDEX ? target : close, decimals),
    }
    return candle
  })
}

function makeSymbol(input: {
  id: SymbolId
  label: string
  entry: number
  stop: number
  target: number
  decimals: number
  tick: number
  volume: string
}): SymbolSpec {
  const candles = buildCandles(input.entry, input.stop, input.target, input.decimals)
  return {
    ...input,
    candles,
    high: Math.max(...candles.map((candle) => candle.high)),
    low: Math.min(...candles.map((candle) => candle.low)),
    eventIndex: [ENTRY_INDEX, TARGET_INDEX, ALARM_INDEX],
  }
}

export const SYMBOLS: Record<SymbolId, SymbolSpec> = {
  BTCUSDT: makeSymbol({
    id: "BTCUSDT",
    label: "BTC/USDT",
    entry: 64200,
    stop: 63000,
    target: 65805,
    decimals: 0,
    tick: 25,
    volume: "18.42B",
  }),
  SOLUSDT: makeSymbol({
    id: "SOLUSDT",
    label: "SOL/USDT",
    entry: 148.4,
    stop: 145.7,
    target: 152.11,
    decimals: 2,
    tick: 0.05,
    volume: "2.86B",
  }),
}

export const SYMBOL_LIST = [SYMBOLS.BTCUSDT, SYMBOLS.SOLUSDT] as const

export function timeframeById(id: TimeframeId) {
  return TIMEFRAMES.find((timeframe) => timeframe.id === id) ?? TIMEFRAMES[1]
}
