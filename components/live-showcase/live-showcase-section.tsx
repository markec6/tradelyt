"use client"

import { useState } from "react"
import { ScenarioPanel } from "./scenario-panel"
import { TelegramBubble } from "./telegram-bubble"
import { TradingChartMockup } from "./trading-chart-mockup"
import { SYMBOLS, scenarioMessage, type ChartView, type SymbolId, type TimeframeId } from "./data"
import { useShowcasePlayback } from "./use-showcase-playback"

export function LiveShowcaseSection() {
  const { scenarioIndex, reducedMotion, selectScenario } = useShowcasePlayback()
  const [symbolId, setSymbolId] = useState<SymbolId>("BTCUSDT")
  const [timeframeId, setTimeframeId] = useState<TimeframeId>("5m")
  const [view, setView] = useState<ChartView>("candles")
  const symbol = SYMBOLS[symbolId]
  const message = scenarioMessage(symbol, scenarioIndex)

  return (
    <section
      className="mx-auto my-6 w-[92%] max-w-7xl overflow-x-hidden rounded-3xl border border-slate-800 bg-slate-900/70 px-6 py-8 shadow-2xl backdrop-blur-xl md:my-10 md:px-8 md:py-10 lg:my-16 lg:py-6"
    >
      <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
        <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:justify-center lg:gap-4">
          <div className="order-1 mb-3 min-w-0 lg:order-none lg:mb-0">
            <div className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-reduce:animate-none animate-pulse" />
              <p className="text-xs font-semibold tracking-[0.2em] text-emerald-400">LIVE</p>
            </div>
            <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">Live Trading Engine</h2>
          </div>
          <div className="order-2 min-w-0 lg:order-none">
            <ScenarioPanel scenarioIndex={scenarioIndex} onSelect={selectScenario} />
          </div>
          <div className="order-4 min-w-0 lg:order-none">
            <TelegramBubble compact text={message.text} time={message.time} tone={message.tone} />
            <a
              href="https://t.me/TradelytBot"
              className="mt-5 block w-full cursor-pointer rounded-xl bg-emerald-500 px-6 py-3 text-center font-bold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all duration-300 hover:scale-[1.02] hover:bg-emerald-400 sm:w-auto"
            >
              Start guardrail
            </a>
            <p className="mt-2 flex items-center justify-start gap-1.5 text-xs font-medium text-slate-400/90">
              <span aria-hidden="true">⚡</span>
              Set up in 30 seconds. No credit card required.
            </p>
          </div>
        </div>

        <div className="order-3 min-w-0 lg:order-none lg:col-span-7">
          <TradingChartMockup
            symbol={symbol}
            scenarioIndex={scenarioIndex}
            timeframeId={timeframeId}
            view={view}
            reducedMotion={reducedMotion}
            onSymbol={setSymbolId}
            onTimeframe={setTimeframeId}
            onView={setView}
          />
        </div>
      </div>
    </section>
  )
}
