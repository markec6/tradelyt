import { Coins, ShieldCheck, Zap } from "lucide-react"
import { VALUE_PROPS } from "./data"

const ICONS = [Coins, ShieldCheck, Zap] as const

export function PartnerValueProps() {
  return (
    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
      {VALUE_PROPS.map((item, index) => {
        const Icon = ICONS[index]
        return (
          <li key={item.title} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 md:p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.22)]">
              <Icon className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            </div>
            <h3 className="mb-1 mt-2 text-xs font-bold text-white">{item.title}</h3>
            <p className="text-[11px] leading-snug text-slate-400">{item.body}</p>
          </li>
        )
      })}
    </ul>
  )
}
