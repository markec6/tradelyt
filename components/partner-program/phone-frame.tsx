import type { ReactNode } from "react"

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-[280px] max-w-full">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-3xl"
      />
      <div className="relative z-10 overflow-hidden rounded-[40px] border-8 border-slate-800 bg-slate-950 shadow-2xl">
        <div className="absolute left-1/2 top-2 z-30 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-800" />
        <div className="relative h-[520px] overflow-hidden bg-slate-950 lg:h-[460px]">{children}</div>
      </div>
    </div>
  )
}
