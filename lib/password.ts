import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto"

export const SCRYPT_N = 16384
export const SCRYPT_R = 8
export const SCRYPT_P = 1
export const SCRYPT_KEYLEN = 32
export const SCRYPT_SALT_BYTES = 16

/**
 * Canonical hashes are `scrypt$<salt>$<hash>` for the constants above.
 * When those constants change, bump this prefix (for example `scrypt2`).
 * `passwordNeedsRehash` then returns true for the previous prefix and login
 * writes a new hash after a successful check.
 */
export const SCRYPT_PREFIX = "scrypt"

const DUMMY_SALT = Buffer.alloc(SCRYPT_SALT_BYTES, 7).toString("base64url")

function pepper() {
  const value = process.env.PASSWORD_PEPPER
  if (!value) throw new Error("PASSWORD_PEPPER is not set")
  return value
}

function derive(password: string, salt: string, withPepper: boolean) {
  const material = withPepper ? `${password}${pepper()}` : password
  return new Promise<Buffer>((resolve, reject) => {
    scryptCb(material, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (error, derived) => {
      if (error) reject(error)
      else resolve(derived)
    })
  })
}

export async function hashPassword(password: string) {
  const salt = randomBytes(SCRYPT_SALT_BYTES).toString("base64url")
  const derived = await derive(password, salt, true)
  return `${SCRYPT_PREFIX}$${salt}$${derived.toString("base64url")}`
}

function parseHash(stored: string) {
  const parts = stored.split("$")
  if (parts.length !== 3 || parts[0] !== SCRYPT_PREFIX || !parts[1] || !parts[2]) return null
  const hash = Buffer.from(parts[2], "base64url")
  if (hash.length !== SCRYPT_KEYLEN) return null
  return { salt: parts[1], hash }
}

export function passwordNeedsRehash(stored: string) {
  return parseHash(stored) === null
}

export async function checkPassword(password: string, stored: string | null) {
  const parsed = stored ? parseHash(stored) : null
  const salt = parsed?.salt ?? DUMMY_SALT
  const peppered = await derive(password, salt, true)
  const legacy = await derive(password, salt, false)
  if (!parsed) return { ok: false, rehash: false }
  const pepperOk = peppered.length === parsed.hash.length && timingSafeEqual(peppered, parsed.hash)
  const legacyOk = legacy.length === parsed.hash.length && timingSafeEqual(legacy, parsed.hash)
  if (pepperOk) return { ok: true, rehash: false }
  if (legacyOk) return { ok: true, rehash: true }
  return { ok: false, rehash: false }
}
