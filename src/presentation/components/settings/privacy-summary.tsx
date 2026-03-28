'use client'

import type { PrivacyProfile, PrivacyRecords } from '@/domain/entities/settings'

interface PrivacySummaryProps {
  privacyProfile: PrivacyProfile
  privacyRecords: PrivacyRecords
}

const SUMMARY_MAP: Record<string, string> = {
  'public|shared_only': '모든 사용자가 프로필을 볼 수 있습니다. 버블에 공유한 기록만 해당 버블에서 보입니다.',
  'public|all': '모든 사용자가 프로필을 볼 수 있습니다. 내 모든 기록이 공개됩니다.',
  'bubble_only|shared_only': '같은 버블 멤버만 프로필을 볼 수 있고, 내가 공유한 기록만 해당 버블에서 보입니다.',
  'bubble_only|all': '같은 버블 멤버만 프로필을 볼 수 있고, 내 모든 기록을 볼 수 있습니다.',
  'private|shared_only': '프로필과 기록이 나에게만 보입니다. 버블 공유도 불가합니다. 추천 알고리즘에는 여전히 반영됩니다.',
  'private|all': '프로필과 기록이 나에게만 보입니다. 버블 공유도 불가합니다. 추천 알고리즘에는 여전히 반영됩니다.',
}

export function PrivacySummary({ privacyProfile, privacyRecords }: PrivacySummaryProps) {
  const key = `${privacyProfile}|${privacyRecords}`
  const text = SUMMARY_MAP[key] ?? ''

  return (
    <div className="px-4 py-2.5">
      <p style={{ fontSize: '12px', color: 'var(--text-hint)', lineHeight: 1.5 }}>
        {text}
      </p>
    </div>
  )
}
