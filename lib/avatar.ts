import { eq } from "drizzle-orm"

import { getDb } from "@/db"
import { users } from "@/db/schema"

export const DEFAULT_AVATAR_SRC = "/avatars/default.svg"
export const MAX_AVATAR_BYTES = 1_048_576
export const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export function avatarSrc(url: string | null) {
  if (!url) return DEFAULT_AVATAR_SRC
  return url
}

export function validateAvatarPayload(input: { byteLength: number; mimeType: string }) {
  if (!Number.isInteger(input.byteLength) || input.byteLength <= 0 || input.byteLength > MAX_AVATAR_BYTES) {
    return "Use an image up to 1 MB."
  }
  if (!(ALLOWED_AVATAR_TYPES as readonly string[]).includes(input.mimeType)) {
    return "Use a JPEG, PNG, or WebP image."
  }
  return null
}

export async function getTelegramAvatarUrl(userId: string) {
  const rows = await getDb()
    .select({ telegramAvatarUrl: users.telegramAvatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return rows[0]?.telegramAvatarUrl ?? null
}

export async function saveTelegramAvatarUrl(
  userId: string,
  url: string,
  file: { byteLength: number; mimeType: string },
) {
  const error = validateAvatarPayload(file)
  if (error) return { ok: false as const, error }
  await getDb()
    .update(users)
    .set({ telegramAvatarUrl: url, updatedAt: new Date() })
    .where(eq(users.id, userId))
  return { ok: true as const }
}

export async function clearTelegramAvatar(userId: string) {
  await getDb()
    .update(users)
    .set({ telegramAvatarUrl: null, updatedAt: new Date() })
    .where(eq(users.id, userId))
}
