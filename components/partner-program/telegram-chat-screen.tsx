"use client"

import { RobotIcon } from "@/components/hero/robot-icon"
import { COPY, TELEGRAM_COLORS } from "./data"
import { TypewriterText } from "./typewriter-text"

export function TelegramChatScreen() {
  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: TELEGRAM_COLORS.background }}>
      <header
        className="flex items-center gap-2 border-b border-black/30 px-3 pb-2.5 pt-8"
        style={{ backgroundColor: TELEGRAM_COLORS.header }}
      >
        <svg className="h-4 w-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <div className="relative h-8 w-8 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-950/80">
            <RobotIcon className="h-4 w-4 text-emerald-300" />
          </div>
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-[#242F3D] bg-emerald-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">{COPY.botName}</p>
          <p className="text-[10px] text-emerald-400">{COPY.botStatus}</p>
        </div>
      </header>

      <div className="flex-1 px-3 py-4">
        <div className="flex items-end gap-1.5">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-950/80">
            <RobotIcon className="h-3.5 w-3.5 text-emerald-300" />
          </div>
          <div
            className="max-w-[85%] rounded-2xl rounded-bl-sm px-3 py-2"
            style={{ backgroundColor: TELEGRAM_COLORS.bubble }}
          >
            <TypewriterText />
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-2 border-t border-black/30 px-3 py-2.5"
        style={{ backgroundColor: TELEGRAM_COLORS.header }}
      >
        <div className="flex h-8 flex-1 items-center rounded-full bg-black/25 px-3">
          <span className="text-[11px] text-slate-500">{COPY.messagePlaceholder}</span>
        </div>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500">
          <svg className="h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
      </div>
    </div>
  )
}
