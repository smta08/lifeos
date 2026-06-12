import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck, ArrowRight, Eye, Bell, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

// Public landing page. Design north star: quiet relief —
// "someone competent is already watching this."
export default async function MarketingPage() {
  // If already signed in, skip the pitch — go straight to the product.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-[#F5F5F7] dark:bg-[#0B0C0E] text-[#1D1D1F] dark:text-[#FAFAFA]">
      {/* Nav */}
      <header className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
        <span className="text-[15px] font-semibold font-heading tracking-tight">LifeOS</span>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="px-4 py-2 rounded-[10px] text-sm font-medium text-[#52525B] dark:text-[#A1A1AA] hover:text-[#1D1D1F] dark:hover:text-[#FAFAFA] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-[10px] bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#27272A] mb-8">
          <ShieldCheck size={26} strokeWidth={1.5} className="text-[#0369A1] dark:text-[#38BDF8]" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-semibold font-heading tracking-tight leading-[1.1] mb-5">
          Stop holding it all<br />in your head.
        </h1>
        <p className="text-lg text-[#52525B] dark:text-[#A1A1AA] max-w-xl mx-auto leading-relaxed mb-8">
          LifeOS quietly tracks your renewals, expiries, and bills — and surfaces
          what needs you, before it&apos;s late. Someone competent is already watching this.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-[10px] bg-[#0369A1] dark:bg-[#38BDF8] text-white dark:text-[#0B0C0E] text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Get started — it&apos;s free
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>

        <p className="mt-6 text-sm font-medium text-[#0369A1] dark:text-[#38BDF8]">
          LifeOS sees everything. We see nothing.
        </p>
      </section>

      {/* Three pillars */}
      <section className="max-w-4xl mx-auto px-6 pb-24 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Eye,  title: 'It remembers',  body: 'Add a fact once. LifeOS tracks every expiry and renewal so you never have to.' },
          { icon: Bell, title: 'It warns you',  body: 'Calm, accurate alerts — only when something truly needs your attention.' },
          { icon: Lock, title: 'It stays private', body: 'We never store raw emails, documents, or credentials. Export or delete anytime.' },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="bg-white dark:bg-[#18181B] rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] p-6 text-left"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.05)' }}
          >
            <Icon size={22} strokeWidth={1.5} className="text-[#0369A1] dark:text-[#38BDF8] mb-4" />
            <h3 className="text-base font-semibold mb-1.5">{title}</h3>
            <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">{body}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E4E4E7] dark:border-[#27272A]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between text-sm text-[#52525B] dark:text-[#A1A1AA]">
          <span>© {new Date().getFullYear()} LifeOS</span>
          <Link href="/login" className="hover:text-[#1D1D1F] dark:hover:text-[#FAFAFA] transition-colors">
            Sign in
          </Link>
        </div>
      </footer>
    </main>
  )
}
