import { eq } from "drizzle-orm"

import { getDb } from "@/db"
import { users } from "@/db/schema"
import { readActorUserId } from "@/lib/session-store"
import { openProfilePhoto } from "@/lib/telegram"

export async function GET() {
  const userId = await readActorUserId()
  if (!userId) return new Response(null, { status: 404 })

  const rows = await getDb()
    .select({ fileId: users.telegramPhotoFileId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const fileId = rows[0]?.fileId
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
