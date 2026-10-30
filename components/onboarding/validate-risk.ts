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

export const EMPTY_RISK: RiskDraft = {
  strategy: null,
  maxDrawdown: "",
  riskPerTrade: "",
  stopLoss: true,
  trailingTakeProfit: true,
  emergencyStop: true,
}

export const RISK_FIELD_ORDER = ["maxDrawdown", "riskPerTrade"] as const

const STRATEGIES = new Set<StrategyId>(["dca", "grid", "momentum"])
const ONE_DECIMAL = /^(?:\d+)(?:\.\d)?$/

function percentError(value: string, min: number, max: number, empty: string, range: string) {
  const trimmed = value.trim()
  if (trimmed.length === 0) return empty
  if (!ONE_DECIMAL.test(trimmed)) return "Use a number with at most one decimal."
  const amount = Number(trimmed)
  if (!Number.isFinite(amount) || amount < min || amount > max) return range
  return undefined
}

export function validateRisk(draft: RiskDraft): RiskErrors {
  if (!draft.strategy || !STRATEGIES.has(draft.strategy)) return { form: "Choose a strategy." }
  const maxDrawdown = percentError(draft.maxDrawdown, 1, 50, "Enter a max drawdown.", "Use 1–50.")
  if (maxDrawdown) return { maxDrawdown }
  const riskPerTrade = percentError(draft.riskPerTrade, 0.1, 5, "Enter the risk per trade.", "Use 0.1–5.")
  if (riskPerTrade) return { riskPerTrade }
  return {}
}
