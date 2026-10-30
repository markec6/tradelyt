export type SandboxExchange = "paper" | "binance_testnet" | "bybit_testnet"
export type LiveExchange = "binance" | "bybit" | "okx"
export type ExchangeId = SandboxExchange | LiveExchange
export type TradingMode = "sandbox" | "live"

export type ExchangeDraft = {
  exchange: ExchangeId | null
  mode: TradingMode
  apiKey: string
  apiSecret: string
  passphrase: string
}

export type ExchangeErrors = {
  apiKey?: string
  apiSecret?: string
  passphrase?: string
  form?: string
}

export const EMPTY_EXCHANGE: ExchangeDraft = {
  exchange: "paper",
  mode: "sandbox",
  apiKey: "",
  apiSecret: "",
  passphrase: "",
}

export const EXCHANGE_FIELD_ORDER = ["apiKey", "apiSecret", "passphrase"] as const

const SANDBOX = new Set<SandboxExchange>(["paper", "binance_testnet", "bybit_testnet"])
const LIVE = new Set<LiveExchange>(["binance", "bybit", "okx"])
const KEY = /^[A-Za-z0-9]{16,128}$/

function keyError(value: string, empty: string) {
  if (value.length === 0) return empty
  if (!KEY.test(value)) return "Use 16–128 letters or numbers, with no spaces."
  return undefined
}

export function validateExchange(draft: ExchangeDraft): ExchangeErrors {
  if (draft.mode !== "sandbox" && draft.mode !== "live") return { form: "Choose an exchange." }
  if (draft.mode === "live") {
    if (!draft.exchange || !LIVE.has(draft.exchange as LiveExchange)) return { form: "Choose an exchange." }
  } else if (!draft.exchange || !SANDBOX.has(draft.exchange as SandboxExchange)) {
    return { form: "Choose an exchange." }
  }
  if (draft.exchange === "paper") return {}

  const errors: ExchangeErrors = {}
  const apiKey = keyError(draft.apiKey, "Enter your API key.")
  const apiSecret = keyError(draft.apiSecret, "Enter your API secret.")
  if (apiKey) errors.apiKey = apiKey
  if (apiSecret) errors.apiSecret = apiSecret
  if (draft.exchange === "okx") {
    if (draft.passphrase.length === 0) errors.passphrase = "Enter your passphrase."
    else if (draft.passphrase.length < 8 || draft.passphrase.length > 64) {
      errors.passphrase = "Use 8–64 characters."
    }
  }
  return errors
}
