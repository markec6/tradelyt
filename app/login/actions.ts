"use server"

import { redirect } from "next/navigation"

import { loginWithPassword } from "@/lib/auth"

export async function login(_state: { error: string } | null, formData: FormData) {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const result = await loginWithPassword(email, password)
  if (!result.ok) return { error: result.error }
  redirect(result.destination)
}
