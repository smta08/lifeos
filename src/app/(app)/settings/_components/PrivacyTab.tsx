'use client'

import { useState, useTransition } from 'react'
import { Download, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { deleteAccount } from '@/features/settings/actions'

export function PrivacyTab() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [confirmText,      setConfirmText]      = useState('')
  const [deleteError,      setDeleteError]      = useState<string | null>(null)
  const [isPending,        startTransition]     = useTransition()

  function handleExport() {
    window.location.href = '/api/settings/export'
  }

  function handleDelete() {
    if (confirmText !== 'DELETE') return
    setDeleteError(null)

    startTransition(async () => {
      const result = await deleteAccount()
      // If redirect didn't throw, show error
      if (result && !result.ok) {
        setDeleteError(result.error.message)
      }
    })
  }

  return (
    <div className="space-y-8 max-w-sm">
      {/* What we store */}
      <div className="bg-[#F5F5F7] dark:bg-[#27272A] rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#FAFAFA]">
          What LifeOS stores
        </h3>
        <ul className="space-y-1.5 text-sm text-[#52525B] dark:text-[#A1A1AA]">
          <li>✓ Facts you manually enter (titles, dates, amounts)</li>
          <li>✓ Alerts generated from your facts</li>
          <li>✓ Your activity log</li>
          <li>✓ Profile settings (name, timezone)</li>
        </ul>
        <div className="pt-1 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
          <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#FAFAFA] mb-1.5">
            What we never store
          </h4>
          <ul className="space-y-1.5 text-sm text-[#52525B] dark:text-[#A1A1AA]">
            <li>✗ Raw emails or documents</li>
            <li>✗ Passwords or credentials</li>
            <li>✗ Payment card numbers</li>
            <li>✗ Browsing history</li>
          </ul>
        </div>
      </div>

      {/* Export */}
      <div>
        <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#FAFAFA] mb-1">Export my data</h3>
        <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] mb-3">
          Download a JSON file of all your facts.
        </p>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] text-sm text-[#1D1D1F] dark:text-[#FAFAFA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors cursor-pointer"
        >
          <Download size={16} strokeWidth={1.5} />
          Export my data
        </button>
      </div>

      {/* Delete account */}
      <div>
        <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#FAFAFA] mb-1">Delete my account</h3>
        <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] mb-3">
          Permanently delete your account and all your data. This cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
        >
          <Trash2 size={16} strokeWidth={1.5} />
          Delete forever
        </button>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className="w-full max-w-sm bg-white dark:bg-[#18181B] rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] p-6 space-y-4"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,.12)' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40">
                <AlertTriangle size={20} strokeWidth={1.5} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1D1D1F] dark:text-[#FAFAFA]">
                  Delete forever
                </h3>
                <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">This cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-[#52525B] dark:text-[#A1A1AA]">
              All your facts, alerts, and activity will be permanently deleted. Type{' '}
              <code className="font-mono font-semibold text-[#1D1D1F] dark:text-[#FAFAFA]">DELETE</code> to confirm.
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              autoFocus
              className="w-full h-10 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] bg-white dark:bg-[#18181B] text-[#1D1D1F] dark:text-[#FAFAFA] placeholder:text-[#A1A1AA] text-sm px-3.5 outline-none focus:ring-2 focus:ring-red-500"
            />

            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleDelete}
                disabled={confirmText !== 'DELETE' || isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] bg-red-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {isPending ? 'Deleting…' : 'Delete forever — this cannot be undone'}
              </button>
              <button
                onClick={() => { setShowDeleteDialog(false); setConfirmText(''); setDeleteError(null) }}
                disabled={isPending}
                className="px-4 py-2.5 rounded-[10px] border border-[#E4E4E7] dark:border-[#27272A] text-sm text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F5F5F7] dark:hover:bg-[#27272A] transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
