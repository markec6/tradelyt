import { ShieldAlert, CheckCircle2, Timer } from "lucide-react"

type CardVariant = "compact" | "float"

function cardShell(variant: CardVariant, extra: string) {
  const compact = "w-full rounded-xl sm:rounded-2xl p-3"
  const floating = "w-[274px] rounded-2xl p-3 z-20"
  return `${variant === "float" ? floating : compact} ${extra}`
}

function OvertradingCard({ variant }: { variant: CardVariant }) {
  return (
    <div
      className={cardShell(
        variant,
        "bg-slate-900/90 backdrop-blur-md border border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <h4 className="min-w-0 text-[11px] sm:text-xs font-bold tracking-wide text-red-400 leading-tight">
            OVERTRADING BLOCKED
          </h4>
        </div>
        <span className="ml-auto bg-red-500/20 text-red-300 text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 whitespace-nowrap flex-shrink-0">
          [LOCKED 🔒]
        </span>
      </div>

      <div className="mb-3">
        <p className="text-[10px] text-slate-400 mb-1.5">Daily Limit: 3/2 Trades Exceeded</p>
        <div className="grid grid-cols-3 gap-1">
          <div className="h-1.5 rounded-full bg-red-500/80" />
          <div className="h-1.5 rounded-full bg-red-500/80" />
          <div className="relative h-1.5 rounded-full bg-red-950 border border-red-500/60 overflow-hidden">
            <span className="absolute left-1/2 top-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] bg-orange-400" />
          </div>
        </div>
        <p className="text-[10px] text-red-300 mt-1.5">2/2 used · 3rd blocked</p>
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed">
        Attempted 3rd emotional entry automatically blocked. System protected $1,200 of your capital.
      </p>
    </div>
  )
}

function Tp1Card({ variant }: { variant: CardVariant }) {
  return (
    <div
      className={cardShell(
        variant,
        "bg-slate-900/90 backdrop-blur-md border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <h4 className="min-w-0 text-[11px] sm:text-xs font-bold tracking-wide text-emerald-400 leading-tight">
            PROFIT LOCKED IN
          </h4>
        </div>
        <span className="ml-auto bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 whitespace-nowrap flex-shrink-0">
          [RISK-FREE 🛡️]
        </span>
      </div>

      <div className="mb-3">
        <p className="text-[10px] text-emerald-300 mb-1.5">TP1 Hit (+14.2%)</p>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className="relative w-[62%] h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 overflow-hidden">
            <span className="animate-progress-shine pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
          <p className="text-[10px] text-slate-400">Stop-Loss moved to Entry (Break-Even)</p>
        </div>
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed">
        30% position automatically closed at TP1. Remaining position secured risk-free.
      </p>
    </div>
  )
}

function SidewaysCard({ variant }: { variant: CardVariant }) {
  return (
    <div
      className={cardShell(
        variant,
        "bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
      )}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <Timer className="w-4 h-4 text-cyan-400" />
          </div>
          <h4 className="min-w-0 text-[11px] sm:text-xs font-bold tracking-wide text-cyan-400 leading-tight">
            EMOTIONAL SHIELD
          </h4>
        </div>
        <span className="ml-auto bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full border border-cyan-500/30 whitespace-nowrap flex-shrink-0">
          [COOL-DOWN ACTIVE ⏱️]
        </span>
      </div>

      <div className="mb-3">
        <p className="text-[10px] text-slate-400 mb-1">2-Hour Sideways Market Filter Active</p>
        <p className="font-mono text-sm text-cyan-300 tabular-nums mb-1.5">01:24:08</p>
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className="w-[62%] h-full rounded-full bg-cyan-400/80" />
        </div>
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed">
        Market is moving sideways without volume. Bot suggests screen break to prevent revenge trading.
      </p>
    </div>
  )
}

export { OvertradingCard, Tp1Card, SidewaysCard }
