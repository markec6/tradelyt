import type { ExchangeDraft } from "./validate-exchange"
import { withDefaults, type RiskDraft } from "./validate-risk"
import type { TelegramDraft } from "./validate-telegram"

type ReviewStepProps = {
  telegram: TelegramDraft
  exchange: ExchangeDraft
  risk: RiskDraft
}

const EXCHANGE_LABEL: Record<string, string> = {
  paper: "Tradelyt Paper · Sandbox",
  binance_testnet: "Binance Testnet · Sandbox",
  bybit_testnet: "Bybit Testnet · Sandbox",
  binance: "Binance · Live",
  bybit: "Bybit · Live",
  okx: "OKX · Live",
}

const STRATEGY_LABEL = {
  dca: "DCA",
  grid: "Grid Trading",
  momentum: "Momentum Breakout",
} as const

function telegramLabel(handle: string) {
  const name = handle.trim().replace(/^@+/, "")
  return name ? `@${name}` : "Not connected"
}

export function ReviewStep({ telegram, exchange, risk }: ReviewStepProps) {
  const limits = withDefaults(risk)
  const rows = [
    { label: "Telegram", value: telegramLabel(telegram.handle) },
    { label: "Exchange", value: exchange.exchange ? EXCHANGE_LABEL[exchange.exchange] : "Not connected" },
    { label: "Strategy", value: risk.strategy ? STRATEGY_LABEL[risk.strategy] : "Not set" },
    {
      label: "Risk",
      value: `${limits.maxDrawdown}% drawdown · ${limits.riskPerTrade}% per trade`,
    },
  ]

  return (
    <div className="mt-4 space-y-2 sm:mt-5">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex h-12 items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/70 px-3.5"
        >
          <span className="text-sm text-slate-400">{row.label}</span>
          <span className="text-right text-sm font-medium text-white">{row.value}</span>
        </div>
      ))}
    </div>
  )
}
