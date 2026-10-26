import Link from "next/link"

export function HeaderSection() {
  return (
    <div className="text-center pt-24 sm:pt-28 md:pt-32 pb-10 sm:pb-12 md:pb-16 px-4 sm:px-6">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6 sm:mb-8">
        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs sm:text-sm text-emerald-400">Algorithmic Emotional Control</span>
      </div>

      {/* Main Heading */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold max-w-4xl mx-auto leading-tight mb-4 sm:mb-6">
        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-slate-200 to-slate-400">
          Trade With Logic,
        </span>
        <br />
        <span className="animate-emotion-gradient">
          Not Emotion
        </span>
      </h1>

      {/* Subheading */}
      <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-xs sm:max-w-md md:max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
        Eliminate greed and overtrading with AI-powered discipline enforcement. 
        Real-time position monitoring, automatic stop-losses, and psychological 
        guardrails that protect your capital.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <Link
          href="/onboarding"
          className="inline-flex w-full sm:w-auto items-center justify-center px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm sm:text-base font-semibold hover:scale-105 transition-transform shadow-xl shadow-emerald-500/30"
        >
          Start Trading Smarter
        </Link>
        <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-full border border-slate-700 text-slate-300 text-sm sm:text-base font-semibold hover:bg-slate-800 hover:border-slate-600 transition-all">
          View Live Demo
        </button>
      </div>
    </div>
  )
}
