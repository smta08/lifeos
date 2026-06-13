import { ThemeToggle } from '@/components/ThemeToggle'

interface AppTopBarProps {
  displayName: string
  initials: string
}

export function AppTopBar({ displayName, initials }: AppTopBarProps) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-[#E4E4E7] dark:border-[#27272A] bg-white/80 dark:bg-[#18181B]/80 backdrop-blur-md">
      {/* Left: wordmark (shown on mobile where sidebar is hidden) */}
      <span className="md:hidden text-[15px] font-semibold font-heading tracking-tight text-[#1D1D1F] dark:text-[#FAFAFA]">
        LifeOS
      </span>
      {/* Spacer for desktop (sidebar shows the logo) */}
      <span className="hidden md:block" />

      {/* Right: theme toggle + avatar */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* User avatar */}
        <div
          aria-label={`Signed in as ${displayName}`}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-xs font-semibold select-none cursor-default ring-2 ring-transparent ring-offset-2 ring-offset-white dark:ring-offset-[#18181B] transition-shadow hover:ring-[#0369A1]/20 dark:hover:ring-[#38BDF8]/20"
        >
          {initials}
        </div>
      </div>
    </header>
  )
}
