import { eq } from "drizzle-orm"

import { getDb } from "@/db"
import { users } from "@/db/schema"
import { readUserIdFromCookies } from "@/lib/session-store"

export type SessionProfile = {
  username: string | null
  avatarUrl: string | null
}

export async function loadSessionProfile(): Promise<SessionProfile | null> {
  const userId = await readUserIdFromCookies()
  if (!userId) return null
  const rows = await getDb()
    .select({
      telegramUsername: users.telegramUsername,
      telegramAvatarUrl: users.telegramAvatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  const username = row.telegramUsername?.replace(/^@+/, "") || null
  return { username, avatarUrl: row.telegramAvatarUrl }
}
