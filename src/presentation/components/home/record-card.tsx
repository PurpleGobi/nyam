'use client'

import { useRouter } from 'next/navigation'
import { getGaugeColor } from '@/shared/utils/gauge-color'

interface RecordCardProps {
  id: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string
  photoUrl: string | null
  satisfaction: number | null
  comment: string | null
  visitDate: string | null
}

export function RecordCard({ id, targetId, targetType, name, meta, photoUrl, satisfaction, comment, visitDate }: RecordCardProps) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(`/${targetType === 'restaurant' ? 'restaurants' : 'wines'}/${targetId}`)}
      className="flex w-full overflow-hidden rounded-xl text-left"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* 사진 46% */}
      <div className="relative w-[46%] shrink-0" style={{ aspectRatio: '1/1.2' }}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
            <span style={{ fontSize: '24px', color: 'var(--text-hint)' }}>
              {targetType === 'restaurant' ? '🍴' : '🍷'}
            </span>
          </div>
        )}
      </div>

      {/* 정보 54% */}
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <p className="truncate text-[14px] font-semibold text-[var(--text)]">{name}</p>
          <p className="mt-0.5 truncate text-[12px] text-[var(--text-sub)]">{meta}</p>
        </div>

        {satisfaction !== null && (
          <div className="mt-2 flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: getGaugeColor(satisfaction) }}
            >
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF' }}>{satisfaction}</span>
            </div>
            {comment && (
              <p className="line-clamp-2 flex-1 text-[11px] text-[var(--text-sub)]">{comment}</p>
            )}
          </div>
        )}

        {visitDate && (
          <p className="mt-1 text-[10px] text-[var(--text-hint)]">{visitDate}</p>
        )}
      </div>
    </button>
  )
}
