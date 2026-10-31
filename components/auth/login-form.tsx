"use client"

import Link from "next/link"
import { useActionState } from "react"

import { login } from "@/app/login/actions"

export function LoginForm() {
  const [state, action, pending] = useActionState(login, null)

  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block">
        <span className="text-[11px] font-medium tracking-[0.16em] text-slate-500 uppercase">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
        />
      </label>
      <label className="block">
        <span className="text-[11px] font-medium tracking-[0.16em] text-slate-500 uppercase">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400"
        />
      </label>
      {state?.error ? <p className="text-[11px] leading-tight text-rose-300">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.28)] transition-colors duration-200 hover:bg-emerald-400 disabled:opacity-70"
      >
        {pending ? "Signing in" : "Sign in"}
      </button>
      <p className="text-center text-[11px] leading-tight text-slate-500">
        New to Tradelyt?{" "}
        <Link href="/onboarding" className="font-medium text-emerald-300 hover:text-emerald-200">
          Create an account
        </Link>
      </p>
    </form>
  )
}
