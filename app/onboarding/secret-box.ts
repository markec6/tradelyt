import { createCipheriv, randomBytes } from "node:crypto"

export function encryptionKey() {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) return null
  try {
    const decoded = Buffer.from(raw, "base64")
    if (decoded.length !== 32) return null
    return decoded
  } catch {
    return null
  }
}

export function sealSecret(plain: string, key: Buffer) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`
}
