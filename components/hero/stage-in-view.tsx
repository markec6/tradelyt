"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"

const StageInViewContext = createContext(false)

export function useStageInView() {
  return useContext(StageInViewContext)
}

export function StageInView({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    let inside = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio
        if (!inside && ratio >= 0.25) {
          inside = true
          setInView(true)
        } else if (inside && ratio < 0.15) {
          inside = false
          setInView(false)
        }
      },
      { threshold: [0, 0.15, 0.25, 1] },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <StageInViewContext.Provider value={inView}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </StageInViewContext.Provider>
  )
}
