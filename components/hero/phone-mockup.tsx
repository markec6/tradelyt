import { RobotIcon } from "./robot-icon"

export function PhoneMockup() {
  return (
    <div className="relative w-full flex justify-center">
      {/* Phone Frame - Scales responsively */}
      <div className="relative w-full max-w-[260px] sm:max-w-[280px] rounded-[32px] sm:rounded-[40px] border-[6px] sm:border-8 border-slate-800 shadow-2xl overflow-hidden bg-slate-950">
        {/* Phone Notch */}
        <div className="absolute top-1.5 sm:top-2 left-1/2 -translate-x-1/2 w-16 sm:w-20 h-4 sm:h-5 bg-slate-800 rounded-full z-10" />
        
        {/* Phone Screen Content */}
        <div className="relative h-[480px] sm:h-[560px] bg-gradient-to-b from-slate-900 to-slate-950 overflow-hidden">
          {/* Telegram Header */}
          <div className="sticky top-0 z-10 px-3 sm:px-4 pt-6 sm:pt-8 pb-2 sm:pb-3 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Back Arrow */}
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              
              {/* Bot Avatar */}
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                <div className="w-full h-full bg-emerald-950/80 border border-emerald-500/30 p-1.5 rounded-full flex items-center justify-center">
                  <RobotIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-400 w-2.5 h-2.5 rounded-full animate-pulse ring-2 ring-slate-900" />
              </div>
              
              {/* Bot Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-white truncate">Tradelyt Bot</p>
                <p className="text-[10px] sm:text-xs text-emerald-400 truncate">● active guardrail</p>
              </div>
              
              {/* More Icon */}
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </div>
          </div>
          
          {/* Chat Messages Area */}
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Pinned Live HUD Message - The Core UI Product */}
            <div className="relative">
              {/* Pinned Badge */}
              <div className="absolute -top-1.5 sm:-top-2 left-3 sm:left-4 px-1.5 sm:px-2 py-0.5 bg-emerald-500/20 rounded text-[8px] sm:text-[10px] text-emerald-400 font-medium border border-emerald-500/30">
                PINNED
              </div>
              
              {/* Main Card */}
              <div className="backdrop-blur-md bg-slate-800/90 border border-emerald-500/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xl shadow-emerald-500/10">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-[10px] sm:text-xs font-semibold text-white tracking-wide">LIVE TRADING: SOL/USDT</span>
                </div>
                
                {/* Active Profit Display */}
                <div className="text-center mb-4 sm:mb-5">
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-emerald-400">+14.20%</span>
                    <span className="text-sm sm:text-base text-emerald-500">(+$42.60)</span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-slate-400 mt-1 block">Entry: $142.50 → Current: $162.72</span>
                </div>
                
                {/* Visual Progress Tracker */}
                <div className="mb-4 sm:mb-5">
                  <div className="flex justify-between text-[8px] sm:text-[10px] text-slate-400 mb-1.5 sm:mb-2 px-0.5">
                    <span>Stop Loss</span>
                    <span>Entry</span>
                    <span>TP1</span>
                    <span>TP2</span>
                  </div>
                  
                  {/* Multi-zone Progress Bar */}
                  <div className="relative h-3 sm:h-3.5 rounded-full overflow-hidden bg-slate-700/80">
                    {/* Stop Loss Zone */}
                    <div className="absolute left-0 top-0 bottom-0 w-[20%] bg-gradient-to-r from-red-600 to-red-500" />
                    {/* Neutral Zone */}
                    <div className="absolute left-[20%] top-0 bottom-0 w-[25%] bg-gradient-to-r from-slate-600 to-slate-500" />
                    {/* TP1 Zone */}
                    <div className="absolute left-[45%] top-0 bottom-0 w-[25%] bg-gradient-to-r from-emerald-600 to-emerald-500" />
                    {/* TP2 Zone */}
                    <div className="absolute left-[70%] top-0 bottom-0 w-[30%] bg-gradient-to-r from-cyan-600 to-cyan-500" />
                    
                    {/* Current Position Marker */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-[62%] w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white border-2 border-emerald-500 shadow-lg shadow-emerald-500/50 z-10">
                      <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-50" />
                    </div>
                  </div>
                  
                  {/* Zone Labels */}
                  <div className="flex mt-1.5 sm:mt-2">
                    <div className="w-[20%] text-center">
                      <span className="text-[7px] sm:text-[9px] text-red-400 font-medium">-8%</span>
                    </div>
                    <div className="w-[25%] text-center">
                      <span className="text-[7px] sm:text-[9px] text-slate-400 font-medium">0%</span>
                    </div>
                    <div className="w-[25%] text-center">
                      <span className="text-[7px] sm:text-[9px] text-emerald-400 font-medium">+15%</span>
                    </div>
                    <div className="w-[30%] text-center">
                      <span className="text-[7px] sm:text-[9px] text-cyan-400 font-medium">+30%</span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 sm:gap-3">
                  <button className="flex-1 py-2.5 sm:py-3 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[10px] sm:text-xs font-semibold hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-1.5 sm:gap-2">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Lock TP1
                  </button>
                  <button className="flex-1 py-2.5 sm:py-3 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 text-[10px] sm:text-xs font-semibold hover:bg-red-500/30 transition-colors flex items-center justify-center gap-1.5 sm:gap-2">
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Terminate
                  </button>
                </div>
              </div>
            </div>
            
            {/* Previous Messages */}
            <div className="space-y-2 sm:space-y-3 mt-4 sm:mt-5">
              {/* Bot Message */}
              <div className="flex gap-1.5 sm:gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="bg-slate-800/80 rounded-xl sm:rounded-2xl rounded-tl-sm px-2.5 sm:px-3 py-1.5 sm:py-2 max-w-[85%]">
                  <p className="text-[10px] sm:text-xs text-slate-200">Position opened at $142.50</p>
                  <p className="text-[10px] sm:text-xs text-slate-300">Stop-loss set at $131.10 (-8%)</p>
                  <span className="text-[8px] sm:text-[10px] text-slate-500 mt-0.5 sm:mt-1 block">10:42 AM</span>
                </div>
              </div>
              
              {/* Another Bot Message */}
              <div className="flex gap-1.5 sm:gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="bg-slate-800/80 rounded-xl sm:rounded-2xl rounded-tl-sm px-2.5 sm:px-3 py-1.5 sm:py-2 max-w-[85%]">
                  <p className="text-[10px] sm:text-xs text-emerald-400 font-medium">TP1 zone reached!</p>
                  <p className="text-[10px] sm:text-xs text-slate-300">Consider locking partial profits.</p>
                  <span className="text-[8px] sm:text-[10px] text-slate-500 mt-0.5 sm:mt-1 block">11:28 AM</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-8 sm:h-10 rounded-full bg-slate-800 px-3 sm:px-4 flex items-center">
                <span className="text-[10px] sm:text-xs text-slate-500">Message...</span>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
