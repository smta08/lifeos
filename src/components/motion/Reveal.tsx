'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** Stagger delay in seconds. */
  delay?: number
  /** Vertical travel distance in px. */
  y?: number
  className?: string
}

// Premium entrance: fade + gentle rise on an expo-out curve. GPU-only
// (transform/opacity), and skips the transform entirely under reduced motion.
export function Reveal({ children, delay = 0, y = 14, className }: RevealProps) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  )
}
