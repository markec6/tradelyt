import { readFileSync } from "node:fs"

function loadEnvLocal() {
  try {
    const text = readFileSync(".env.local", "utf8")
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const separator = trimmed.indexOf("=")
      if (separator <= 0) continue
      const key = trimmed.slice(0, separator)
      let value = trimmed.slice(separator + 1)
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // The variables can also come from the process environment.
  }
}

loadEnvLocal()

const token = process.env.TELEGRAM_BOT_TOKEN
const secret = process.env.TELEGRAM_WEBHOOK_SECRET
const url = process.env.TELEGRAM_WEBHOOK_URL

if (!token || !secret || !url) {
  console.error("TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, and TELEGRAM_WEBHOOK_URL are required.")
  process.exit(1)
}

if (!url.startsWith("https://")) {
  console.error("TELEGRAM_WEBHOOK_URL must be an https URL.")
  process.exit(1)
}

if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
  console.error("TELEGRAM_WEBHOOK_SECRET must be 1-256 characters of letters, numbers, underscores, or hyphens.")
  process.exit(1)
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url,
    secret_token: secret,
    allowed_updates: ["message", "my_chat_member", "callback_query"],
  }),
})

let ok = response.ok
try {
  const body = await response.json()
  ok = ok && body?.ok === true
} catch {
  ok = false
}

if (!ok) {
  console.error("setWebhook failed.")
  process.exit(1)
}

console.log("Webhook set.")
