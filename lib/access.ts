import { neon } from "@neondatabase/serverless"

export type AccessRecord = {
  accountStatus: string
  sessionVersion: number
  subscriptionStatus: string | null
}

export async function readAccess(userId: string): Promise<AccessRecord | null> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return null
  const sql = neon(databaseUrl)
  const rows = await sql`
    SELECT u.account_status, u.session_version, s.status AS subscription_status
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE u.id = ${userId}
    LIMIT 1
  `
  const row = rows[0]
  if (!row) return null
  const accountStatus = row.account_status
  const sessionVersion = row.session_version
  if (typeof accountStatus !== "string" || (typeof sessionVersion !== "number" && typeof sessionVersion !== "string")) {
    return null
  }
  const subscriptionStatus = row.subscription_status
  return {
    accountStatus,
    sessionVersion: Number(sessionVersion),
    subscriptionStatus: typeof subscriptionStatus === "string" ? subscriptionStatus : null,
  }
}
