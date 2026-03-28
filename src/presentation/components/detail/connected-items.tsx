'use client'

import { UtensilsCrossed, Wine } from 'lucide-react'

interface ConnectedItemCard {
  id: string
  name: string
  imageUrl: string | null
  score: number | null
  subText: string
}

interface ConnectedItemsProps {
  sectionTitle: string       // '연결된 와인' | '함께한 레스토랑'
  sectionMeta: string        // '같이 즐긴 와인' | ''
  items: ConnectedItemCard[]
  targetType: 'wine' | 'restaurant'
  onItemTap: (id: string) => void
}

export type { ConnectedItemCard }

export function ConnectedItems({
  sectionTitle,
  sectionMeta,
  items,
  targetType,
  onItemTap,
}: ConnectedItemsProps) {
  if (items.length === 0) return null

  return (
    <section style={{ padding: '16px 20px' }}>
      {/* 섹션 헤더 */}
      <div className="mb-3.5 flex items-center justify-between">
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          {sectionTitle}
        </span>
        {sectionMeta && (
          <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
            {sectionMeta}
          </span>
        )}
      </div>

      {/* 가로 스크롤 */}
      <div className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {items.map((item) =>
          targetType === 'wine' ? (
            <WineCard key={item.id} item={item} onTap={onItemTap} />
          ) : (
            <RestaurantCard key={item.id} item={item} onTap={onItemTap} />
          ),
        )}
      </div>
    </section>
  )
}

/** 식당→와인 카드 (130px, 와인 전용 스타일) */
function WineCard({ item, onTap }: { item: ConnectedItemCard; onTap: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onTap(item.id)}
      className="flex shrink-0 flex-col overflow-hidden rounded-xl"
      style={{
        width: '130px',
        backgroundColor: 'var(--accent-wine-light)',
        border: '1px solid #DDD6E3',
        padding: '10px',
      }}
    >
      {/* 와인 라벨 영역 */}
      <div
        className="flex w-full items-center justify-center rounded-md"
        style={{
          height: '56px',
          background: item.imageUrl
            ? `url(${item.imageUrl}) center/cover`
            : 'linear-gradient(135deg, #C4A8D4 0%, #8B6AA0 100%)',
        }}
      >
        {!item.imageUrl && <Wine size={20} color="#FFFFFF" />}
      </div>

      {/* 와인명 */}
      <p
        className="mt-1.5 line-clamp-2 text-left"
        style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-wine)', lineHeight: '1.3' }}
      >
        {item.name}
      </p>

      {/* 점수 */}
      {item.score !== null && (
        <p className="mt-0.5 text-left" style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
          만족도 <span style={{ fontWeight: 700, color: 'var(--accent-wine)' }}>{item.score}</span>
        </p>
      )}
    </button>
  )
}

/** 와인→식당 카드 (130px, 식당 전용 스타일) */
function RestaurantCard({ item, onTap }: { item: ConnectedItemCard; onTap: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onTap(item.id)}
      className="flex shrink-0 flex-col overflow-hidden rounded-xl"
      style={{
        width: '130px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        padding: '10px',
      }}
    >
      {/* 식당 이미지 영역 */}
      <div
        className="flex w-full items-center justify-center rounded-md"
        style={{
          height: '60px',
          background: item.imageUrl
            ? `url(${item.imageUrl}) center/cover`
            : 'color-mix(in srgb, var(--accent-food) 10%, transparent)',
        }}
      >
        {!item.imageUrl && <UtensilsCrossed size={20} style={{ color: 'var(--accent-food)' }} />}
      </div>

      <p
        className="mt-1.5 line-clamp-2 text-left"
        style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', lineHeight: '1.3' }}
      >
        {item.name}
      </p>

      {item.subText && (
        <p className="mt-0.5 truncate text-left" style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
          {item.subText}
        </p>
      )}

      {item.score !== null && (
        <p className="mt-0.5 text-left" style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
          만족도 <span style={{ fontWeight: 700, color: 'var(--accent-food)' }}>{item.score}</span>
        </p>
      )}
    </button>
  )
}
