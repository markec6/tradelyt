import { eq } from "drizzle-orm"
import { neon } from "@neondatabase/serverless"

import { getDb } from "@/db"
import { users } from "@/db/schema"
import { readActorUserId, readPendingSignupId } from "@/lib/session-store"
import { openProfilePhoto } from "@/lib/telegram"

export async function GET() {
  const userId = await readActorUserId()
  const pendingId = userId ? null : await readPendingSignupId()
  if (!userId && !pendingId) return new Response(null, { status: 404 })

  let fileId: string | null = null
  if (pendingId) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) return new Response(null, { status: 404 })
    const rows = await neon(databaseUrl)`
      SELECT telegram_photo_file_id
      FROM pending_signups
      WHERE id = ${pendingId}::uuid
        AND expires_at > now()
      LIMIT 1
    `
    fileId = typeof rows[0]?.telegram_photo_file_id === "string" ? rows[0].telegram_photo_file_id : null
  } else if (userId) {
    const rows = await getDb()
      .select({ fileId: users.telegramPhotoFileId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    fileId = rows[0]?.fileId ?? null
  }
  if (!fileId) return new Response(null, { status: 404 })

  const photo = await openProfilePhoto(fileId)
  if (!photo) return new Response(null, { status: 404 })

  return new Response(photo.bytes, {
    headers: {
      "content-type": photo.contentType,
      "cache-control": "private, max-age=3600",
    },
  })
}
