"use client"

import { useState } from "react"
import { RobotIcon } from "./robot-icon"
import { BotSimulator } from "./bot-simulator"

const REVEAL_LINES = [
  {
    text: "Most traders don't lose money because their strategy is bad, but because they are humans. Greed makes you hold trades too long and turns gains into losses. Fear makes you panically exit before time. Boredom makes you open five positions at once and burn your account.",
    emphasis: false,
  },
  {
    text: "This bot does not think instead of you. It observes you.",
    emphasis: true,
  },
  {
    text: "From the moment you enter a trade, the bot hooks up with you on Telegram. Through silent updates and screaming alarms, it physically holds you locked into your game plan. It does not allow you to overtrade, reminds you when to secure profits, and slaps you with a reality check when the market is sideways.",
    emphasis: false,
  },
  {
    text: "Choose your mode, open a trade, and let the bot guard your back from yourself.",
    emphasis: true,
  },
]

const STAGGER = 0.04 // seconds between each word

const HIGHLIGHT_WORDS = new Set([
  "discipline",
  "overtrade",
  "telegram",
  "greed",
  "fear",
  "boredom",
])

function normalizeWord(word: string) {
  return word.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
}

/* Splits a string into words revealed strictly in order: word i at baseDelay + i * STAGGER. */
function WordReveal({
  text,
  baseDelay,
  className,
  wordClassName,
  active,
}: {
  text: string
  baseDelay: number
  className?: string
  wordClassName?: string
  active: boolean
}) {
  const words = text.split(" ")
  return (
    <span className={className}>
      {words.map((word, i) => {
        const highlighted = !wordClassName && HIGHLIGHT_WORDS.has(normalizeWord(word))
        return (
          <span key={i}>
            <span
              className={[
                "word-reveal-word",
                wordClassName,
                highlighted ? "font-semibold text-emerald-400" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                animationDelay: active ? `${baseDelay + i * STAGGER}s` : "0s",
              }}
            >
              {word}
            </span>
            {i < words.length - 1 ? " " : ""}
          </span>
        )
      })}
    </span>
  )
}

/* Floating glowing particle dust orbiting the aura (scattered, never a row) */
function ParticleDust() {
  const particles = [
    { left: "12%", bottom: "30%", delay: "0s", size: 3, color: "#10b981" },
    { left: "82%", bottom: "55%", delay: "0.5s", size: 2, color: "#06b6d4" },
    { left: "26%", bottom: "70%", delay: "1.1s", size: 3, color: "#34d399" },
    { left: "70%", bottom: "20%", delay: "0.3s", size: 2, color: "#22d3ee" },
    { left: "50%", bottom: "78%", delay: "0.9s", size: 2.5, color: "#10b981" },
    { left: "90%", bottom: "38%", delay: "1.6s", size: 2, color: "#06b6d4" },
  ]
  return (
    <span className="pointer-events-none absolute -inset-4 overflow-visible" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="animate-particle-rise absolute rounded-full"
          style={{
            left: p.left,
            bottom: p.bottom,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 6px ${p.color}`,
            animationDelay: p.delay,
          }}
        />
      ))}
    </span>
  )
}

export function RobotSection() {
  const [activated, setActivated] = useState(false)
  const [pressed, setPressed] = useState(false)
  const [revealKey, setRevealKey] = useState(0)

  const allLines = [
    "Here there is no magical AI, no false calculations and no one gives you advice for trading. This is a severe reminder of your own discipline — the only thing that separates you from loss and long-term, secure profit.",
    ...REVEAL_LINES.map((l) => l.text),
  ]
  const lineDelays: number[] = []
  let cursor = 0
  for (const line of allLines) {
    lineDelays.push(cursor)
    const wordCount = line.split(" ").length
    cursor += wordCount * STAGGER + 0.12
  }

  const handleOpen = () => {
    setPressed(true)
    setTimeout(() => setPressed(false), 150)
    setRevealKey((k) => k + 1)
    setActivated(true)
  }

  const handleClose = () => {
    setPressed(true)
    setTimeout(() => setPressed(false), 150)
    // Collapse the card first, then re-center / re-lock the idle core
    setActivated(false)
  }

  return (
    <section className="relative py-24 px-6">
      {/* Subtle continuing grid mesh */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-3xl">
        {/* Strategic H2 heading — fades out + collapses on activation */}
        <h2
          className={`text-center text-2xl font-semibold text-slate-200 md:text-3xl text-balance transition-all duration-500 ease-in-out ${
            activated ? "pointer-events-none mb-0 h-0 -translate-y-2 opacity-0" : "mb-8 translate-y-0 opacity-100"
          }`}
        >
          Decode the logic behind the bot
        </h2>

        {/* State 1: Idle centered robot energy-core */}
        <div
          className={`flex justify-center transition-all duration-700 ease-in-out ${
            activated ? "pointer-events-none h-0 opacity-0" : "opacity-100"
          }`}
        >
          {!activated && (
            <button
              type="button"
              onClick={handleOpen}
              aria-label="Activate the discipline bot"
              className={`group relative flex h-28 w-28 items-center justify-center rounded-full transition-transform duration-150 ease-in-out ${
                pressed ? "scale-90" : "hover:scale-105"
              }`}
            >
              {/* Particle dust floating up through the aura */}
              <ParticleDust />

              {/* Outer power ring — spins fast clockwise */}
              <span className="absolute inset-0 rounded-full p-[1.5px] animate-spin-border-fast">
                <span
                  className="block h-full w-full rounded-full"
                  style={{ background: "conic-gradient(from 0deg, transparent, #10b981, transparent, #06b6d4, transparent)" }}
                />
              </span>

              {/* Inner power ring — spins fast counter-clockwise */}
              <span className="absolute inset-[7px] rounded-full p-[1.5px] animate-spin-border-reverse">
                <span
                  className="block h-full w-full rounded-full"
                  style={{ background: "conic-gradient(from 90deg, transparent, #06b6d4, transparent, #34d399, transparent)" }}
                />
              </span>

              {/* Dark mechanical core disc with heartbeat glow */}
              <span className="absolute inset-[13px] rounded-full bg-slate-950 animate-pulse-glow transition-all duration-200 group-hover:brightness-125" />

              {/* Robot icon with chaotic vortex aura */}
              <RobotIcon className="animate-vortex-aura relative z-10 h-11 w-11 text-emerald-300 transition-colors group-hover:text-emerald-200" />
            </button>
          )}
        </div>

        {/* State 2: Activated — clickable avatar (closes) + glassmorphic chat card */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            activated ? "opacity-100 translate-y-0" : "pointer-events-none h-0 -translate-y-4 opacity-0"
          }`}
        >
          {activated && (
            <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
              {/* Small avatar — click to reverse the animation and re-center */}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close and return the bot to center"
                className={`group relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition-transform duration-150 ease-in-out ${
                  pressed ? "scale-90" : "hover:scale-105"
                }`}
              >
                <span className="absolute inset-0 rounded-full p-[1.5px] animate-spin-border-fast">
                  <span
                    className="block h-full w-full rounded-full"
                    style={{ background: "conic-gradient(from 0deg, transparent, #10b981, transparent, #06b6d4, transparent)" }}
                  />
                </span>
                <span className="absolute inset-[2px] rounded-full bg-slate-950 animate-pulse-glow" />
                <RobotIcon className="animate-vortex-aura relative z-10 h-7 w-7 text-emerald-300 transition-colors group-hover:text-emerald-200" />
              </button>

              {/* Glassmorphic chat card */}
              <div
                key={revealKey}
                className={`w-full rounded-2xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur-2xl md:p-10 ${
                  activated ? "" : "word-reveal-paused"
                }`}
              >
                <BotSimulator />
                <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

                {/* High-impact subheading */}
                <p className="text-lg font-semibold leading-relaxed md:text-xl">
                  <WordReveal
                    active={activated}
                    baseDelay={lineDelays[0]}
                    wordClassName="bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-200 bg-clip-text text-transparent"
                    text="Here there is no magical AI, no false calculations and no one gives you advice for trading. This is a severe reminder of your own discipline — the only thing that separates you from loss and long-term, secure profit."
                  />
                </p>

                {/* Body paragraphs */}
                <div className="mt-6 space-y-4">
                  {REVEAL_LINES.map((line, i) => (
                    <p
                      key={i}
                      className={`leading-relaxed ${
                        line.emphasis ? "font-medium text-slate-100" : "text-slate-300"
                      }`}
                    >
                      <WordReveal active={activated} baseDelay={lineDelays[i + 1]} text={line.text} />
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
