'use client'

import { useRouter } from 'next/navigation'
import { UtensilsCrossed, Wine, Heart, MessageCircle } from 'lucide-react'

/** 출처 태그 타입 */
export type SourceType = 'me' | 'bubble' | 'web'

export interface SourceInfo {
  type: SourceType
  label: string
  detail: string
}

export interface RecordCardProps {
  id: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string
  photoUrl: string | null
  satisfaction: number | null
  /** 미니사분면 좌표 (0~100 비율) */
  quadX?: number | null
  quadY?: number | null
  /** 출처 정보 */
  sources?: SourceInfo[]
  /** 배지 (블루리본, 미슐랭 등) */
  badges?: string[]
  /** 참여 수치 */
  likeCount?: number
  commentCount?: number
  comment: string | null
  visitDate: string | null
}

const SOURCE_TAG_STYLES: Record<SourceType, { bg: string; color: string }> = {
  me: { bg: 'var(--accent-food-light)', color: 'var(--accent-food)' },
  bubble: { bg: 'rgba(122,155,174,0.15)', color: 'var(--accent-social)' },
  web: { bg: 'var(--bg-page)', color: 'var(--text-hint)' },
}

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  '블루리본': { bg: 'rgba(59,130,246,0.9)', color: '#fff' },
  '미슐랭 ★': { bg: 'rgba(220,50,50,0.9)', color: '#fff' },
}

function MiniQuadrant({ x, y, accentColor }: { x: number; y: number; accentColor: string }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-[10px]"
      style={{
        width: '44px',
        height: '44px',
        backgroundColor: 'var(--bg-page)',
        border: '1px solid var(--border)',
      }}
    >
      {/* crosshair */}
      <span className="absolute left-1 right-1 top-1/2 h-px" style={{ backgroundColor: 'var(--border)' }} />
      <span className="absolute bottom-1 left-1/2 top-1 w-px" style={{ backgroundColor: 'var(--border)' }} />
      {/* dot */}
      <span
        className="absolute rounded-full"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: '14px',
          height: '14px',
          backgroundColor: accentColor,
          transform: 'translate(-50%, -50%)',
          border: '1.5px solid rgba(255,255,255,0.8)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  )
}

function SourceTag({ type, label }: { type: SourceType; label: string }) {
  const style = SOURCE_TAG_STYLES[type]
  return (
    <span
      className="shrink-0 rounded text-[9px] font-extrabold uppercase"
      style={{
        padding: '1px 5px',
        backgroundColor: style.bg,
        color: style.color,
        letterSpacing: '0.3px',
      }}
    >
      {label}
    </span>
  )
}

export function RecordCard({
  targetId,
  targetType,
  name,
  meta,
  photoUrl,
  satisfaction,
  quadX,
  quadY,
  sources,
  badges,
  likeCount,
  commentCount,
}: RecordCardProps) {
  const router = useRouter()
  const isFood = targetType === 'restaurant'
  const accentColor = isFood ? 'var(--accent-food)' : 'var(--accent-wine)'
  const hasQuadrant = quadX != null && quadY != null
  const isMine = sources?.some((s) => s.type === 'me')

  return (
    <button
      type="button"
      onClick={() => router.push(`/${isFood ? 'restaurants' : 'wines'}/${targetId}`)}
      className="flex w-full overflow-hidden rounded-2xl text-left"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        minHeight: '190px',
      }}
    >
      {/* 사진 46% */}
      <div className="relative w-[46%] shrink-0" style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
            {isFood ? (
              <UtensilsCrossed size={28} style={{ color: 'var(--text-hint)' }} />
            ) : (
              <Wine size={28} style={{ color: 'var(--text-hint)' }} />
            )}
          </div>
        )}
        {/* 사진 위 그라디언트 */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 60%, rgba(0,0,0,0.04) 100%)' }} />
        {/* 배지 */}
        {badges && badges.length > 0 && (
          <div className="absolute left-2 top-2 z-[2] flex flex-col gap-1">
            {badges.map((badge) => {
              const bs = BADGE_STYLES[badge] ?? { bg: 'rgba(0,0,0,0.75)', color: '#fff' }
              return (
                <span
                  key={badge}
                  className="w-fit rounded-md text-[10px] font-bold"
                  style={{ padding: '3px 8px', backgroundColor: bs.bg, color: bs.color, backdropFilter: 'blur(8px)' }}
                >
                  {badge}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* 정보 54% */}
      <div className="flex flex-1 flex-col p-3.5" style={{ minWidth: 0 }}>
        {/* 이름 + 메타 */}
        <p className="truncate text-[16px] font-bold" style={{ color: 'var(--text)' }}>{name}</p>
        <p className="mb-2.5 text-[12px]" style={{ color: 'var(--text-sub)' }}>{meta}</p>

        {/* 점수 + 미니사분면 */}
        <div className="mb-2.5 flex items-center gap-2.5">
          {hasQuadrant && <MiniQuadrant x={quadX} y={quadY} accentColor={accentColor} />}
          {satisfaction != null && (
            <span
              className="text-[32px] font-extrabold leading-none"
              style={{ color: isMine !== false ? accentColor : 'var(--text-hint)' }}
            >
              {satisfaction}
            </span>
          )}
        </div>

        {/* 출처 태그들 */}
        {sources && sources.length > 0 && (
          <div className="flex flex-1 flex-col gap-1">
            {sources.map((src, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-sub)' }}>
                <SourceTag type={src.type} label={src.type === 'me' ? '나' : src.type === 'bubble' ? '버블' : '웹'} />
                <span className="min-w-0 flex-1 truncate">{src.detail}</span>
              </div>
            ))}
          </div>
        )}

        {/* 좋아요 / 댓글 */}
        {(likeCount != null || commentCount != null) && (
          <div className="mt-auto flex items-center gap-2.5 pt-1.5 text-[11px]" style={{ color: 'var(--text-hint)' }}>
            {likeCount != null && (
              <span className="flex items-center gap-1">
                <Heart size={12} /> {likeCount}
              </span>
            )}
            {commentCount != null && (
              <span className="flex items-center gap-1">
                <MessageCircle size={12} /> {commentCount}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
