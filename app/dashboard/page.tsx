import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard · Tradelyt",
  description: "Your Tradelyt bot is on.",
}

export default function DashboardPage() {
  return (
    <main className="relative min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="pointer-events-none fixed top-0 left-1/3 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none fixed top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-cyan-500/10 blur-[100px]" />

      <div className="relative flex min-h-dvh flex-col px-3 py-4 sm:px-4">
        <section className="m-auto w-full max-w-lg rounded-3xl border border-emerald-400/35 bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_20px_60px_rgba(0,0,0,0.45),0_0_40px_rgba(16,185,129,0.12)] backdrop-blur-xl sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Your bot is on</h1>
          <p className="mt-1.5 text-sm leading-snug text-slate-400">
            Trades and Telegram alerts will show up here.
          </p>
        </section>
      </div>
    </main>
  )
}
