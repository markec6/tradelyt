"use server"

import { randomBytes, scrypt } from "node:crypto"
import { promisify } from "node:util"

import { neon } from "@neondatabase/serverless"

import { toE164 } from "@/components/onboarding/phone-number"
import { validateAccount, type AccountDraft, type AccountErrors } from "@/components/onboarding/validate-account"

const scryptAsync = promisify(scrypt)

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url")
  const derived = (await scryptAsync(password, salt, 32)) as Buffer
  return `scrypt$${salt}$${derived.toString("base64url")}`
}

export async function saveAccount(
  draft: AccountDraft,
): Promise<{ ok: true; userId: string; phoneNumber: string } | { ok: false; errors: AccountErrors }> {
  const errors = validateAccount(draft)
  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const phoneNumber = toE164(draft.phoneNumber, draft.country)
  if (!phoneNumber) {
    return { ok: false, errors: { phoneNumber: "Enter a valid phone number." } }
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    return { ok: false, errors: { phoneNumber: "Could not save your phone number." } }
  }

  try {
    const passwordHash = await hashPassword(draft.password)
    const sql = neon(databaseUrl)
    const rows = await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, phone_number, country)
      VALUES (
        ${draft.email.trim()},
        ${passwordHash},
        ${draft.firstName.trim()},
        ${draft.lastName.trim()},
        ${phoneNumber},
        ${draft.country}
      )
      ON CONFLICT (email)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone_number = EXCLUDED.phone_number,
        country = EXCLUDED.country,
        updated_at = now()
      RETURNING id
    `
    const userId = rows[0]?.id
    if (!userId) {
      return { ok: false, errors: { phoneNumber: "Could not save your phone number." } }
    }
    return { ok: true, userId: String(userId), phoneNumber }
  } catch {
    return { ok: false, errors: { phoneNumber: "Could not save your phone number." } }
  }
}
