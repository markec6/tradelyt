"use client"

import { ASK_SIZES, BID_SIZES, formatPrice } from "./data"

export function OrderBook({
  mid,
  decimals,
  tick,
}: {
  mid: number
  decimals: number
  tick: number
}) {
  const maxSize = Math.max(...BID_SIZES, ...ASK_SIZES)
  const asks = ASK_SIZES.map((size, index) => ({
    price: mid + tick * (ASK_SIZES.length - index),
    size,
  }))
  const bids = BID_SIZES.map((size, index) => ({
    price: mid - tick * (index + 1),
    size,
  }))
  const bestAsk = mid + tick
  const bestBid = mid - tick
  const spread = bestAsk - bestBid

  return (
    <div className="flex h-full flex-col justify-between gap-0 overflow-hidden rounded-xl bg-slate-950/40 px-2 py-1 sm:px-3">
      <div className="mb-0.5 flex items-center justify-between px-1 text-[10px] uppercase tracking-wide text-slate-500">
        <span>Price</span>
        <span>Size</span>
      </div>
      {asks.map((level) => (
        <BookRow
          key={`ask-${level.price}`}
          price={formatPrice(level.price, decimals)}
          size={level.size.toFixed(2)}
          width={(level.size / maxSize) * 100}
          tone="ask"
        />
      ))}
      <div className="my-0.5 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-[10px]">
        <span className="text-slate-400">Spread</span>
        <span className="font-semibold tabular-nums text-slate-200">{formatPrice(spread, decimals)}</span>
      </div>
      {bids.map((level) => (
        <BookRow
          key={`bid-${level.price}`}
          price={formatPrice(level.price, decimals)}
          size={level.size.toFixed(2)}
          width={(level.size / maxSize) * 100}
          tone="bid"
        />
      ))}
    </div>
  )
}

function BookRow({
  price,
  size,
  width,
  tone,
}: {
  price: string
  size: string
  width: number
  tone: "bid" | "ask"
}) {
  const bar = tone === "bid" ? "bg-emerald-500/25" : "bg-rose-500/25"
  const priceColor = tone === "bid" ? "text-emerald-300" : "text-rose-300"

  return (
    <div className="relative flex items-center justify-between px-1 py-0 text-[10px]">
      <div className={`absolute inset-y-0 right-0 rounded-sm ${bar}`} style={{ width: `${width}%` }} />
      <span className={`relative z-10 tabular-nums ${priceColor}`}>{price}</span>
      <span className="relative z-10 tabular-nums text-slate-400">{size}</span>
    </div>
  )
}
