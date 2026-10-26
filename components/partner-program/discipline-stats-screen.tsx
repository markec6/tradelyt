"use client"

import { motion } from "framer-motion"

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.16, delayChildren: 0.12 },
  },
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
}

const CARDS = [
  {
    label: "🛡️ Overtrades Prevented",
    value: "14",
    detail: "(Saved ~$1,450)",
  },
  {
    label: "⚡ Discipline Score",
    value: "96.4%",
    detail: null,
  },
  {
    label: "🟢 Status",
    value: "Fully Protected & Active",
    detail: null,
  },
] as const

export function DisciplineStatsScreen() {
  return (
    <motion.div
      className="flex h-full flex-col bg-gradient-to-b from-slate-900/80 to-slate-950 px-3 pb-3 pt-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.p variants={item} className="text-[13px] font-bold text-white">
        📊 Weekly Member Performance
      </motion.p>
      {CARDS.map((card) => (
        <motion.article
          key={card.label}
          variants={item}
          className="mt-1.5 rounded-xl border border-white/10 bg-slate-800/50 p-2.5 shadow-lg backdrop-blur-xl"
        >
          <p className="text-[10px] font-medium text-slate-400">{card.label}</p>
          <p className="mt-0.5 text-xs font-bold leading-snug text-white">
            {card.value}
            {card.detail && <span className="ml-1 text-[11px] font-medium text-emerald-300">{card.detail}</span>}
          </p>
        </motion.article>
      ))}

      <motion.section variants={item} className="mt-2.5">
        <p className="mb-1.5 text-[11px] font-semibold text-white">🔥 Live Group Activity</p>
        <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/50 p-2 text-[11px] text-slate-300">
          <span aria-hidden="true">🟢</span>
          <span>Stefan K. locked profits at TP2</span>
        </div>
        <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/50 p-2 text-[11px] text-slate-300">
          <span aria-hidden="true">🛡️</span>
          <span>Miloš P. prevented revenge trade</span>
        </div>
      </motion.section>

      <motion.section
        variants={item}
        className="mt-auto rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center"
      >
        <p className="text-[11px] font-semibold text-white">💰 Your Estimated Revenue Share</p>
        <p className="mt-1 text-sm font-bold text-emerald-400">$1,840.00 / mo</p>
        <p className="mt-1 text-[10px] text-slate-400">Based on 46 active community members</p>
      </motion.section>
    </motion.div>
  )
}
