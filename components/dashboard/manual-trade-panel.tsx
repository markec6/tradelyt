"use client"

import { useActionState } from "react"

import { closeTradeAction, openTradeAction, type TradeActionState } from "@/app/dashboard/actions"
import type { OpenTradeView } from "@/lib/manual-trade"

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"

export function ManualTradePanel({ trades }: { trades: OpenTradeView[] }) {
  const [state, action, pending] = useActionState(openTradeAction, null as TradeActionState)
  return (
    <div className="mt-4 w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-8">
      <h2 className="text-lg font-semibold tracking-tight text-white">Open a trade</h2>
      <p className="mt-1 text-sm leading-snug text-slate-400">
        The mode is chosen from the target, or from the stop when there is no target. Size is required.
      </p>
      <form action={action} className="mt-5 grid gap-3">
        <label className="grid gap-1 text-xs text-slate-400">
          Symbol
          <input name="symbol" required placeholder="BTC" className={field} autoComplete="off" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-xs text-slate-400">
            Side
            <select name="side" className={field} defaultValue="long">
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-slate-400">
            Entry
            <input name="entry" required inputMode="decimal" placeholder="64200" className={field} />
          </label>
        </div>
        <label className="grid gap-1 text-xs text-slate-400">
          Size
          <input name="quantity" required inputMode="decimal" placeholder="0.01" className={field} />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="grid gap-1 text-xs text-slate-400">
            Stop
            <input name="stopLoss" inputMode="decimal" placeholder="Optional" className={field} />
          </label>
          <label className="grid gap-1 text-xs text-slate-400">
            TP1
            <input name="takeProfit1" inputMode="decimal" placeholder="Optional" className={field} />
          </label>
          <label className="grid gap-1 text-xs text-slate-400">
            TP2
            <input name="takeProfit2" inputMode="decimal" placeholder="Optional" className={field} />
          </label>
        </div>
        {state && "error" in state ? <p className="text-sm text-rose-300">{state.error}</p> : null}
        {state && "ok" in state ? <p className="text-sm text-emerald-300">Trade saved. Zone messages follow on Telegram.</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {pending ? "Saving" : "Start tracking"}
        </button>
      </form>
      {trades.length > 0 ? (
        <ul className="mt-6 grid gap-2">
          {trades.map((trade) => (
            <li key={trade.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {trade.symbol} · {trade.side.toUpperCase()}
                </p>
                <p className="text-xs text-slate-400">
                  {trade.mode ?? "mode pending"} · {trade.pnlPercent.toFixed(2)}%
                </p>
              </div>
              <form action={closeTradeAction}>
                <input type="hidden" name="tradeId" value={trade.id} />
                <button type="submit" className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-200">
                  Close tracking
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
