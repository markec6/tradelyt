export type TelegramDraft = {
  handle: string
  tradeExecutions: boolean
  riskWarnings: boolean
  dailyPnl: boolean
}

export const EMPTY_TELEGRAM: TelegramDraft = {
  handle: "",
  tradeExecutions: true,
  riskWarnings: true,
  dailyPnl: true,
}

const HANDLE = /^[A-Za-z][A-Za-z0-9_]{3,30}[A-Za-z0-9]$/

export function telegramHandleError(handle: string) {
  if (handle.length === 0) return "Enter your Telegram username."
  if (!HANDLE.test(handle)) {
    return "Use 5–32 letters, numbers, or underscores. Start with a letter and do not end with an underscore."
  }
  return undefined
}
