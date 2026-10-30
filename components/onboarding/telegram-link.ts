export type TelegramUpdate = {
  message?: {
    from?: { id: number; username?: string }
    contact?: { phone_number?: string; user_id?: number }
  }
}

export type TelegramMatch =
  | { status: "matched"; telegramId: string; username: string }
  | { status: "phone_mismatch" }
  | { status: "needs_phone"; chatId: string }
  | { status: "not_found" }

export function telegramUsernameExists(title: string) {
  if (!title) return null
  if (/^Telegram: Contact @/i.test(title)) return false
  return true
}

export function phoneDigits(phone: string) {
  return phone.replace(/\D/g, "")
}

export function matchTelegramUpdates(updates: TelegramUpdate[], handle: string, phone: string): TelegramMatch {
  const wanted = handle.toLowerCase()
  const wantedDigits = phoneDigits(phone)
  let chatId: string | null = null
  let sawOtherPhone = false

  for (const update of updates) {
    const message = update.message
    const from = message?.from
    if (!from || from.username?.toLowerCase() !== wanted) continue
    chatId = String(from.id)
    const contact = message.contact
    if (!contact?.phone_number) continue
    if (contact.user_id && contact.user_id !== from.id) continue
    if (phoneDigits(contact.phone_number) === wantedDigits) {
      return { status: "matched", telegramId: String(from.id), username: from.username ?? handle }
    }
    sawOtherPhone = true
  }

  if (sawOtherPhone) return { status: "phone_mismatch" }
  if (chatId) return { status: "needs_phone", chatId }
  return { status: "not_found" }
}
