import { createHash, randomBytes } from "node:crypto"

import { neon } from "@neondatabase/serverless"

const TOKEN_TTL_MS = 30 * 60 * 1000
const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function database() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error("DATABASE_URL is not set")
  return neon(databaseUrl)
}

export function hashLinkToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export type LinkStatus = "invalid" | "already_other" | "taken" | "refresh" | "link"

function postgresCode(error: unknown) {
  const seen = new Set<unknown>()
  let current: unknown = error
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current)
    if ("code" in current && typeof current.code === "string") return current.code
    current = "cause" in current ? current.cause : undefined
  }
  return ""
}

export async function consumeLinkToken(input: {
  tokenHash: string
  telegramId: string
}): Promise<{ status: LinkStatus; userId: string | null }> {
  const sql = database()
  try {
    const rows = await sql`
      WITH found AS (
        SELECT
          lt.id AS token_id,
          lt.user_id,
          lt.used_at,
          lt.expires_at,
          u.telegram_id::text AS telegram_id
        FROM link_tokens lt
        JOIN users u ON u.id = lt.user_id
        WHERE lt.token_hash = ${input.tokenHash}
        FOR UPDATE OF lt, u
      ),
      decision AS (
        SELECT
          token_id,
          user_id,
          CASE
            WHEN used_at IS NOT NULL OR expires_at <= now() THEN 'invalid'
            WHEN telegram_id IS NOT NULL AND telegram_id <> ${input.telegramId} THEN 'already_other'
            WHEN EXISTS (
              SELECT 1
              FROM users other_user
              WHERE other_user.telegram_id = ${input.telegramId}::bigint
                AND other_user.id <> found.user_id
            ) THEN 'taken'
            WHEN telegram_id IS NOT NULL AND telegram_id = ${input.telegramId} THEN 'refresh'
            ELSE 'link'
          END AS status
        FROM found
      ),
      burned AS (
        UPDATE link_tokens
        SET used_at = now()
        WHERE id IN (
          SELECT token_id
          FROM decision
          WHERE status IN ('already_other', 'taken', 'refresh', 'link')
        )
        RETURNING id
      ),
      profile AS (
        UPDATE users
        SET
          telegram_id = ${input.telegramId}::bigint,
          updated_at = now()
        FROM decision
        WHERE users.id = decision.user_id
          AND decision.status IN ('link', 'refresh')
        RETURNING users.id
      )
      SELECT
        decision.status,
        decision.user_id::text AS user_id,
        (SELECT count(*) FROM burned) AS burned_count,
        (SELECT count(*) FROM profile) AS profile_count
      FROM decision
    `
    const status = rows[0]?.status
    const userId = typeof rows[0]?.user_id === "string" ? rows[0].user_id : null
    if (
      status === "invalid" ||
      status === "already_other" ||
      status === "taken" ||
      status === "refresh" ||
      status === "link"
    ) {
      return { status, userId }
    }
    return { status: "invalid", userId: null }
  } catch (error) {
    if (postgresCode(error) !== "23505") throw error
    await sql`
      UPDATE link_tokens
      SET used_at = now()
      WHERE token_hash = ${input.tokenHash}
        AND used_at IS NULL
        AND expires_at > now()
    `
    return { status: "taken", userId: null }
  }
}

export async function issueLinkToken(userId: string) {
  if (!USER_ID.test(userId)) throw new Error("Invalid user id")
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
  const sql = database()
  await sql.transaction([
    sql`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`,
    sql`DELETE FROM link_tokens WHERE user_id = ${userId}::uuid AND used_at IS NULL`,
    sql`
      INSERT INTO link_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}::uuid, ${hashLinkToken(token)}, ${expiresAt}::timestamptz)
    `,
  ])
  return { token, expiresAt }
}
