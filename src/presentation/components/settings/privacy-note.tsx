'use client'

import { Info } from 'lucide-react'

const PRIVACY_NOTES = [
  '동반자 정보는 항상 비공개입니다 (나만 열람)',
  'OFF로 설정해도 나에게는 항상 표시됩니다',
  '버블 owner의 공개수위가 더 제한적이면 버블 설정 우선',
  '추천 알고리즘에는 설정과 무관하게 항상 반영됩니다',
]

export function PrivacyNote() {
  return (
    <div className="px-4 py-3">
      <div
        className="flex gap-2.5 rounded-lg px-3 py-2.5"
        style={{ backgroundColor: 'color-mix(in srgb, var(--accent-social) 8%, transparent)' }}
      >
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-social)' }} />
        <ul className="flex flex-col gap-1">
          {PRIVACY_NOTES.map((note) => (
            <li key={note} style={{ fontSize: '11px', color: 'var(--text-hint)', lineHeight: 1.5 }}>
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
