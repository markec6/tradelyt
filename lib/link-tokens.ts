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
export type LinkOwner = "user" | "pending"

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
  username: string | null
}): Promise<{ status: LinkStatus; userId: string | null; owner: LinkOwner | null; wrote: boolean }> {
  const sql = database()
  try {
    const rows = await sql`
      WITH found AS (
        SELECT
          lt.id AS token_id,
          lt.user_id,
          lt.pending_signup_id,
          lt.used_at,
          lt.expires_at,
          COALESCE(u.telegram_id, p.telegram_id)::text AS telegram_id,
          u.id AS user_open,
          p.id AS pending_open
        FROM link_tokens lt
        LEFT JOIN users u ON u.id = lt.user_id
        LEFT JOIN pending_signups p ON p.id = lt.pending_signup_id AND p.expires_at > now()
        WHERE lt.token_hash = ${input.tokenHash}
        FOR UPDATE OF lt
      ),
      locked_user AS (
        SELECT users.id
        FROM users
        JOIN found ON found.user_id = users.id
        FOR UPDATE
      ),
      locked_pending AS (
        SELECT pending_signups.id
        FROM pending_signups
        JOIN found ON found.pending_signup_id = pending_signups.id
        FOR UPDATE
      ),
      decision AS (
        SELECT
          token_id,
          user_id,
          pending_signup_id,
          (SELECT count(*) FROM locked_user) AS locked_users,
          (SELECT count(*) FROM locked_pending) AS locked_pendings,
          CASE
            WHEN used_at IS NOT NULL OR expires_at <= now() THEN 'invalid'
            WHEN user_id IS NULL AND pending_signup_id IS NULL THEN 'invalid'
            WHEN user_id IS NOT NULL AND user_open IS NULL THEN 'invalid'
            WHEN pending_signup_id IS NOT NULL AND pending_open IS NULL THEN 'invalid'
            WHEN telegram_id IS NOT NULL AND telegram_id <> ${input.telegramId} THEN 'already_other'
            WHEN EXISTS (
              SELECT 1
              FROM users other_user
              WHERE other_user.telegram_id = ${input.telegramId}::bigint
                AND other_user.id IS DISTINCT FROM found.user_id
            ) OR EXISTS (
              SELECT 1
              FROM pending_signups other_pending
              WHERE other_pending.telegram_id = ${input.telegramId}::bigint
                AND other_pending.expires_at > now()
                AND other_pending.id IS DISTINCT FROM found.pending_signup_id
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
          telegram_username = CASE
            WHEN ${input.username}::text IS NOT NULL THEN ${input.username}
            ELSE users.telegram_username
          END,
          updated_at = now()
        FROM decision
        WHERE users.id = decision.user_id
          AND decision.status IN ('link', 'refresh')
        RETURNING users.id
      ),
      pending_profile AS (
        UPDATE pending_signups
        SET
          telegram_id = ${input.telegramId}::bigint,
          telegram_username = CASE
            WHEN ${input.username}::text IS NOT NULL THEN ${input.username}
            ELSE pending_signups.telegram_username
          END,
          updated_at = now()
        FROM decision
        WHERE pending_signups.id = decision.pending_signup_id
          AND pending_signups.expires_at > now()
          AND decision.status IN ('link', 'refresh')
        RETURNING pending_signups.id
      )
      SELECT
        decision.status,
        COALESCE(decision.user_id, decision.pending_signup_id)::text AS user_id,
        CASE
          WHEN decision.user_id IS NOT NULL THEN 'user'
          WHEN decision.pending_signup_id IS NOT NULL THEN 'pending'
          ELSE NULL
        END AS owner,
        (SELECT count(*) FROM burned) AS burned_count,
        (SELECT count(*) FROM profile) + (SELECT count(*) FROM pending_profile) AS profile_count
      FROM decision
    `
    const status = rows[0]?.status
    const userId = typeof rows[0]?.user_id === "string" ? rows[0].user_id : null
    const owner = rows[0]?.owner === "user" || rows[0]?.owner === "pending" ? rows[0].owner : null
    const wrote = Number(rows[0]?.profile_count) > 0
    if (
      status === "invalid" ||
      status === "already_other" ||
      status === "taken" ||
      status === "refresh" ||
      status === "link"
    ) {
      return { status, userId, owner, wrote }
    }
    return { status: "invalid", userId: null, owner: null, wrote: false }
  } catch (error) {
    if (postgresCode(error) !== "23505") throw error
    await sql`
      UPDATE link_tokens
      SET used_at = now()
      WHERE token_hash = ${input.tokenHash}
        AND used_at IS NULL
        AND expires_at > now()
    `
    return { status: "taken", userId: null, owner: null, wrote: false }
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

export async function issuePendingLinkToken(pendingId: string) {
  if (!USER_ID.test(pendingId)) throw new Error("Invalid signup id")
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString()
  const sql = database()
  await sql.transaction([
    sql`SELECT id FROM pending_signups WHERE id = ${pendingId}::uuid AND expires_at > now() FOR UPDATE`,
    sql`DELETE FROM link_tokens WHERE pending_signup_id = ${pendingId}::uuid AND used_at IS NULL`,
    sql`
      INSERT INTO link_tokens (pending_signup_id, token_hash, expires_at)
      VALUES (${pendingId}::uuid, ${hashLinkToken(token)}, ${expiresAt}::timestamptz)
    `,
  ])
  return { token, expiresAt }
}
