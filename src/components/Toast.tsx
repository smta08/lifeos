'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
}

const ToastContext = createContext<(message: string) => void>(() => {})

// Call inside any client component under <ToastProvider> to surface a
// bottom-right confirmation. Auto-dismisses after 2.2s.
export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const toast = useCallback((message: string) => {
    const id = nextId.current++
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2200)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex items-center gap-2.5 rounded-card border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] px-4 py-3 shadow-card"
              role="status"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#059669]/15 dark:bg-[#34D399]/15">
                <Check size={14} className="text-[#059669] dark:text-[#34D399]" strokeWidth={2.5} />
              </span>
              <span className="text-sm font-medium text-[#1D1D1F] dark:text-[#FAFAFA]">
                {t.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
