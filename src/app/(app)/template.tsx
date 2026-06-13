'use client'

import { motion } from 'framer-motion'

// Re-mounts on every route change, giving each page a soft fade-in.
// Opacity-only (no transform) so it never creates a containing block for
// position:fixed children like the dashboard FAB.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
