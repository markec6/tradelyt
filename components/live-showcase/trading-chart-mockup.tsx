"use client"

import { useEffect, useRef, useState } from "react"
import {
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
  useXAxisScale,
  useYAxisScale,
} from "recharts"
import { cn } from "@/lib/utils"
import { OrderBook } from "./order-book"
import {
  SYMBOL_LIST,
  TIMEFRAMES,
  formatPrice,
  timeframeById,
  type Candle,
  type ChartView,
  type SymbolId,
  type SymbolSpec,
  type TimeframeId,
} from "./data"

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

type LiveCandle = {
  index: number
  close: number
  high: number
  low: number
  rising: boolean
  bodyPx: number
}

function CandleSeries({ candles, live }: { candles: Candle[]; live: LiveCandle | null }) {
  const yScale = useYAxisScale()
  const xScale = useXAxisScale()
  if (!yScale || !xScale || candles.length === 0) return null

  const bodyWidth = Math.max(5, Math.min(11, 240 / candles.length))
  const glow = live?.rising ? "#34d399" : "#fb7185"

  return (
    <g>
      <defs>
        <filter id="live-candle-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.4" floodColor={glow} floodOpacity="0.95" />
        </filter>
      </defs>
      {candles.map((candle) => {
        const x = xScale(candle.index, { position: "middle" })
        const isLive = live != null && candle.index === live.index
        const close = isLive ? live.close : candle.close
        const high = isLive ? live.high : candle.high
        const low = isLive ? live.low : candle.low
        const yHigh = yScale(high)
        const yLow = yScale(low)
        const yOpen = yScale(candle.open)
        const yClose = yScale(close)
        if (x == null || yHigh == null || yLow == null || yOpen == null || yClose == null) return null

        const rising = isLive ? live.rising : close >= candle.open
        const extra = isLive ? live.bodyPx : 0
        let top = Math.min(yOpen, yClose)
        let height = Math.max(Math.abs(yClose - yOpen), 2)
        let wickTop = yHigh
        let wickBottom = yLow
        if (extra > 0) {
          if (rising) {
            top -= extra
            height += extra
            wickTop -= extra
          } else {
            height += extra
            wickBottom += extra
          }
        }
        const color = rising ? "#34d399" : "#fb7185"
        return (
          <g key={candle.index}>
            <line x1={x} x2={x} y1={wickTop} y2={wickBottom} stroke="#cbd5e1" strokeWidth={1.25} />
            <rect
              x={x - bodyWidth / 2}
              y={top}
              width={bodyWidth}
              height={height}
              rx={0.5}
              fill={color}
              filter={isLive ? "url(#live-candle-glow)" : undefined}
            />
          </g>
        )
      })}
    </g>
  )
}

function priceStep(symbolId: SymbolId) {
  if (symbolId === "BTCUSDT") return 8 + Math.random() * 7
  return 0.02 + Math.random() * 0.02
}

export function TradingChartMockup({
  symbol,
  scenarioIndex,
  timeframeId,
  view,
  reducedMotion,
  onSymbol,
  onTimeframe,
  onView,
}: {
  symbol: SymbolSpec
  scenarioIndex: number
  timeframeId: TimeframeId
  view: ChartView
  reducedMotion: boolean
  onSymbol: (id: SymbolId) => void
  onTimeframe: (id: TimeframeId) => void
  onView: (view: ChartView) => void
}) {
  const timeframe = timeframeById(timeframeId)
  const maxStart = Math.max(0, symbol.candles.length - timeframe.window)
  const eventIndex = symbol.eventIndex[scenarioIndex] ?? symbol.eventIndex[0]
  const focusStart = clamp(eventIndex - Math.floor(timeframe.window * (2 / 3)), 0, maxStart)

  const [windowStart, setWindowStart] = useState(focusStart)
  const startRef = useRef(focusStart)
  const animatingRef = useRef(false)

  useEffect(() => {
    const from = startRef.current
    const to = focusStart
    if (reducedMotion || Math.abs(from - to) < 0.01) {
      startRef.current = to
      setWindowStart(to)
      animatingRef.current = false
      return
    }

    animatingRef.current = true
    let frame = 0
    const started = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 500)
      const eased = 1 - (1 - progress) ** 3
      const value = from + (to - from) * eased
      startRef.current = value
      setWindowStart(value)
      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        animatingRef.current = false
      }
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      animatingRef.current = false
    }
  }, [focusStart, reducedMotion])

  useEffect(() => {
    if (reducedMotion) return
    const id = window.setInterval(() => {
      if (animatingRef.current) return
      setWindowStart((current) => {
        const next = Math.min(maxStart, current + 1)
        startRef.current = next
        return next
      })
    }, timeframe.stepMs)
    return () => window.clearInterval(id)
  }, [reducedMotion, timeframe.stepMs, maxStart])

  const start = clamp(Math.round(windowStart), 0, maxStart)
  const visible = symbol.candles.slice(start, start + timeframe.window)
  const anchor = visible[visible.length - 1]
  const anchorClose = anchor?.close ?? symbol.entry
  const [liveTick, setLiveTick] = useState<LiveCandle | null>(null)
  const anchorRef = useRef(anchor)
  anchorRef.current = anchor

  useEffect(() => {
    const tick = () => {
      const currentAnchor = anchorRef.current
      if (!currentAnchor) return
      const band = Math.abs(currentAnchor.close) * 0.0015
      const floor = currentAnchor.close - band
      const ceiling = currentAnchor.close + band
      setLiveTick((previous) => {
        const sameCandle = previous != null && previous.index === currentAnchor.index
        const base = sameCandle ? previous.close : currentAnchor.close
        let step = priceStep(symbol.id) * (Math.random() < 0.5 ? -1 : 1)
        let next = clamp(base + step, floor, ceiling)
        if (next === base) {
          step = -step
          next = clamp(base + step, floor, ceiling)
        }
        const delta = next - currentAnchor.close
        return {
          index: currentAnchor.index,
          close: next,
          high: currentAnchor.high + Math.max(0, delta),
          low: currentAnchor.low + Math.min(0, delta),
          rising: next >= base,
          bodyPx: 3 + Math.random() * 5,
        }
      })
    }
    tick()
    const tickId = window.setInterval(tick, 400)
    return () => window.clearInterval(tickId)
  }, [symbol.id])

  const live =
    liveTick && anchor && liveTick.index === anchor.index ? liveTick : null
  const liveClose = live?.close ?? anchorClose
  const plotted = visible.map((candle) =>
    live && candle.index === live.index
      ? { ...candle, close: live.close, high: live.high, low: live.low }
      : candle,
  )

  const stopTarget = scenarioIndex === 0 ? symbol.stop : symbol.entry
  const [stopY, setStopY] = useState(symbol.stop)
  const stopRef = useRef(symbol.stop)
  const symbolIdRef = useRef(symbol.id)

  useEffect(() => {
    const symbolChanged = symbolIdRef.current !== symbol.id
    symbolIdRef.current = symbol.id
    const from = stopRef.current
    const to = stopTarget
    if (symbolChanged || reducedMotion || Math.abs(from - to) < 0.0001) {
      stopRef.current = to
      setStopY(to)
      return
    }

    let frame = 0
    const started = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 600)
      const eased = 1 - (1 - progress) ** 3
      const value = from + (to - from) * eased
      stopRef.current = value
      setStopY(value)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [stopTarget, symbol.id, reducedMotion])

  const [flash, setFlash] = useState<{ dir: "up" | "down"; token: number } | null>(null)
  const previousClose = useRef<number | null>(null)
  const previousSymbol = useRef(symbol.id)

  useEffect(() => {
    if (previousSymbol.current !== symbol.id) {
      previousSymbol.current = symbol.id
      previousClose.current = liveClose
      setFlash(null)
      return
    }
    const previous = previousClose.current
    previousClose.current = liveClose
    if (previous == null || previous === liveClose) return
    setFlash({ dir: liveClose > previous ? "up" : "down", token: Date.now() })
    const timeout = window.setTimeout(() => setFlash(null), 450)
    return () => window.clearTimeout(timeout)
  }, [liveClose, symbol.id, reducedMotion])

  const minPrice = Math.min(symbol.stop, symbol.low)
  const maxPrice = Math.max(symbol.target, symbol.high)
  const pad = (maxPrice - minPrice) * 0.08
  const domain: [number, number] = [minPrice - pad, maxPrice + pad]
  const breakEven = Math.abs(stopY - symbol.entry) / symbol.entry < 0.001

  return (
    <div className="flex h-auto min-w-0 flex-col rounded-2xl border border-slate-800 bg-slate-950/50 px-3 pt-3 pb-4">
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs text-slate-400">
        <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5" role="group" aria-label="Symbol">
          {SYMBOL_LIST.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === symbol.id}
              onClick={() => onSymbol(item.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                item.id === symbol.id ? "bg-emerald-500/15 text-emerald-300" : "text-slate-400 hover:text-slate-200",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p
          key={flash?.token ?? "price"}
          className={cn(
            "text-xl font-semibold tabular-nums text-white md:text-2xl",
            flash?.dir === "up" && "price-flash-up",
            flash?.dir === "down" && "price-flash-down",
          )}
        >
          ${formatPrice(liveClose, symbol.decimals)}
        </p>
        <span>
          24h Vol <span className="tabular-nums text-slate-200">{symbol.volume}</span>
        </span>
        <span>
          High <span className="tabular-nums text-emerald-300">{formatPrice(symbol.high, symbol.decimals)}</span>
        </span>
        <span>
          Low <span className="tabular-nums text-rose-300">{formatPrice(symbol.low, symbol.decimals)}</span>
        </span>
        <div className="flex rounded-lg border border-slate-800 p-0.5" role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === timeframeId}
              onClick={() => onTimeframe(item.id)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-semibold transition-colors sm:text-xs",
                item.id === timeframeId ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300",
              )}
            >
              {item.id}
            </button>
          ))}
        </div>
        <div
          className="ml-auto flex rounded-lg border border-slate-700 bg-slate-950/90 p-0.5"
          role="tablist"
          aria-label="Chart view"
        >
          <ViewTab label="Live Candlestick" selected={view === "candles"} onClick={() => onView("candles")} />
          <ViewTab label="Depth & Analytics" selected={view === "depth"} onClick={() => onView("depth")} />
        </div>
      </div>

      <div className="relative mt-2 h-[280px] lg:h-[320px]">
        <div className="h-full">
          {view === "candles" ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart data={plotted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="index" type="category" hide />
                <YAxis
                  domain={domain}
                  width={56}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(value: number) => formatPrice(value, symbol.decimals)}
                  axisLine={false}
                  tickLine={false}
                  allowDataOverflow
                />
                <CandleSeries candles={plotted} live={live} />
                <ReferenceLine
                  y={symbol.entry}
                  stroke="#60a5fa"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  ifOverflow="visible"
                  label={
                    breakEven
                      ? undefined
                      : { value: "ENTRY", fill: "#60a5fa", fontSize: 10, position: "insideTopLeft" }
                  }
                />
                <ReferenceLine
                  y={stopY}
                  stroke="#fb7185"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  ifOverflow="visible"
                  label={{
                    value: breakEven ? "BREAK-EVEN" : "STOP-LOSS",
                    fill: "#fb7185",
                    fontSize: 10,
                    position: "insideBottomLeft",
                  }}
                />
                <ReferenceLine
                  y={symbol.target}
                  stroke="#34d399"
                  strokeDasharray="5 4"
                  strokeWidth={1.5}
                  ifOverflow="visible"
                  className={scenarioIndex === 1 && !reducedMotion ? "target-pulse" : undefined}
                  label={{ value: "TARGET 1", fill: "#34d399", fontSize: 10, position: "insideTopLeft" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <OrderBook mid={liveClose} decimals={symbol.decimals} tick={symbol.tick} />
          )}
        </div>

        {scenarioIndex === 2 ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-rose-950/35 ring-1 ring-inset ring-rose-500/50">
            <div className="rounded-xl border border-rose-500/60 bg-slate-950/80 px-4 py-3 text-center shadow-xl">
              <p className="text-xs font-semibold tracking-wide text-rose-400">DAILY LIMIT 2/2</p>
              <p className="mt-1 text-sm text-rose-100">New entries flagged as a rule break</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ViewTab({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "rounded-md px-2 py-1 text-[10px] font-semibold whitespace-nowrap sm:text-xs",
        selected ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200",
      )}
    >
      {label}
    </button>
  )
}
