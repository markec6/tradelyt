import { AnalyticsDashboard } from "./analytics-dashboard"
import { PhoneMockup } from "./phone-mockup"
import { OvertradingCard, Tp1Card } from "./floating-cards"
import { OrbitCard } from "./orbit-card"
import { StageInView } from "./stage-in-view"

export function ProductMockup() {
  return (
    <div className="relative max-w-6xl w-full mx-auto px-4 sm:px-6 pb-10 md:pb-14">
      {/* Top: Full-width Trading Command Center */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-4 sm:p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-800/50 via-transparent to-emerald-900/20 pointer-events-none" />
        <div className="relative w-full">
          <AnalyticsDashboard />
        </div>
      </div>

      {/* Bottom: Centered phone + floating cards */}
      <div className="relative mx-auto w-full mt-24 md:mt-32">
        {/* Atmosphere: clipped so 500px orbs cannot cause overflow; cards stay unclipped */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-transparent blur-3xl rounded-full w-[500px] h-[500px] max-w-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="bg-emerald-500/10 blur-2xl w-72 h-72 rounded-full absolute -top-10 left-1/4" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(rgba(16,185,129,0.12) 1px, transparent 1px),
                linear-gradient(90deg, rgba(16,185,129,0.12) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <line x1="18" y1="28" x2="32" y2="42" stroke="#34d399" strokeWidth="0.35" opacity="0.2" />
            <line x1="32" y1="42" x2="22" y2="62" stroke="#22d3ee" strokeWidth="0.35" opacity="0.18" />
            <line x1="82" y1="24" x2="78" y2="48" stroke="#22d3ee" strokeWidth="0.35" opacity="0.18" />
            <line x1="78" y1="48" x2="86" y2="68" stroke="#34d399" strokeWidth="0.35" opacity="0.15" />
            <line x1="18" y1="28" x2="82" y2="24" stroke="#34d399" strokeWidth="0.25" opacity="0.12" />
            <line x1="22" y1="62" x2="86" y2="68" stroke="#22d3ee" strokeWidth="0.25" opacity="0.12" />
            <circle cx="18" cy="28" r="1.6" fill="#34d399" opacity="0.35" />
            <circle cx="32" cy="42" r="1.4" fill="#34d399" opacity="0.35" />
            <circle cx="22" cy="62" r="1.5" fill="#34d399" opacity="0.35" />
            <circle cx="82" cy="24" r="1.6" fill="#34d399" opacity="0.35" />
            <circle cx="78" cy="48" r="1.4" fill="#34d399" opacity="0.35" />
            <circle cx="86" cy="68" r="1.5" fill="#34d399" opacity="0.35" />
            <circle cx="12" cy="48" r="1.3" fill="#34d399" opacity="0.3" />
            <circle cx="90" cy="40" r="1.3" fill="#34d399" opacity="0.3" />
          </svg>
        </div>

        {/* Mobile / tablet: cards above and below the phone */}
        <StageInView className="flex w-full flex-col items-center gap-4 overflow-visible lg:hidden">
          <div className="grid w-full grid-cols-1 gap-3 overflow-visible sm:grid-cols-2">
            <OrbitCard className="rotate-0" y={[-4, 4, -4]} duration={4}>
              <OvertradingCard variant="compact" />
            </OrbitCard>
            <OrbitCard className="rotate-0" y={[4, -4, 4]} duration={4.5} delay={1.2}>
              <Tp1Card variant="compact" />
            </OrbitCard>
          </div>
          <PhoneMockup />
        </StageInView>

        {/* Desktop: two level cards beside the phone, inside its height */}
        <StageInView className="relative hidden overflow-visible py-6 perspective-[1000px] lg:block">
          <div className="relative z-10 flex items-center justify-center">
            <PhoneMockup />
          </div>
          <OrbitCard
            className="absolute left-1/2 top-10 z-20 -translate-x-[calc(100%+155px)] rotate-0"
            y={[-4, 4, -4]}
            duration={4}
          >
            <OvertradingCard variant="float" />
          </OrbitCard>
          <OrbitCard
            className="absolute bottom-10 left-1/2 z-20 translate-x-[155px] rotate-0"
            y={[4, -4, 4]}
            duration={4.5}
            delay={1.2}
          >
            <Tp1Card variant="float" />
          </OrbitCard>
        </StageInView>
      </div>

      {/* Background Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-48 sm:w-64 lg:w-96 h-48 sm:h-64 lg:h-96 bg-emerald-500/20 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-32 sm:w-48 lg:w-64 h-32 sm:h-48 lg:h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10" />
    </div>
  )
}
