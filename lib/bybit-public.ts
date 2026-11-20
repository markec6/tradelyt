export type PublicPrice = {
  last: number
  high: number
  low: number
}

type Kline = { last: number; high: number; low: number }

function asRecord(value: unknown) {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}

function num(value: unknown) {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function readJson(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return "down" as const
    const body = asRecord(await response.json().catch(() => null))
    return body ?? ("down" as const)
  } catch {
    return "down" as const
  }
}

async function kline(category: "linear" | "spot", symbol: string): Promise<Kline | null | "down"> {
  const body = await readJson(
    `https://api.bybit.com/v5/market/kline?category=${category}&symbol=${encodeURIComponent(symbol)}&interval=1&limit=1`,
  )
  if (body === "down") return "down"
  if (body.retCode !== 0) return "down"
  const list = asRecord(body.result)?.list
  const row = Array.isArray(list) ? list[0] : null
  if (!Array.isArray(row)) return null
  const high = num(row[2])
  const low = num(row[3])
  const last = num(row[4])
  if (high == null || low == null || last == null) return null
  return { last, high, low }
}

export async function publicPrice(symbol: string): Promise<PublicPrice | null | "down"> {
  const linear = await kline("linear", symbol)
  if (linear && linear !== "down") return linear
  const spot = await kline("spot", symbol)
  if (spot && spot !== "down") return spot
  if (linear === "down" && spot === "down") return "down"
  return null
}

export async function publicPrices(symbols: readonly string[]) {
  const unique = [...new Set(symbols)]
  const prices = new Map<string, PublicPrice>()
  const queue = [...unique]
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length > 0) {
      const symbol = queue.shift()
      if (!symbol) return
      const price = await publicPrice(symbol)
      if (price && price !== "down") prices.set(symbol, price)
    }
  })
  await Promise.all(workers)
  return prices
}
