"use client"

import { SCENARIOS } from "./data"

export function ScenarioPanel({
  scenarioIndex,
  onSelect,
}: {
  scenarioIndex: number
  onSelect: (index: number) => void
}) {
  const scenario = SCENARIOS[scenarioIndex] ?? SCENARIOS[0]

  return (
    <div className="min-w-0">
      <div role="tablist" aria-label="Trading scenarios" className="flex flex-wrap gap-2">
        {SCENARIOS.map((item, index) => {
          const selected = index === scenarioIndex
          return (
            <button
              key={item.tab}
              type="button"
              role="tab"
              id={`scenario-tab-${index}`}
              aria-selected={selected}
              aria-controls="scenario-panel"
              onClick={() => onSelect(index)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                selected
                  ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-300"
                  : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              {item.tab}
            </button>
          )
        })}
      </div>

      <div id="scenario-panel" role="tabpanel" aria-labelledby={`scenario-tab-${scenarioIndex}`} className="mt-3">
        <h3 className="text-xl font-semibold text-white md:text-2xl">{scenario.headline}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{scenario.body}</p>
      </div>

      <div role="tablist" aria-label="Scenario position" className="mt-3 flex items-center gap-2">
        {SCENARIOS.map((item, index) => {
          const selected = index === scenarioIndex
          return (
            <button
              key={item.tab}
              type="button"
              role="tab"
              aria-label={item.tab}
              aria-selected={selected}
              onClick={() => onSelect(index)}
              className="flex h-6 items-center justify-center"
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  selected ? "h-1.5 w-6 bg-emerald-400" : "h-1.5 w-1.5 bg-slate-700"
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
