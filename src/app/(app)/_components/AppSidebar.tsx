'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  CalendarClock,
  FileText,
  Mail,
  Archive,
  Activity,
  Settings,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/timeline',  icon: CalendarClock,    label: 'Timeline'  },
  { href: '/docs',      icon: FileText,         label: 'Docs'      },
  { href: '/scan',      icon: Mail,             label: 'Gmail scan' },
  { href: '/facts',     icon: Archive,          label: 'Memory'    },
  { href: '/activity',  icon: Activity,         label: 'Activity'  },
  { href: '/settings',  icon: Settings,         label: 'Settings'  },
] as const

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B]">
      {/* Logo area */}
      <div className="h-14 flex items-center px-5 border-b border-[#E4E4E7] dark:border-[#27272A]">
        <span className="text-[15px] font-semibold font-heading tracking-tight text-[#1D1D1F] dark:text-[#FAFAFA]">
          LifeOS
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="App navigation">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium',
                'transition-colors duration-150 cursor-pointer',
                isActive
                  ? 'text-[#0369A1] dark:text-[#38BDF8]'
                  : 'text-[#52525B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-[#FAFAFA]',
              ].join(' ')}
            >
              {/* Active pill — slides between items via shared layout */}
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-[10px] bg-[#0369A1]/10 dark:bg-[#38BDF8]/10"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              {/* Hover wash for inactive items (under content, above pill layer) */}
              {!isActive && (
                <span className="absolute inset-0 rounded-[10px] bg-[#F5F5F7] dark:bg-[#27272A] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
              )}

              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
                className="relative z-10 transition-transform duration-150 group-hover:scale-110"
              />
              <span className="relative z-10">{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
