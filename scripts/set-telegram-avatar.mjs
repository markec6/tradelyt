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
    // The token can also come from the process environment.
  }
}

loadEnvLocal()

const token = process.env.TELEGRAM_BOT_TOKEN
const jpgPath = process.argv[2] || "public/tradelyt-bot.jpg"
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is required.")
  process.exit(1)
}

const bytes = readFileSync(jpgPath)
const form = new FormData()
form.append("photo", JSON.stringify({ type: "static", photo: "attach://avatar" }))
form.append("avatar", new Blob([bytes], { type: "image/jpeg" }), "avatar.jpg")

const response = await fetch(`https://api.telegram.org/bot${token}/setMyProfilePhoto`, {
  method: "POST",
  body: form,
})
const body = await response.json().catch(() => null)
if (!response.ok || body?.ok !== true) {
  console.error(typeof body?.description === "string" ? body.description : "setMyProfilePhoto failed.")
  process.exit(1)
}

const me = await fetch(`https://api.telegram.org/bot${token}/getMe`)
const meBody = await me.json().catch(() => null)
const botId = meBody?.ok === true ? meBody.result?.id : null
if (!botId) {
  console.log("Bot profile photo set.")
  process.exit(0)
}

const photos = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${botId}&limit=1`)
const photosBody = await photos.json().catch(() => null)
const count = photosBody?.ok === true ? photosBody.result?.total_count : null
console.log(typeof count === "number" ? `Bot profile photo set. Photos: ${count}.` : "Bot profile photo set.")
