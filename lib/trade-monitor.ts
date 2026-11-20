import { neon } from "@neondatabase/serverless"

import { publicPrice, publicPrices, type PublicPrice } from "@/lib/bybit-public"
import { subscriptionAllowsMessages } from "@/lib/manual-trade"
import {
  chooseBody,
  fillTemplate,
  lastVariantFor,
  loadActiveTemplates,
  type TemplateRow,
} from "@/lib/telegram-templates"
import { clearButtons, editMessage, sendMessage, type TelegramButton } from "@/lib/telegram"
import {
  commandText,
  formatDuration,
  formatPercent,
  formatPrice,
  formatUsd,
  renderFrame,
  specialFrame,
  zoneButtons,
} from "@/lib/zone-copy"
import {
  inQuietHours,
  planTradeTick,
  pnlUsd,
  windowLimits,
  breachedWindow,
  type Language,
  type Mode,
  type Side,
  type TickInput,
  type Zone,
} from "@/lib/zones"

const TRACKED_LIMIT = 40

type TrackedTrade = {
  id: string
  userId: string
  symbol: string
  side: Side
  entry: number
  remaining: number
  stopLoss: number | null
  takeProfit1: number | null
  takeProfit2: number | null
  openedAt: number
  liveMessageId: string | null
  storedZone: Zone | null
  zoneChangedAt: number | null
  notifiedAt: number | null
  tpArmed: boolean
  tp1Confirmed: boolean
  slAlertCount: number
  slAlertAt: number | null
  lastEditPnl: number | null
  lastEditAt: number | null
  passiveRefreshedAt: number | null
  deferredZone: "tp1" | "tp2" | null
  equityAtOpen: number | null
  realized: number
  entries: number
  chatId: string
  language: Language
  name: string
  paused: boolean
  quiet: boolean
  tradeNotes: boolean
  riskNotes: boolean
  priceSupported: boolean
  maxDailyTrades: number
}

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

function text(value: unknown) {
  return typeof value === "string" ? value : null
}

function amount(value: unknown) {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

function millis(value: unknown) {
  if (value instanceof Date) return value.getTime()
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function asZone(value: unknown): Zone | null {
  if (value === "neutral" || value === "approach_tp1" || value === "tp1" || value === "approach_sl" || value === "tp2" || value === "sl") {
    return value
  }
  return null
}

function asMode(value: unknown): Mode | null {
  if (value === "scalper" || value === "classic" || value === "moonshot") return value
  return null
}

function clock(value: unknown) {
  return typeof value === "string" ? value : null
}

function allowsRow(row: Record<string, unknown>, now: number) {
  const status = text(row.subscription_status)
  const trialEnds = millis(row.trial_ends_at)
  const periodEnd = millis(row.current_period_end)
  if (status === "active") return true
  if (status === "trialing") return trialEnds == null || trialEnds > now
  if (status === "canceled") return periodEnd != null && periodEnd > now
  return false
}

function mapTrade(row: Record<string, unknown>, now: number): TrackedTrade | null {
  const id = text(row.id)
  const userId = text(row.user_id)
  const symbol = text(row.token_symbol)
  const side = text(row.position_type)
  const entry = amount(row.entry_price)
  const remaining = amount(row.remaining_quantity)
  const openedAt = millis(row.opened_at)
  const chatId = text(row.telegram_id)
  if (!id || !userId || !symbol || (side !== "long" && side !== "short") || entry == null || remaining == null || openedAt == null || !chatId) {
    return null
  }
  if (row.telegram_blocked_at) return null
  if (!allowsRow(row, now)) return null
  const language: Language = text(row.language) === "sr" ? "sr" : "en"
  const deferred = text(row.deferred_zone)
  return {
    id,
    userId,
    symbol,
    side,
    entry,
    remaining,
    stopLoss: amount(row.stop_loss),
    takeProfit1: amount(row.take_profit_1),
    takeProfit2: amount(row.take_profit_2),
    openedAt,
    liveMessageId: text(row.live_message_id),
    storedZone: asZone(row.zone),
    zoneChangedAt: millis(row.zone_changed_at),
    notifiedAt: millis(row.notified_at),
    tpArmed: row.tp_armed !== false,
    tp1Confirmed: millis(row.tp1_confirmed_at) != null,
    slAlertCount: Number(row.sl_alert_count) || 0,
    slAlertAt: millis(row.sl_alert_at),
    lastEditPnl: amount(row.last_edit_pnl),
    lastEditAt: millis(row.last_edit_at),
    passiveRefreshedAt: millis(row.passive_refreshed_at),
    deferredZone: deferred === "tp1" || deferred === "tp2" ? deferred : null,
    equityAtOpen: amount(row.equity_at_open),
    realized: amount(row.pnl_amount) ?? 0,
    entries: Number(row.position_entries) || 1,
    chatId,
    language,
    name: text(row.first_name) || text(row.telegram_first_name) || (language === "sr" ? "trader" : "there"),
    paused: row.paused_at != null || row.is_active === false,
    quiet: inQuietHours(new Date(now), text(row.timezone) || "UTC", row.quiet_hours_enabled === true, clock(row.quiet_hours_start), clock(row.quiet_hours_end)),
    tradeNotes: row.notify_trade_executions !== false,
    riskNotes: row.notify_risk_warnings !== false,
    priceSupported: row.price_supported !== false,
    maxDailyTrades: Number(row.max_daily_trades) || 0,
  }
}

async function loadTracked(tradeId?: string) {
  const sql = database()
  const rows = tradeId
    ? await sql`
        SELECT
          t.id::text AS id,
          t.user_id::text AS user_id,
          t.token_symbol,
          t.position_type,
          t.entry_price,
          t.remaining_quantity,
          t.stop_loss,
          t.take_profit_1,
          t.take_profit_2,
          t.opened_at,
          t.live_message_id,
          t.zone,
          t.zone_changed_at,
          t.notified_at,
          t.tp_armed,
          t.tp1_confirmed_at,
          t.sl_alert_count,
          t.sl_alert_at,
          t.last_edit_pnl,
          t.last_edit_at,
          t.passive_refreshed_at,
          t.deferred_zone,
          t.equity_at_open,
          t.pnl_amount,
          t.position_entries,
          t.price_supported,
          u.telegram_id::text AS telegram_id,
          u.language,
          u.first_name,
          u.telegram_first_name,
          u.telegram_blocked_at,
          b.is_active,
          b.paused_at,
          b.timezone,
          b.quiet_hours_enabled,
          b.quiet_hours_start,
          b.quiet_hours_end,
          b.notify_trade_executions,
          b.notify_risk_warnings,
          b.max_daily_trades,
          s.status AS subscription_status,
          s.trial_ends_at,
          s.current_period_end
        FROM trades t
        JOIN users u ON u.id = t.user_id
        JOIN bot_settings b ON b.user_id = t.user_id
        LEFT JOIN subscriptions s ON s.user_id = t.user_id
        WHERE t.id = ${tradeId}::uuid
          AND t.status IN ('open', 'tp1_hit')
        LIMIT 1
      `
    : await sql`
        SELECT
          t.id::text AS id,
          t.user_id::text AS user_id,
          t.token_symbol,
          t.position_type,
          t.entry_price,
          t.remaining_quantity,
          t.stop_loss,
          t.take_profit_1,
          t.take_profit_2,
          t.opened_at,
          t.live_message_id,
          t.zone,
          t.zone_changed_at,
          t.notified_at,
          t.tp_armed,
          t.tp1_confirmed_at,
          t.sl_alert_count,
          t.sl_alert_at,
          t.last_edit_pnl,
          t.last_edit_at,
          t.passive_refreshed_at,
          t.deferred_zone,
          t.equity_at_open,
          t.pnl_amount,
          t.position_entries,
          t.price_supported,
          u.telegram_id::text AS telegram_id,
          u.language,
          u.first_name,
          u.telegram_first_name,
          u.telegram_blocked_at,
          b.is_active,
          b.paused_at,
          b.timezone,
          b.quiet_hours_enabled,
          b.quiet_hours_start,
          b.quiet_hours_end,
          b.notify_trade_executions,
          b.notify_risk_warnings,
          b.max_daily_trades,
          s.status AS subscription_status,
          s.trial_ends_at,
          s.current_period_end
        FROM trades t
        JOIN users u ON u.id = t.user_id
        JOIN bot_settings b ON b.user_id = t.user_id
        LEFT JOIN subscriptions s ON s.user_id = t.user_id
        WHERE t.status IN ('open', 'tp1_hit')
          AND t.price_supported = true
          AND u.telegram_blocked_at IS NULL
        ORDER BY t.opened_at ASC
        LIMIT ${TRACKED_LIMIT}
      `
  const now = Date.now()
  return rows.flatMap((row) => {
    const trade = mapTrade(row, now)
    return trade ? [trade] : []
  })
}

function tickInput(trade: TrackedTrade, price: PublicPrice, now: number): TickInput {
  return {
    now,
    openedAt: trade.openedAt,
    entry: trade.entry,
    side: trade.side,
    quantity: trade.remaining,
    stopLoss: trade.stopLoss,
    takeProfit1: trade.takeProfit1,
    takeProfit2: trade.takeProfit2,
    equityAtOpen: trade.equityAtOpen,
    lastPrice: price.last,
    highPrice: price.high,
    lowPrice: price.low,
    liveMessageId: trade.liveMessageId,
    storedZone: trade.storedZone,
    zoneChangedAt: trade.zoneChangedAt,
    notifiedAt: trade.notifiedAt,
    tpArmed: trade.tpArmed,
    tp1Confirmed: trade.tp1Confirmed,
    slAlertCount: trade.slAlertCount,
    slAlertAt: trade.slAlertAt,
    lastEditPnl: trade.lastEditPnl,
    lastEditAt: trade.lastEditAt,
    passiveRefreshedAt: trade.passiveRefreshedAt,
    deferredZone: trade.deferredZone,
    paused: trade.paused,
    quiet: trade.quiet,
    tradeNotes: trade.tradeNotes,
    riskNotes: trade.riskNotes,
    priceSupported: trade.priceSupported,
  }
}

function placeholderValues(trade: TrackedTrade, price: number, percent: number, now: number) {
  const usd = pnlUsd(trade.entry, price, trade.remaining, trade.side)
  return {
    coin: trade.symbol,
    entry_price: formatPrice(trade.entry),
    current_price: formatPrice(price),
    pnl_usd: formatUsd(usd),
    pnl_pct: formatPercent(percent),
    duration: formatDuration(now - trade.openedAt, trade.language),
    name: trade.name,
    side: trade.side === "long" ? "LONG" : "SHORT",
    entries: String(trade.entries),
    open_count: "",
    window: "",
    limit: "",
    equity: trade.equityAtOpen == null ? "" : formatUsd(trade.equityAtOpen).replace("+", ""),
  }
}

async function claim(tradeId: string) {
  const sql = database()
  const rows = await sql`
    UPDATE trades
    SET alert_claimed_at = now()
    WHERE id = ${tradeId}::uuid
      AND status IN ('open', 'tp1_hit')
      AND (alert_claimed_at IS NULL OR alert_claimed_at < now() - interval '90 seconds')
    RETURNING id::text AS id
  `
  return rows.length > 0
}

async function release(tradeId: string) {
  const sql = database()
  await sql`
    UPDATE trades
    SET alert_claimed_at = NULL
    WHERE id = ${tradeId}::uuid
  `
}

async function rememberBlock(chatId: string) {
  const sql = database()
  await sql`
    UPDATE users
    SET telegram_blocked_at = now(), updated_at = now()
    WHERE telegram_id = ${chatId}::bigint
  `
}

function blocked(description: string, errorCode: number | null) {
  return errorCode === 403 || /blocked/i.test(description)
}

async function deliver(trade: TrackedTrade, text: string, buttons: TelegramButton[], silent: boolean, previousId: string | null) {
  const sent = await sendMessage(trade.chatId, text, { html: true, silent, buttons, prefix: false })
  if (!sent.ok) {
    if (blocked(sent.description, sent.errorCode)) await rememberBlock(trade.chatId)
    if (sent.retryAfter && sent.retryAfter > 0 && sent.retryAfter <= 3) {
      await new Promise((resolve) => setTimeout(resolve, sent.retryAfter! * 1000))
    }
    return sent
  }
  if (previousId && sent.messageId && previousId !== sent.messageId) await clearButtons(trade.chatId, previousId)
  return sent
}

export async function runZoneCron() {
  const trades = await loadTracked()
  const prices = await publicPrices(trades.map((trade) => trade.symbol))
  const templates = await loadActiveTemplates()
  let sent = 0
  let edited = 0
  let skipped = 0
  for (const trade of trades) {
    const price = prices.get(trade.symbol)
    if (!price) {
      skipped += 1
      continue
    }
    const outcome = await processTrade(trade, price, templates)
    if (outcome === "sent") sent += 1
    else if (outcome === "edited") edited += 1
    else skipped += 1
  }
  return { seen: trades.length, sent, edited, skipped }
}

export async function announceTrade(tradeId: string) {
  const [trade] = await loadTracked(tradeId)
  if (!trade) return { ok: false as const, uncovered: false, sent: false }
  const price = await publicPrice(trade.symbol)
  if (price === "down") return { ok: false as const, uncovered: false, sent: false }
  if (!price) {
    await markUncovered(trade)
    return { ok: true as const, uncovered: true, sent: false }
  }
  const templates = await loadActiveTemplates()
  const outcome = await processTrade(trade, price, templates)
  return { ok: true as const, uncovered: false, sent: outcome === "sent" || outcome === "edited" }
}

async function markUncovered(trade: TrackedTrade) {
  const sql = database()
  await sql`
    UPDATE trades
    SET price_supported = false, updated_at = now()
    WHERE id = ${trade.id}::uuid
  `
  const sent = await sendMessage(trade.chatId, `Tradelyt\n${commandText(trade.language, "uncovered")}`, { prefix: false, silent: false })
  if (sent.ok) {
    await sql`
      INSERT INTO notifications_log (user_id, trade_id, notification_type, message_content, telegram_message_id)
      VALUES (
        ${trade.userId}::uuid,
        ${trade.id}::uuid,
        'system',
        ${commandText(trade.language, "uncovered")},
        ${sent.messageId}
      )
    `
  }
}

async function processTrade(trade: TrackedTrade, price: PublicPrice, templates: readonly TemplateRow[]) {
  if (!(await claim(trade.id))) return "skipped" as const
  try {
    const now = Date.now()
    const plan = planTradeTick(tickInput(trade, price, now))
    const mode = plan.mode
    let outcome: "sent" | "edited" | "none" = "none"
    let messageId: string | null = null
    let templateId: string | null = null
    let body = ""
    const renderZone: Zone = plan.action === "send" && plan.sendZone ? plan.sendZone : plan.zone
    if ((plan.action === "send" || plan.action === "edit") && mode) {
      const values = placeholderValues(trade, price.last, plan.percent, now)
      if (plan.action === "send" && plan.sendZone) {
        const lastVariant = await lastVariantFor(trade.id, plan.sendZone)
        const chosen = chooseBody({ templates, mode, zone: plan.sendZone, language: trade.language, lastVariant })
        if (chosen) {
          templateId = chosen.id
          body = fillTemplate(chosen.body, values)
        }
      } else {
        body = await previousBody(trade.id, renderZone, trade.language)
      }
      const html = renderFrame({
        language: trade.language,
        zone: renderZone,
        mode,
        body,
        coin: trade.symbol,
        side: trade.side,
        entry: trade.entry,
        price: price.last,
        pnlUsd: pnlUsd(trade.entry, price.last, trade.remaining, trade.side),
        pnlPct: plan.percent,
        openedAt: trade.openedAt,
        now,
        name: trade.name,
        passive: plan.passive,
        realizedUsd: trade.realized,
      })
      const buttons = zoneButtons(trade.language, renderZone, trade.id, false)
      if (plan.action === "edit" && trade.liveMessageId) {
        const edited = await editMessage(trade.chatId, trade.liveMessageId, html, { html: true, buttons })
        if (edited.ok) {
          outcome = "edited"
          messageId = trade.liveMessageId
        } else if (blocked(edited.description, edited.errorCode)) {
          await rememberBlock(trade.chatId)
        } else {
          const sent = await deliver(trade, html, buttons, true, null)
          if (sent.ok) {
            outcome = "sent"
            messageId = sent.messageId
          }
        }
      } else if (plan.action === "send") {
        const sent = await deliver(trade, html, buttons, plan.silent, trade.liveMessageId)
        if (sent.ok) {
          outcome = "sent"
          messageId = sent.messageId
        }
      }
    }
    await persist(trade, plan, outcome, messageId)
    if (outcome === "sent" || (outcome === "edited" && plan.passive)) {
      await logDelivery(trade, plan, outcome, messageId, templateId, body)
    }
    return outcome === "none" ? "skipped" : outcome
  } finally {
    await release(trade.id)
  }
}

async function previousBody(tradeId: string, zone: Zone, language: Language) {
  const sql = database()
  const rows = await sql`
    SELECT tpl.body
    FROM notifications_log n
    JOIN telegram_message_templates tpl ON tpl.id = n.template_id
    WHERE n.trade_id = ${tradeId}::uuid
      AND n.zone = ${zone}
      AND tpl.language = ${language}
    ORDER BY n.sent_at DESC
    LIMIT 1
  `
  return text(rows[0]?.body) ?? ""
}

async function persist(
  trade: TrackedTrade,
  plan: ReturnType<typeof planTradeTick>,
  outcome: "sent" | "edited" | "none",
  messageId: string | null,
) {
  const sql = database()
  const sentAlarm = outcome === "sent" && plan.sendZone != null && plan.sendZone !== "neutral"
  const slCount = plan.action === "send" && plan.sendZone === "sl" && outcome !== "sent" ? trade.slAlertCount : plan.slAlertCount
  const armed = plan.disarmTp && sentAlarm ? false : plan.rearmTp ? true : trade.tpArmed
  const deferred = plan.clearDeferred && sentAlarm ? null : plan.setDeferred ?? trade.deferredZone
  const percent = Math.max(-99_999_999, Math.min(99_999_999, plan.percent))
  await sql`
    UPDATE trades
    SET
      mode = ${plan.mode},
      zone = ${plan.waiting ? trade.storedZone : plan.zone},
      zone_changed_at = CASE
        WHEN ${plan.waiting} THEN zone_changed_at
        WHEN zone IS DISTINCT FROM ${plan.zone} THEN now()
        ELSE COALESCE(zone_changed_at, now())
      END,
      tp_armed = ${armed},
      sl_alert_count = ${slCount},
      sl_alert_at = CASE WHEN ${outcome === "sent" && plan.sendZone === "sl"} THEN now() ELSE sl_alert_at END,
      notified_at = CASE WHEN ${sentAlarm && plan.sendZone !== "sl"} THEN now() ELSE notified_at END,
      deferred_zone = ${deferred},
      live_message_id = COALESCE(${messageId}, live_message_id),
      last_edit_pnl = CASE WHEN ${outcome !== "none"} THEN ${percent.toFixed(2)}::numeric ELSE last_edit_pnl END,
      last_edit_at = CASE WHEN ${outcome !== "none"} THEN now() ELSE last_edit_at END,
      passive_refreshed_at = CASE WHEN ${outcome !== "none" && plan.passive} THEN now() ELSE passive_refreshed_at END,
      pnl_percentage = CASE WHEN ${plan.waiting} THEN pnl_percentage ELSE ${percent.toFixed(2)}::numeric END,
      price_supported = true,
      updated_at = now()
    WHERE id = ${trade.id}::uuid
      AND status IN ('open', 'tp1_hit')
  `
}

async function logDelivery(
  trade: TrackedTrade,
  plan: ReturnType<typeof planTradeTick>,
  outcome: "sent" | "edited",
  messageId: string | null,
  templateId: string | null,
  body: string,
) {
  const sql = database()
  const zone = outcome === "sent" && plan.sendZone ? plan.sendZone : plan.zone
  const type = outcome === "edited" ? "silent_refresh" : `zone_${zone}`
  await sql`
    INSERT INTO notifications_log (
      user_id,
      trade_id,
      notification_type,
      message_content,
      template_id,
      zone,
      mode,
      telegram_message_id
    )
    VALUES (
      ${trade.userId}::uuid,
      ${trade.id}::uuid,
      ${type},
      ${body || zone},
      ${templateId}::uuid,
      ${zone},
      ${plan.mode},
      ${messageId}
    )
  `
}

export async function repaintTrade(tradeId: string, note: string, buttons: "ask" | "none") {
  const [trade] = await loadTracked(tradeId)
  if (!trade?.liveMessageId) return
  const price = await publicPrice(trade.symbol)
  if (!price || price === "down") return
  const now = Date.now()
  const plan = planTradeTick(tickInput(trade, price, now))
  const mode = asMode(plan.mode) ?? "classic"
  const html = renderFrame({
    language: trade.language,
    zone: plan.zone,
    mode,
    body: await previousBody(trade.id, plan.zone, trade.language),
    coin: trade.symbol,
    side: trade.side,
    entry: trade.entry,
    price: price.last,
    pnlUsd: pnlUsd(trade.entry, price.last, trade.remaining, trade.side),
    pnlPct: plan.percent,
    openedAt: trade.openedAt,
    now,
    name: trade.name,
    passive: false,
    realizedUsd: trade.realized,
    note,
  })
  const keyboard = buttons === "ask" ? zoneButtons(trade.language, "tp1", trade.id, true) : []
  await editMessage(trade.chatId, trade.liveMessageId, html, { html: true, buttons: keyboard })
}

export async function notifySpecial(tradeId: string) {
  const [trade] = await loadTracked(tradeId)
  if (!trade || trade.paused || !trade.riskNotes) return
  if (!(await subscriptionAllowsMessages(trade.userId))) return
  const limits = windowLimits(trade.maxDailyTrades)
  const sql = database()
  const counts = await sql`
    SELECT
      count(*) FILTER (WHERE opened_at > now() - interval '6 hours') AS h6,
      count(*) FILTER (WHERE opened_at > now() - interval '12 hours') AS h12,
      count(*) FILTER (WHERE opened_at > now() - interval '24 hours') AS h24
    FROM trades
    WHERE user_id = ${trade.userId}::uuid
      AND status <> 'cancelled'
  `
  const h6 = Number(counts[0]?.h6) || 0
  const h12 = Number(counts[0]?.h12) || 0
  const h24 = Number(counts[0]?.h24) || 0
  let window = ""
  let count = 0
  let limit = 0
  if (limits && breachedWindow(h6, limits.h6)) {
    window = "6h"
    count = h6
    limit = limits.h6
  } else if (limits && breachedWindow(h12, limits.h12)) {
    window = "12h"
    count = h12
    limit = limits.h12
  } else if (limits && breachedWindow(h24, limits.h24)) {
    window = "24h"
    count = h24
    limit = limits.h24
  }
  const keys: string[] = []
  if (trade.entries >= 3) keys.push(`scale:${trade.id}:${trade.entries}`)
  if (window) keys.push(`window:${window}:${trade.id}`)
  if (keys.length === 0) return
  const inserted: string[] = []
  for (const key of keys) {
    const rows = await sql`
      INSERT INTO notifications_log (user_id, trade_id, notification_type, message_content, zone, event_key)
      VALUES (
        ${trade.userId}::uuid,
        ${trade.id}::uuid,
        'special_positions',
        ${key},
        'special_positions',
        ${key}
      )
      ON CONFLICT (event_key) DO NOTHING
      RETURNING id::text AS id
    `
    const id = text(rows[0]?.id)
    if (id) inserted.push(id)
  }
  if (inserted.length === 0) return
  const templates = await loadActiveTemplates()
  const lastVariant = await lastVariantFor(trade.id, "special_positions")
  const chosen = chooseBody({ templates, mode: null, zone: "special_positions", language: trade.language, lastVariant })
  const values = {
    ...placeholderValues(trade, trade.entry, 0, Date.now()),
    open_count: String(count),
    window,
    limit: String(limit),
    entries: String(trade.entries),
  }
  const body = chosen ? fillTemplate(chosen.body, values) : ""
  const html = specialFrame({
    language: trade.language,
    body,
    name: trade.name,
    coin: trade.symbol,
    entries: trade.entries,
    window,
    count,
    limit,
    equity: trade.equityAtOpen == null ? "" : formatUsd(trade.equityAtOpen).replace("+", ""),
  })
  const sent = await sendMessage(trade.chatId, html, {
    html: true,
    silent: false,
    prefix: false,
    buttons: [{ text: trade.language === "sr" ? "Razumem" : "Got it", data: `ack:${trade.id}` }],
  })
  if (!sent.ok) {
    for (const id of inserted) {
      await sql`DELETE FROM notifications_log WHERE id = ${id}::uuid`
    }
    if (blocked(sent.description, sent.errorCode)) await rememberBlock(trade.chatId)
    return
  }
  for (const id of inserted) {
    await sql`
      UPDATE notifications_log
      SET
        message_content = ${body || "special_positions"},
        template_id = ${chosen?.id ?? null}::uuid,
        telegram_message_id = ${sent.messageId}
      WHERE id = ${id}::uuid
    `
  }
}

