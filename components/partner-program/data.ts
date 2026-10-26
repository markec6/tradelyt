export const TELEGRAM_COLORS = {
  background: "#17212B",
  header: "#242F3D",
  bubble: "#182533",
} as const

export const WORD_MS = 80
export const CHAT_HOLD_MS = 2000
export const STATS_MS = 4000

export const WELCOME_MESSAGE =
  "Welcome to Tradelyt Guardrail! Your account is now protected against overtrading and emotional losses. Let's make this week 100% disciplined."

export const WELCOME_WORDS = WELCOME_MESSAGE.split(" ")
export const CHAT_PHASE_MS = Math.max(0, WELCOME_WORDS.length - 1) * WORD_MS + CHAT_HOLD_MS

export const COPY = {
  badge: "For Educators & Group Leaders",
  headlineLead: "Protect Your Community's Capital.",
  headlineTail: "Monetize Their Discipline.",
  subheadline:
    "Retention is everything. When your members trade emotionally and lose their capital, they leave your group. Tradelyt enforces strict discipline, keeps your members profitable longer, and pays you a recurring revenue share on every subscription.",
  cta: "Apply for Partner Access",
  ctaHref: "mailto:partners@tradelyt.com",
  microcopy: "Instant partner approval for communities with 50+ members.",
  toastTitle: "Tradelyt Guardrail Bot",
  toastBody: "Tap to connect your trading account",
  toastTime: "now",
  botName: "Tradelyt Guardrail Bot",
  botStatus: "online",
  buttonLabel: "Start Guardrail",
  miniKicker: "Guardrail",
  miniHeadlineLead: "Trade With Logic,",
  miniHeadlineTail: "Not Emotion",
  miniSub: "Discipline enforced in real time. Overtrading stops here.",
  messagePlaceholder: "Message",
} as const

export const VALUE_PROPS = [
  {
    title: "Recurring Revenue Share",
    body: "Earn a monthly passive split (up to 50%) for every active member using your partner code.",
  },
  {
    title: "Maximum Community Retention",
    body: "Stop members from blowing up accounts during high-volatility events. A protected member stays a paying member.",
  },
  {
    title: "Zero Friction Setup",
    body: "One custom link for your entire group. Instant Telegram integration with zero coding required.",
  },
] as const
