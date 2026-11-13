import type { AccountDraft } from "./validate-account"
import type { ExchangeDraft } from "./validate-exchange"
import type { RiskDraft } from "./validate-risk"
import type { TelegramDraft } from "./validate-telegram"

export type OnboardingStep = 1 | 2 | 3 | 4 | 5

export type TelegramPhase = "form" | "wait" | "needs-username" | "expired"

export type OnboardingResume = {
  step: OnboardingStep
  telegramPhase: TelegramPhase
  account: AccountDraft
  telegram: TelegramDraft
  exchange: ExchangeDraft
  risk: RiskDraft
}
