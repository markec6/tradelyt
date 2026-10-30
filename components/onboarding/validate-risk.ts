export type StrategyId = "dca" | "grid" | "momentum"

export type RiskDraft = {
  strategy: StrategyId | null
  maxDrawdown: string
  riskPerTrade: string
  stopLoss: boolean
  trailingTakeProfit: boolean
  emergencyStop: boolean
}

export type RiskErrors = {
  maxDrawdown?: string
  riskPerTrade?: string
  form?: string
}

export const DEFAULT_MAX_DRAWDOWN = "2.5"
export const DEFAULT_RISK_PER_TRADE = "1.0"

export const EMPTY_RISK: RiskDraft = {
  strategy: null,
  maxDrawdown: DEFAULT_MAX_DRAWDOWN,
  riskPerTrade: DEFAULT_RISK_PER_TRADE,
  stopLoss: true,
  trailingTakeProfit: true,
  emergencyStop: true,
}

export function withDefaults(draft: RiskDraft): RiskDraft {
  return {
    ...draft,
    maxDrawdown: draft.maxDrawdown.trim() || DEFAULT_MAX_DRAWDOWN,
    riskPerTrade: draft.riskPerTrade.trim() || DEFAULT_RISK_PER_TRADE,
  }
}

export const RISK_FIELD_ORDER = ["maxDrawdown", "riskPerTrade"] as const

const STRATEGIES = new Set<StrategyId>(["dca", "grid", "momentum"])
const ONE_DECIMAL = /^(?:\d+)(?:\.\d)?$/

function percentError(value: string, min: number, max: number, range: string) {
  if (!ONE_DECIMAL.test(value)) return "Use a number with at most one decimal."
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < min || amount > max) return range
  return undefined
}

export function validateRisk(draft: RiskDraft): RiskErrors {
  const filled = withDefaults(draft)
  if (!filled.strategy || !STRATEGIES.has(filled.strategy)) return { form: "Choose a strategy." }
  const maxDrawdown = percentError(filled.maxDrawdown, 1, 50, "Use 1–50.")
  if (maxDrawdown) return { maxDrawdown }
  const riskPerTrade = percentError(filled.riskPerTrade, 0.1, 5, "Use 0.1–5.")
  if (riskPerTrade) return { riskPerTrade }
  return {}
}
