import { requireUser } from '@/services/auth/requireUser'
import { createClient } from '@/lib/supabase/server'
import { ToastProvider } from '@/components/Toast'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { AppSidebar } from './_components/AppSidebar'
import { AppTopBar } from './_components/AppTopBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  // Fetch display name; fallback to email username
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, email')
    .eq('id', user.id)
    .single()

  // If the handle_new_user trigger didn't fire (SQL not yet run, or trigger failure),
  // create the profile now so fact FK constraints don't blow up.
  if (!profile && user.email) {
    await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email }, { onConflict: 'id', ignoreDuplicates: true })
  }

  const displayName =
    profile?.display_name ??
    (user.email?.split('@')[0] ?? 'You')

  const initials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <MotionProvider>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden bg-[#F5F5F7] dark:bg-[#0B0C0E]">
          {/* Sidebar */}
          <AppSidebar />

          {/* Main column */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <AppTopBar displayName={displayName} initials={initials} />

            <main className="scrollbar-thin flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </ToastProvider>
    </MotionProvider>
  )
}
