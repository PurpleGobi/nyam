'use client'

import { DollarSign, Users, Calendar, Wine, UtensilsCrossed } from 'lucide-react'
import type { LinkedTarget } from '@/application/hooks/use-record-detail'

interface RecordPracticalInfoProps {
  targetType: 'restaurant' | 'wine'
  totalPrice: number | null
  purchasePrice: number | null
  companions: string[] | null
  visitDate: string | null
  createdAt: string
  linkedItem: LinkedTarget | null
  onLinkedItemTap: (id: string, type: 'restaurant' | 'wine') => void
}

export function RecordPracticalInfo({
  targetType,
  totalPrice,
  purchasePrice,
  companions,
  visitDate,
  createdAt,
  linkedItem,
  onLinkedItemTap,
}: RecordPracticalInfoProps) {
  const isRestaurant = targetType === 'restaurant'
  const price = isRestaurant ? totalPrice : purchasePrice

  return (
    <div className="flex flex-col gap-2.5">
      {/* 가격 */}
      <div className="flex items-center gap-2.5">
        <DollarSign size={16} style={{ color: 'var(--text-hint)' }} />
        <span style={{ fontSize: '14px', color: 'var(--text)' }}>
          {price !== null
            ? `₩${price.toLocaleString()} (${isRestaurant ? '1인' : '병'})`
            : '---'}
        </span>
      </div>

      {/* 동반자 (비공개: 본인 기록에서만 표시) */}
      {companions && companions.length > 0 && (
        <div className="flex items-center gap-2.5">
          <Users size={16} style={{ color: 'var(--text-hint)' }} />
          <span style={{ fontSize: '14px', color: 'var(--text)' }}>
            {companions.join(', ')}
          </span>
        </div>
      )}

      {/* 방문일 */}
      <div className="flex items-center gap-2.5">
        <Calendar size={16} style={{ color: 'var(--text-hint)' }} />
        <span style={{ fontSize: '14px', color: 'var(--text)' }}>
          {(visitDate ?? createdAt.split('T')[0]).replace(/-/g, '.')}
        </span>
      </div>

      {/* 연결 아이템 */}
      {linkedItem && (
        <button
          type="button"
          onClick={() => onLinkedItemTap(linkedItem.id, linkedItem.targetType)}
          className="flex items-center gap-2.5"
        >
          {linkedItem.targetType === 'wine' ? (
            <Wine size={16} style={{ color: 'var(--accent-wine)' }} />
          ) : (
            <UtensilsCrossed size={16} style={{ color: 'var(--accent-food)' }} />
          )}
          <span
            style={{
              fontSize: '14px',
              color: linkedItem.targetType === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)',
              textDecoration: 'underline',
            }}
          >
            {linkedItem.name}
          </span>
        </button>
      )}
    </div>
  )
}
