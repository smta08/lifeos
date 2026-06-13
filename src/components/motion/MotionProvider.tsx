'use client'

import { MotionConfig } from 'framer-motion'
import type { ReactNode } from 'react'

// App-wide motion defaults. `reducedMotion="user"` makes every Framer Motion
// animation honour the OS "reduce motion" preference automatically — critical
// for low-end and motion-sensitive devices.
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </MotionConfig>
  )
}
