export function RobotIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Antenna */}
      <circle cx="24" cy="6" r="2.5" fill="currentColor" />
      <line x1="24" y1="8.5" x2="24" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Head */}
      <rect x="11" y="13" width="26" height="22" rx="7" stroke="currentColor" strokeWidth="2.2" />
      {/* Eyes */}
      <circle cx="19" cy="23" r="2.6" fill="currentColor" />
      <circle cx="29" cy="23" r="2.6" fill="currentColor" />
      {/* Mouth */}
      <path d="M19 29.5h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Side ears */}
      <path d="M11 21v6M37 21v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* Base */}
      <path d="M17 35v3.5a3 3 0 003 3h8a3 3 0 003-3V35" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
