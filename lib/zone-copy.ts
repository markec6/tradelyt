import type { Language, Mode, Side, Zone } from "@/lib/zones"

export type FrameInput = {
  language: Language
  zone: Zone
  mode: Mode | null
  body: string
  coin: string
  side: Side
  entry: number
  price: number
  pnlUsd: number
  pnlPct: number
  openedAt: number
  now: number
  name: string
  passive: boolean
  realizedUsd?: number
  note?: string
}

const ZONE_LABEL: Record<Language, Record<Zone, string>> = {
  en: {
    neutral: "ZONE 1 · CALM",
    approach_tp1: "APPROACHING TP1",
    tp1: "ZONE 2 · TP1",
    tp2: "ZONE 3 · TP2",
    approach_sl: "APPROACHING STOP",
    sl: "ZONE 4 · STOP",
  },
  sr: {
    neutral: "ZONA 1 · MIRNA",
    approach_tp1: "PRILAZ TP1",
    tp1: "ZONA 2 · TP1",
    tp2: "ZONA 3 · TP2",
    approach_sl: "PRILAZ STOP-LOSSA",
    sl: "ZONA 4 · STOP",
  },
}

const MODE_LABEL: Record<Mode, string> = {
  scalper: "SCALPER",
  classic: "CLASSIC",
  moonshot: "MOONSHOT",
}

export function zoneMark(zone: Zone) {
  if (zone === "tp1" || zone === "tp2") return "🟢"
  if (zone === "sl" || zone === "approach_sl") return "🔴"
  if (zone === "approach_tp1") return "🟡"
  return "🔵"
}

export function formatPrice(value: number) {
  if (!Number.isFinite(value)) return "—"
  const abs = Math.abs(value)
  const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : 8
  return value.toFixed(digits).replace(/\.?0+$/, "")
}

export function formatUsd(value: number) {
  if (!Number.isFinite(value)) return "—"
  const sign = value > 0 ? "+" : value < 0 ? "-" : ""
  return `${sign}$${Math.abs(value).toFixed(2)}`
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

export function formatDuration(ms: number, language: Language) {
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const rest = minutes % 60
  if (language === "sr") {
    if (days > 0) return `${days} d ${hours} h`
    if (hours > 0) return `${hours} h ${rest} min`
    return `${rest} min`
  }
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${rest}m`
  return `${rest}m`
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function renderFrame(input: FrameInput) {
  const mark = zoneMark(input.zone)
  const zone = ZONE_LABEL[input.language][input.zone]
  const mode = input.mode ? MODE_LABEL[input.mode] : ""
  const labels =
    input.language === "sr"
      ? { entry: "Ulaz", price: "Cena", pnl: "PnL", open: "Trajanje", realized: "Realizovano" }
      : { entry: "Entry", price: "Price", pnl: "PnL", open: "Open for", realized: "Realized" }
  const side = input.side === "long" ? "LONG" : "SHORT"
  const lines = [
    "Tradelyt",
    `${mark} <b>${escapeHtml(zone)}${mode ? ` · ${mode}` : ""}</b>`,
  ]
  if (input.body.trim()) lines.push("", escapeHtml(input.body.trim()))
  lines.push(
    "",
    `<b>${escapeHtml(input.coin)}</b> · ${side}`,
    `${labels.entry}: ${formatPrice(input.entry)}`,
    `${labels.price}: ${formatPrice(input.price)}`,
    `${labels.pnl}: ${formatUsd(input.pnlUsd)} (${formatPercent(input.pnlPct)})`,
    `${labels.open}: ${formatDuration(input.now - input.openedAt, input.language)}`,
  )
  if (input.realizedUsd != null && input.realizedUsd !== 0) {
    lines.push(`${labels.realized}: ${formatUsd(input.realizedUsd)}`)
  }
  if (input.passive) {
    lines.push(
      "",
      input.language === "sr"
        ? `Trejd je u mirnoj zoni već ${formatDuration(input.now - input.openedAt, "sr")}.`
        : `This trade has stayed in the calm zone.`,
    )
  }
  if (input.note) lines.push("", escapeHtml(input.note))
  return lines.join("\n")
}

export type ButtonSpec = { text: string; data: string }

export function zoneButtons(language: Language, zone: Zone, tradeId: string, askingTp1: boolean): ButtonSpec[] {
  const close = language === "sr" ? "Zatvori praćenje" : "Close tracking"
  const closeButton = { text: close, data: `close:${tradeId}` }
  if (askingTp1) {
    return [
      { text: "25%", data: `tp1p25:${tradeId}` },
      { text: "50%", data: `tp1p50:${tradeId}` },
      { text: "75%", data: `tp1p75:${tradeId}` },
    ]
  }
  if (zone === "tp1") {
    return [{ text: language === "sr" ? "Osiguran TP1" : "TP1 secured", data: `tp1:${tradeId}` }, closeButton]
  }
  if (zone === "tp2") {
    return [{ text: language === "sr" ? "Profit zaključan" : "Profit locked", data: `tp2:${tradeId}` }, closeButton]
  }
  if (zone === "sl") {
    return [{ text: language === "sr" ? "Izašao sam" : "I'm out", data: `sl:${tradeId}` }, closeButton]
  }
  return [closeButton]
}

export function specialFrame(input: {
  language: Language
  body: string
  name: string
  coin: string
  entries: number
  window: string
  count: number
  limit: number
  equity: string
}) {
  const header = input.language === "sr" ? "⚠️ ZAŠTITA POZICIJA" : "⚠️ POSITION WARNING"
  const facts =
    input.language === "sr"
      ? [
          input.entries >= 3 ? `${input.coin}: ${input.entries} ulaza na istu poziciju.` : "",
          input.window ? `Prozor ${input.window}: ${input.count} trejdova, prag ${input.limit}.` : "",
          input.equity ? `Kapital pri otvaranju: ${input.equity}.` : "Kapital nije povezan, pa nema odnosa prema njemu.",
        ]
      : [
          input.entries >= 3 ? `${input.coin}: ${input.entries} entries on the same position.` : "",
          input.window ? `Window ${input.window}: ${input.count} trades, limit ${input.limit}.` : "",
          input.equity ? `Equity at open: ${input.equity}.` : "Equity is not connected, so there is no capital ratio.",
        ]
  const lines = ["Tradelyt", `<b>${header}</b>`]
  if (input.body.trim()) lines.push("", escapeHtml(input.body.trim()))
  for (const fact of facts) {
    if (fact) lines.push(escapeHtml(fact))
  }
  return lines.join("\n")
}

export function commandText(language: Language, key: string) {
  const copy: Record<string, Record<Language, string>> = {
    saved: {
      en: "Trade saved. The first zone message goes out once the mode is known.",
      sr: "Trejd je sačuvan. Prva poruka zone ide čim je mod poznat.",
    },
    uncovered: {
      en: "Price for this symbol is not covered. The trade is saved and zone alarms stay off.",
      sr: "Cena ovog simbola nije pokrivena. Trejd je sačuvan, a alarmi zona ostaju ugašeni.",
    },
    closed: {
      en: "Tracking closed.",
      sr: "Praćenje je zatvoreno.",
    },
    paused: {
      en: "Messages are paused. Tracking continues.",
      sr: "Poruke su pauzirane. Praćenje se nastavlja.",
    },
    resumed: {
      en: "Messages are on.",
      sr: "Poruke su uključene.",
    },
    hedge: {
      en: "The opposite side is already open on this symbol.",
      sr: "Suprotna strana je već otvorena na ovom simbolu.",
    },
    invalid: {
      en: "Use /trade SYMBOL LONG|SHORT ENTRY Q SIZE, then optional SL, TP, and TP2.",
      sr: "Koristi /trade SIMBOL LONG|SHORT ULAZ Q KOLIČINA, pa po želji SL, TP i TP2.",
    },
    missing: {
      en: "No open trade on that symbol.",
      sr: "Nema otvorenog trejda na tom simbolu.",
    },
    subscription: {
      en: "Zone messages are off until the subscription is active.",
      sr: "Poruke zona su ugašene dok pretplata nije aktivna.",
    },
    already: {
      en: "This trade is already closed.",
      sr: "Ovaj trejd je već zatvoren.",
    },
    tp1ask: {
      en: "How much of the position did you close?",
      sr: "Koliki deo pozicije si zatvorio?",
    },
    tp1done: {
      en: "TP1 is recorded. Tracking continues on the remainder.",
      sr: "TP1 je upisan. Praćenje ide dalje na ostatku.",
    },
    locked: {
      en: "Profit locked. Tracking is closed.",
      sr: "Profit je zaključan. Praćenje je zatvoreno.",
    },
    stopped: {
      en: "Exit recorded. Tracking is closed.",
      sr: "Izlaz je upisan. Praćenje je zatvoreno.",
    },
    price: {
      en: "The price is unavailable right now. Nothing was changed.",
      sr: "Cena trenutno nije dostupna. Ništa nije promenjeno.",
    },
    ack: {
      en: "Noted.",
      sr: "Primljeno.",
    },
  }
  return copy[key]?.[language] ?? copy[key]?.en ?? ""
}
