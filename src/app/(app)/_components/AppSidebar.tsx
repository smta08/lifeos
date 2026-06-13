'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors duration-150 cursor-pointer',
                isActive
                  ? 'bg-[#0369A1]/10 dark:bg-[#38BDF8]/10 text-[#0369A1] dark:text-[#38BDF8]'
                  : 'text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] hover:text-[#1D1D1F] dark:hover:text-[#FAFAFA]',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
