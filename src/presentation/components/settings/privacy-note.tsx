'use client'

const PRIVACY_NOTES = [
  '동반자 정보는 항상 비공개입니다 (나만 열람)',
  'OFF로 설정해도 나에게는 항상 표시됩니다',
  '버블 owner의 공개수위가 더 제한적이면 버블 설정 우선',
  '추천 알고리즘에는 설정과 무관하게 항상 반영됩니다',
]

export function PrivacyNote() {
  return (
    <div style={{ padding: '0 4px', fontSize: '11px', color: 'var(--text-hint)', lineHeight: 1.6 }}>
      {PRIVACY_NOTES.map((note) => (
        <div key={note}>· {note}</div>
      ))}
    </div>
  )
}
