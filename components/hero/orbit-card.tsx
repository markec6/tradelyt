"use client"

import type { ReactNode } from "react"
import { motion } from "framer-motion"

export function OrbitCard({
  className,
  y,
  duration,
  delay = 0,
  children,
}: {
  className: string
  y: number[]
  duration: number
  delay?: number
  children: ReactNode
}) {
  return (
    <div className={className}>
      <motion.div
        animate={{ y }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
