import { neon } from "@neondatabase/serverless"

import type { Language, Mode } from "@/lib/zones"

export const TEMPLATE_ZONES = ["neutral", "tp1", "tp2", "sl", "special_positions", "approach_tp1", "approach_sl"] as const
export const PLACEHOLDERS = [
  "coin",
  "entry_price",
  "current_price",
  "pnl_usd",
  "pnl_pct",
  "duration",
  "name",
  "side",
  "entries",
  "open_count",
  "window",
  "limit",
  "equity",
] as const

const PLACEHOLDER_SET = new Set<string>(PLACEHOLDERS)
const BODY_LIMIT = 3000

export type TemplateZone = (typeof TEMPLATE_ZONES)[number]

export type TemplateRow = {
  id: string
  code: string
  mode: Mode | null
  zone: TemplateZone
  variant: number
  language: Language
  body: string
}

const CODES: { code: string; mode: Mode | null; zone: TemplateZone; variant: number }[] = []
for (const mode of ["scalper", "classic", "moonshot"] as const) {
  const prefix = mode === "scalper" ? "SC" : mode === "classic" ? "CL" : "MS"
  for (const [zone, label] of [
    ["neutral", "Z1"],
    ["tp1", "Z2"],
    ["tp2", "Z3"],
    ["sl", "Z4"],
  ] as const) {
    for (const variant of [1, 2, 3]) {
      CODES.push({ code: `${prefix}-${label}-V${variant}`, mode, zone, variant })
    }
  }
}
for (const variant of [1, 2, 3]) {
  CODES.push({ code: `SP-V${variant}`, mode: null, zone: "special_positions", variant })
}

export const TEMPLATE_SLOTS = CODES

export function validateTemplateBody(body: string) {
  if (!body.trim()) return "Body is empty."
  if (body.length > BODY_LIMIT) return "Body is longer than 3000 characters."
  const found = body.matchAll(/\{([a-z0-9_]+)\}/g)
  for (const match of found) {
    if (!PLACEHOLDER_SET.has(match[1] ?? "")) return `Unknown placeholder {${match[1]}}.`
  }
  if (body.includes("{") && !/\{[a-z0-9_]+\}/.test(body)) return "Broken placeholder."
  return null
}

export function fillTemplate(body: string, values: Record<string, string>) {
  return body.replace(/\{([a-z0-9_]+)\}/g, (token, key: string) => {
    if (!PLACEHOLDER_SET.has(key)) return token
    return values[key] ?? ""
  })
}

export function pickRotating<T extends { variant: number }>(variants: readonly T[], lastVariant: number | null) {
  if (variants.length === 0) return null
  const pool = lastVariant == null ? variants : variants.filter((item) => item.variant !== lastVariant)
  const source = pool.length > 0 ? pool : variants
  const index = Math.floor(Math.random() * source.length)
  return source[index] ?? null
}

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

function text(value: unknown) {
  return typeof value === "string" ? value : null
}

export async function loadActiveTemplates(): Promise<TemplateRow[]> {
  const sql = database()
  const rows = await sql`
    SELECT id::text, code, mode, zone, variant, language, body
    FROM telegram_message_templates
    WHERE is_active = true
  `
  const templates: TemplateRow[] = []
  for (const row of rows) {
    const id = text(row.id)
    const code = text(row.code)
    const zone = text(row.zone)
    const language = text(row.language)
    const body = text(row.body)
    const variant = Number(row.variant)
    const mode = text(row.mode)
    if (!id || !code || !zone || (language !== "en" && language !== "sr") || !body || !Number.isInteger(variant)) continue
    if (mode != null && mode !== "scalper" && mode !== "classic" && mode !== "moonshot") continue
    templates.push({
      id,
      code,
      mode: mode as Mode | null,
      zone: zone as TemplateZone,
      variant,
      language,
      body,
    })
  }
  return templates
}

export async function lastVariantFor(tradeId: string, zone: string) {
  const sql = database()
  const rows = await sql`
    SELECT t.variant
    FROM notifications_log n
    JOIN telegram_message_templates t ON t.id = n.template_id
    WHERE n.trade_id = ${tradeId}::uuid
      AND n.zone = ${zone}
    ORDER BY n.sent_at DESC
    LIMIT 1
  `
  const variant = Number(rows[0]?.variant)
  return Number.isInteger(variant) ? variant : null
}

export function chooseBody(input: {
  templates: readonly TemplateRow[]
  mode: Mode | null
  zone: string
  language: Language
  lastVariant: number | null
}) {
  const matches = input.templates.filter(
    (template) =>
      template.zone === input.zone &&
      template.language === input.language &&
      template.mode === input.mode,
  )
  return pickRotating(matches, input.lastVariant)
}
