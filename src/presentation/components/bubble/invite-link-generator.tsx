'use client'

import { Copy, RefreshCw } from 'lucide-react'

interface InviteLinkGeneratorProps {
  inviteCode: string | null
  onGenerate: () => void
  isLoading: boolean
}

export function InviteLinkGenerator({ inviteCode, onGenerate, isLoading }: InviteLinkGeneratorProps) {
  const handleCopy = async () => {
    if (!inviteCode) return
    const url = `${window.location.origin}/bubbles/invite/${inviteCode}`
    await navigator.clipboard.writeText(url)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <span className="text-[13px] font-semibold text-[var(--text)]">초대 링크</span>

      {inviteCode ? (
        <div className="flex items-center gap-2">
          <div
            className="flex-1 truncate rounded-lg px-3 py-2.5 text-[13px] font-mono text-[var(--text)]"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            {inviteCode}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="rounded-xl py-2.5 text-center text-[13px] font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent-social)' }}
        >
          {isLoading ? '생성 중...' : '초대 링크 생성'}
        </button>
      )}

      <p className="text-[11px] text-[var(--text-hint)]">링크는 7일 후 만료됩니다</p>
    </div>
  )
}
