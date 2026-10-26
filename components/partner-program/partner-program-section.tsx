import { COPY } from "./data"
import { MobileFlowSimulator } from "./mobile-flow-simulator"
import { PartnerValueProps } from "./partner-value-props"

export function PartnerProgramSection() {
  return (
    <section
      aria-labelledby="partner-program-heading"
      className="mx-auto mt-32 mb-6 h-auto max-h-none w-[92%] max-w-7xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 px-6 py-12 shadow-2xl backdrop-blur-xl md:mt-44 md:mb-10 md:px-8 md:py-16 lg:mt-56 lg:mb-16 lg:flex lg:h-full lg:max-h-[calc(100vh-4rem)] lg:min-h-0 lg:flex-col lg:py-6"
    >
      <div className="grid grid-cols-1 items-center gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:gap-5">
        <div className="order-2 flex justify-center lg:order-1 lg:col-span-5">
          <MobileFlowSimulator />
        </div>

        <div className="order-1 min-w-0 lg:order-2 lg:col-span-7">
          <p className="mb-2 inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            {COPY.badge}
          </p>
          <h2 id="partner-program-heading" className="mb-2 text-2xl font-bold text-white md:text-3xl">
            {COPY.headlineLead}
            <span className="mt-1 block">{COPY.headlineTail}</span>
          </h2>
          <p className="mb-4 text-xs leading-relaxed text-slate-400 md:text-sm">{COPY.subheadline}</p>
          <PartnerValueProps />
          <a
            href={COPY.ctaHref}
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg transition-all hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {COPY.cta}
          </a>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400/90">
            <span aria-hidden="true">⚡</span>
            {COPY.microcopy}
          </p>
        </div>
      </div>
    </section>
  )
}
