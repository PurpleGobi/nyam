'use client'

import { Copy, RefreshCw, Share2 } from 'lucide-react'
import type { InviteExpiry } from '@/application/hooks/use-invite-link'

interface InviteLinkGeneratorProps {
  bubbleId: string
  inviteCode: string | null
  inviteExpiresAt: string | null
  onGenerate: (expiry: InviteExpiry) => void
  onCopy: (code: string) => void
  isLoading: boolean
}

const EXPIRY_OPTIONS: { value: InviteExpiry; label: string }[] = [
  { value: '1d', label: '1일' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'unlimited', label: '무제한' },
]

function formatExpiryDate(expiresAt: string | null): string {
  if (!expiresAt) return '만료 없음'
  const date = new Date(expiresAt)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function InviteLinkGenerator({
  inviteCode,
  inviteExpiresAt,
  onGenerate,
  onCopy,
  isLoading,
}: InviteLinkGeneratorProps) {
  const fullUrl = inviteCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/bubbles/invite/${inviteCode}`
    : ''

  const handleShare = async () => {
    if (!fullUrl) return
    try {
      await navigator.share({ title: '버블 초대', url: fullUrl })
    } catch {
      // share dialog dismissed
    }
  }

  return (
    <div className="card flex flex-col gap-3 rounded-xl p-4">
      <span className="text-[13px] font-semibold text-[var(--text)]">초대 링크</span>

      {inviteCode ? (
        <>
          {/* URL 표시 */}
          <div
            className="truncate rounded-lg px-3 py-2.5 text-[12px] font-mono text-[var(--text)]"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            {fullUrl}
          </div>

          {/* 3 버튼 행: 복사 / 공유 / 새로 만들기 */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCopy(inviteCode)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[12px] font-semibold"
              style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
            >
              <Copy size={14} />
              복사
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[12px] font-semibold"
              style={{ backgroundColor: 'var(--bg)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
            >
              <Share2 size={14} />
              공유
            </button>
            <button
              type="button"
              onClick={() => onGenerate('30d')}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[12px] font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              새로 만들기
            </button>
          </div>

          {/* 만료 정보 */}
          <p className="text-[11px] text-[var(--text-hint)]">
            만료: {inviteExpiresAt ? formatExpiryDate(inviteExpiresAt) : '무제한'}
          </p>
        </>
      ) : (
        <>
          {/* 만료 옵션 선택 + 생성 */}
          <div className="flex gap-2">
            {EXPIRY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onGenerate(value)}
                disabled={isLoading}
                className="flex-1 rounded-lg py-2.5 text-center text-[12px] font-semibold transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[var(--text-hint)]">만료 기간을 선택하여 초대 링크를 생성하세요</p>
        </>
      )}
    </div>
  )
}
