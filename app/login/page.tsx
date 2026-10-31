import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { readUserIdFromCookies } from "@/lib/session-store"
import { cardConfirmed, getBillingAccount } from "@/lib/subscriptions"

export const metadata: Metadata = {
  title: "Sign in · Tradelyt",
  description: "Sign in to Tradelyt.",
}

export default async function LoginPage() {
  const userId = await readUserIdFromCookies()
  if (userId) {
    const account = await getBillingAccount(userId)
    if (account && (await cardConfirmed(account))) redirect("/dashboard")
    redirect("/checkout")
  }

  return (
    <main className="relative min-h-dvh bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="relative flex min-h-dvh flex-col px-3 py-4 sm:px-4">
        <section className="m-auto w-full max-w-lg rounded-3xl border border-emerald-400/35 bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_20px_60px_rgba(0,0,0,0.45),0_0_40px_rgba(16,185,129,0.12)] backdrop-blur-xl sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Sign in</h1>
          <p className="mt-1.5 text-sm leading-snug text-slate-400">Use the email and password from onboarding.</p>
          <LoginForm />
        </section>
      </div>
    </main>
  )
}
