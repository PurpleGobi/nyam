'use client'

import { Share2, X } from 'lucide-react'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  groups: Array<{ id: string; name: string }>
  onShare: (groupId: string) => void
  isSharing: boolean
}

export function ShareModal({ isOpen, onClose, groups, onShare, isSharing }: ShareModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 pb-8 sm:rounded-2xl sm:pb-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-[#FF6038]" />
            <h2 className="text-lg font-semibold text-[var(--color-neutral-800)]">
              버블에 공유
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--color-neutral-400)] transition-colors hover:bg-[var(--color-neutral-100)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Group list */}
        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-neutral-500)]">
            참여 중인 버블이 없습니다
          </p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {groups.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  disabled={isSharing}
                  onClick={() => onShare(group.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-[var(--color-neutral-200)] px-4 py-3 text-left transition-colors hover:border-[#FF6038] hover:bg-[var(--color-neutral-50)] disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-[var(--color-neutral-700)]">
                    {group.name}
                  </span>
                  <span className="text-xs font-medium text-[#FF6038]">
                    {isSharing ? '공유 중...' : '공유'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
