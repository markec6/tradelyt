export function AnalyticsDashboard() {
  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-6 relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-3 py-2">
          <h3 className="text-base sm:text-lg font-semibold text-white">Trading Command Center</h3>
          <p className="text-xs sm:text-sm text-slate-400">Real-time portfolio protection</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm rounded-full px-3 py-1.5 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Live</span>
        </div>
      </div>

      {/* Top Metrics Row - Stack on mobile, 3 cols on tablet+ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Active Exposure Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-800/70 border border-slate-600/50 backdrop-blur-sm shadow-lg">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs text-slate-300 font-medium">Active Exposure</span>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex items-end gap-2 mb-2 sm:mb-3">
            <span className="text-xl sm:text-2xl font-bold text-white">2</span>
            <span className="text-base sm:text-lg text-slate-400">/ 3</span>
          </div>
          {/* Progress Ring */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 transform -rotate-90">
                <circle cx="50%" cy="50%" r="35%" stroke="currentColor" strokeWidth="3" fill="none" className="text-slate-700" />
                <circle cx="50%" cy="50%" r="35%" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="100" strokeDashoffset="33" className="text-amber-500" strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-semibold text-amber-500">67%</span>
            </div>
            <span className="text-[10px] sm:text-xs text-slate-400">Near limit</span>
          </div>
        </div>

        {/* Total Saved Capital Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-800/70 border border-slate-600/50 backdrop-blur-sm shadow-lg">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs text-slate-300 font-medium">Capital Protected</span>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1 mb-1.5 sm:mb-2">
            <span className="text-xl sm:text-2xl font-bold text-emerald-400">$12,847</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span className="text-[10px] sm:text-xs text-emerald-400">+$2,340 this month</span>
          </div>
        </div>

        {/* Discipline Rate Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-slate-800/70 border border-slate-600/50 backdrop-blur-sm shadow-lg">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[10px] sm:text-xs text-slate-300 font-medium">Discipline Rate</span>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          {/* Percentage Gauge */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative w-12 h-12 sm:w-16 sm:h-16">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 transform -rotate-90">
                <circle cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="4" fill="none" className="text-slate-700" />
                <circle cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="176" strokeDashoffset="10" className="text-cyan-500" strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-lg font-bold text-white">94%</span>
            </div>
            <div>
              <p className="text-[10px] sm:text-xs text-slate-300 font-medium">Excellent</p>
              <p className="text-[10px] sm:text-xs text-slate-400">Top 5% of traders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="p-4 sm:p-5 rounded-xl bg-slate-800/70 border border-slate-600/50 backdrop-blur-sm shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-3 sm:mb-4">
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-white">Performance Overview</h4>
            <p className="text-[10px] sm:text-xs text-slate-400">30-day PnL curve</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] sm:text-xs text-slate-300">Profit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500" />
              <span className="text-[10px] sm:text-xs text-slate-300">Drawdown</span>
            </div>
          </div>
        </div>
        
        {/* SVG Line Chart */}
        <div className="relative h-28 sm:h-36 lg:h-40">
          <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
            {/* Grid Lines */}
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Horizontal Grid */}
            {[0, 40, 80, 120, 160].map((y) => (
              <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#475569" strokeWidth="0.5" strokeDasharray="4" opacity="0.5" />
            ))}
            
            {/* Area Fill */}
            <path
              d="M0,140 Q20,130 40,125 T80,115 T120,100 T160,90 T200,85 T240,70 T280,55 T320,45 T360,35 T400,20 L400,160 L0,160 Z"
              fill="url(#chartGradient)"
            />
            
            {/* Main Line */}
            <path
              d="M0,140 Q20,130 40,125 T80,115 T120,100 T160,90 T200,85 T240,70 T280,55 T320,45 T360,35 T400,20"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            
            {/* Glow Effect */}
            <path
              d="M0,140 Q20,130 40,125 T80,115 T120,100 T160,90 T200,85 T240,70 T280,55 T320,45 T360,35 T400,20"
              fill="none"
              stroke="#10b981"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.2"
            />
            
            {/* Current Point */}
            <circle cx="400" cy="20" r="5" fill="#10b981" />
            <circle cx="400" cy="20" r="8" fill="#10b981" opacity="0.3" />
          </svg>
          
          {/* Y-axis Labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] sm:text-xs text-slate-400 py-1">
            <span>+$5k</span>
            <span>+$2.5k</span>
            <span>$0</span>
          </div>
        </div>
        
        {/* Bottom Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-0 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-600/50">
          <div className="flex-1 min-w-[80px]">
            <span className="text-[10px] sm:text-xs text-slate-400">Total Profit</span>
            <p className="text-sm sm:text-lg font-semibold text-emerald-400">+$4,892.50</p>
          </div>
          <div className="flex-1 min-w-[80px]">
            <span className="text-[10px] sm:text-xs text-slate-400">Win Rate</span>
            <p className="text-sm sm:text-lg font-semibold text-white">73.2%</p>
          </div>
          <div className="flex-1 min-w-[80px]">
            <span className="text-[10px] sm:text-xs text-slate-400">Max Drawdown</span>
            <p className="text-sm sm:text-lg font-semibold text-red-400">-$412.00</p>
          </div>
        </div>
      </div>
    </div>
  )
}
