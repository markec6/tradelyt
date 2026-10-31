import { and, eq, inArray, isNotNull, sql } from "drizzle-orm"

import { clearTelegramAvatar } from "@/lib/avatar"
import { getDb } from "@/db"
import { users } from "@/db/schema"
import { checkPassword, hashPassword } from "@/lib/password"
import {
  clearAuthCookies,
  clearOnboardingCookie,
  clearSessionCookie,
  readOnboardingUserId,
  readUserIdFromCookies,
  setOnboardingCookie,
  setSessionCookie,
} from "@/lib/session-store"
import { cardConfirmed, enableBot, getBillingAccount, upsertSubscriptionFromStripe } from "@/lib/subscriptions"
import { cardIsSaved, getStripe } from "@/lib/stripe"

export const GENERIC_LOGIN_ERROR = "Email or password is incorrect."

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<{ ok: true; destination: "/dashboard" | "/checkout" | "/onboarding" } | { ok: false; error: string }> {
  const normalized = email.trim()
  const found = await getDb()
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
      accountStatus: users.accountStatus,
      sessionVersion: users.sessionVersion,
    })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1)
  const user = found[0] ?? null
  const checked = await checkPassword(password, user?.passwordHash ?? null)
  if (!user || !checked.ok || user.accountStatus === "suspended" || user.accountStatus === "deleted") {
    return { ok: false, error: GENERIC_LOGIN_ERROR }
  }
  if (checked.rehash) {
    await getDb()
      .update(users)
      .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
      .where(eq(users.id, user.id))
  }

  if (user.accountStatus === "pending") {
    await clearSessionCookie()
    await setOnboardingCookie(user.id, user.sessionVersion)
    const account = await getBillingAccount(user.id)
    return { ok: true, destination: account?.subscription ? "/checkout" : "/onboarding" }
  }

  const account = await getBillingAccount(user.id)
  const status = account?.subscription?.status
  if (status === "trialing" || status === "active") {
    await setSessionCookie(user.id, user.sessionVersion)
    await clearOnboardingCookie()
    if (account && (await cardConfirmed(account))) return { ok: true, destination: "/dashboard" }
    return { ok: true, destination: "/checkout" }
  }

  await clearSessionCookie()
  await setOnboardingCookie(user.id, user.sessionVersion)
  return { ok: true, destination: "/checkout" }
}

export async function issueDurableSession(): Promise<
  { ok: true } | { ok: false; error: string; code?: "not_ready" | "card_required" }
> {
  const userId = (await readUserIdFromCookies()) ?? (await readOnboardingUserId())
  if (!userId) return { ok: false, error: "Save your account before starting the trial." }

  const account = await getBillingAccount(userId)
  if (!account?.subscription) return { ok: false, error: "Start your trial before opening the dashboard." }

  let status = account.subscription.status
  let cardSaved = false
  try {
    const subscription = await getStripe().subscriptions.retrieve(account.subscription.stripeSubscriptionId, {
      expand: ["pending_setup_intent"],
    })
    const saved = await upsertSubscriptionFromStripe(userId, subscription)
    status = saved.status
    cardSaved = cardIsSaved(subscription)
  } catch {
    cardSaved = status === "active"
  }

  if (!cardSaved) {
    return { ok: false, error: "Confirm your card before opening the dashboard.", code: "card_required" }
  }
  if (status !== "trialing" && status !== "active") {
    return {
      ok: false,
      error: "Your trial is still confirming. Try again in a moment.",
      code: "not_ready",
    }
  }

  const promoted = await getDb()
    .update(users)
    .set({ accountStatus: "active", updatedAt: new Date() })
    .where(
      and(
        eq(users.id, userId),
        inArray(users.accountStatus, ["pending", "active"]),
        isNotNull(users.phoneNumber),
        isNotNull(users.telegramUsername),
      ),
    )
    .returning({ sessionVersion: users.sessionVersion, accountStatus: users.accountStatus })

  const row = promoted[0]
  if (!row || row.accountStatus !== "active") {
    return { ok: false, error: "Finish your profile before opening the dashboard." }
  }

  await enableBot(userId)
  await setSessionCookie(userId, row.sessionVersion)
  await clearOnboardingCookie()
  return { ok: true }
}

export async function logout() {
  const userId = (await readUserIdFromCookies()) ?? (await readOnboardingUserId())
  if (userId) {
    await getDb()
      .update(users)
      .set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
      .where(eq(users.id, userId))
  }
  await clearAuthCookies()
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string) {
  const found = await getDb()
    .select({
      passwordHash: users.passwordHash,
      sessionVersion: users.sessionVersion,
      accountStatus: users.accountStatus,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const user = found[0]
  const checked = await checkPassword(currentPassword, user?.passwordHash ?? null)
  if (!user || !checked.ok) return { ok: false as const, error: GENERIC_LOGIN_ERROR }

  const nextVersion = user.sessionVersion + 1
  await getDb()
    .update(users)
    .set({
      passwordHash: await hashPassword(nextPassword),
      sessionVersion: nextVersion,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  if (user.accountStatus === "active") await setSessionCookie(userId, nextVersion)
  else await setOnboardingCookie(userId, nextVersion)
  return { ok: true as const }
}

export async function suspendAccount(userId: string) {
  await getDb()
    .update(users)
    .set({
      accountStatus: "suspended",
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}

export async function deleteAccount(userId: string) {
  await clearTelegramAvatar(userId)
  await getDb()
    .update(users)
    .set({
      accountStatus: "deleted",
      telegramAvatarUrl: null,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}

