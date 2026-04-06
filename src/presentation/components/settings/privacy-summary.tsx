'use client'

import type { FollowPolicy } from '@/domain/entities/settings'

interface PrivacySummaryProps {
  isPublic: boolean
  followPolicy: FollowPolicy
}

const SUMMARY_MAP: Record<string, string> = {
  'true': '모든 사용자가 내 프로필과 기록을 볼 수 있습니다. 누구나 자유롭게 팔로우할 수 있습니다.',
  'false|blocked': '프로필과 기록이 나에게만 보입니다. 팔로우가 차단되어 있습니다. 버블 공유는 가능합니다.',
  'false|auto_approve': '프로필과 기록이 비공개입니다. 팔로우 요청은 자동으로 승인됩니다.',
  'false|manual_approve': '프로필과 기록이 비공개입니다. 팔로우 요청을 직접 승인해야 합니다.',
  'false|conditional': '프로필과 기록이 비공개입니다. 조건을 충족하는 유저만 자동 승인, 나머지는 승인제입니다.',
}

export function PrivacySummary({ isPublic, followPolicy }: PrivacySummaryProps) {
  const key = isPublic ? 'true' : `false|${followPolicy}`
  const text = SUMMARY_MAP[key] ?? ''

  return (
    <div
      style={{
        marginTop: '12px',
        padding: '10px 12px',
        background: 'var(--bg)',
        borderRadius: '8px',
        fontSize: '12px',
        color: 'var(--text-sub)',
        lineHeight: 1.5,
      }}
    >
      {text}
    </div>
  )
}
