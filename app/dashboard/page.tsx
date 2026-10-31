import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import Link from "next/link"
import { redirect } from "next/navigation"

import { ProfileMenu } from "@/components/account/profile-menu"
import { ui } from "@/components/checkout/copy"
import { loadSessionProfile } from "@/lib/profile"
import { readUserIdFromCookies } from "@/lib/session-store"
import { getDashboardAccess } from "@/lib/subscriptions"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Dashboard · Tradelyt",
  description: "Your Tradelyt bot is on.",
}

function formatWhen(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))
}

export default async function DashboardPage() {
  const userId = await readUserIdFromCookies()
  if (!userId) redirect("/onboarding")

  const access = await getDashboardAccess(userId)
  if (!access) redirect("/checkout")
  const profile = await loadSessionProfile()

  const trialing = access.status === "trialing"
  const banner = trialing
    ? ui.trialBanner.replace("{date}", formatWhen(access.trialEndsAt))
    : ui.activeBanner.replace("{date}", formatWhen(access.currentPeriodEnd))
  const statusLabel = trialing ? "Free trial" : "Active"
  const whenLabel = trialing ? "Trial ends" : "Renews"
  const whenValue = formatWhen(trialing ? access.trialEndsAt : access.currentPeriodEnd)

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
        <header className="flex items-center justify-end">
          {profile ? <ProfileMenu profile={profile} /> : null}
        </header>
        <section className="m-auto w-full max-w-lg rounded-3xl border border-emerald-400/35 bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_20px_60px_rgba(0,0,0,0.45),0_0_40px_rgba(16,185,129,0.12)] backdrop-blur-xl sm:p-8">
          <p className="text-xs font-medium tracking-wide text-emerald-300">{banner}</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">{ui.dashboardTitle}</h1>
          <p className="mt-1.5 text-sm leading-snug text-slate-400">{ui.dashboardBody}</p>

          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <dt className="text-[11px] font-medium tracking-[0.16em] text-slate-500 uppercase">Status</dt>
              <dd className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                {statusLabel}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <dt className="text-[11px] font-medium tracking-[0.16em] text-slate-500 uppercase">{whenLabel}</dt>
              <dd className="mt-1 text-sm font-semibold text-white">{whenValue}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2">
              <dt className="text-[11px] font-medium tracking-[0.16em] text-slate-500 uppercase">Plan</dt>
              <dd className="mt-1 text-sm font-semibold text-white">Tradelyt Pro · $49/mo</dd>
            </div>
          </dl>

          <Link
            href="/"
            className={`${jakarta.className} mt-6 inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold tracking-tight text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-[0_0_32px_rgba(16,185,129,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`}
          >
            Back to site
          </Link>
        </section>
      </div>
    </main>
  )
}
