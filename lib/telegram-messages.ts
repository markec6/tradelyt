export function pickVariant<T>(variants: readonly T[]): T {
  const variant = variants[Math.floor(Math.random() * variants.length)]
  if (variant === undefined) throw new Error("No message variants.")
  return variant
}

export const CARD_REMINDERS = [
  (firstName: string) =>
    `Hey ${firstName}, your trial's just sitting there. Pop back into Tradelyt and save a card so we can actually get to work.`,
  (firstName: string) =>
    `${firstName}, the trial's on hold until a card's on file. Open Tradelyt, add a payment method, and we're live.`,
  (firstName: string) =>
    `Yo ${firstName}, no card saved yet, so the trial can't start. Jump into Tradelyt and drop a payment method when you're ready.`,
] as const
