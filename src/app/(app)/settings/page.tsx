import Link from 'next/link'
import { requireUser } from '@/services/auth/requireUser'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm }        from './_components/ProfileForm'
import { NotificationsForm }  from './_components/NotificationsForm'
import { PrivacyTab }         from './_components/PrivacyTab'

type Tab = 'profile' | 'notifications' | 'privacy'
const TABS: { id: Tab; label: string }[] = [
  { id: 'profile',       label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'privacy',       label: 'Privacy' },
]

interface PageProps {
  searchParams: { tab?: string }
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const user     = await requireUser()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, timezone, notify_email, notify_cadence')
    .eq('id', user.id)
    .single()

  const activeTab: Tab =
    (['profile', 'notifications', 'privacy'] as Tab[]).includes(searchParams.tab as Tab)
      ? (searchParams.tab as Tab)
      : 'profile'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold font-heading text-[#1D1D1F] dark:text-[#FAFAFA]">
          Settings
        </h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-8 p-1 bg-[#F5F5F7] dark:bg-[#27272A] rounded-[10px] w-fit">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`?tab=${tab.id}`}
            className={[
              'px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] shadow-sm'
                : 'text-[#52525B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-[#FAFAFA]',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      <div
        className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] p-6"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.05)' }}
      >
        {activeTab === 'profile' && (
          <ProfileForm
            displayName={profile?.display_name ?? null}
            timezone={profile?.timezone ?? 'UTC'}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsForm
            notifyEmail={profile?.notify_email ?? true}
            notifyCadence={profile?.notify_cadence ?? 'daily'}
          />
        )}

        {activeTab === 'privacy' && <PrivacyTab />}
      </div>
    </div>
  )
}
