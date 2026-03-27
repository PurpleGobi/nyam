'use client'

import { DollarSign, Users, Calendar, Wine, UtensilsCrossed } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { DiningRecord } from '@/domain/entities/record'

interface RecordPracticalInfoProps {
  record: DiningRecord
  linkedItemName?: string | null
}

export function RecordPracticalInfo({ record, linkedItemName }: RecordPracticalInfoProps) {
  const router = useRouter()
  const isRestaurant = record.targetType === 'restaurant'
  const price = record.totalPrice ?? record.purchasePrice

  return (
    <div className="flex flex-col gap-2.5">
      {/* 가격 */}
      {price !== null && (
        <div className="flex items-center gap-2.5">
          <DollarSign size={16} style={{ color: 'var(--text-hint)' }} />
          <span style={{ fontSize: '14px', color: 'var(--text)' }}>
            ₩{price.toLocaleString()} ({isRestaurant ? '1인' : '병'})
          </span>
        </div>
      )}

      {/* 동행자 */}
      {record.companions && record.companions.length > 0 && (
        <div className="flex items-center gap-2.5">
          <Users size={16} style={{ color: 'var(--text-hint)' }} />
          <span style={{ fontSize: '14px', color: 'var(--text)' }}>
            {record.companions.join(', ')}
          </span>
        </div>
      )}

      {/* 방문일 */}
      <div className="flex items-center gap-2.5">
        <Calendar size={16} style={{ color: 'var(--text-hint)' }} />
        <span style={{ fontSize: '14px', color: 'var(--text)' }}>
          {record.visitDate ?? record.createdAt.split('T')[0]}
        </span>
      </div>

      {/* 연결 아이템 */}
      {isRestaurant && record.linkedWineId && linkedItemName && (
        <button
          type="button"
          onClick={() => router.push(`/wines/${record.linkedWineId}`)}
          className="flex items-center gap-2.5"
        >
          <Wine size={16} style={{ color: 'var(--accent-wine)' }} />
          <span style={{ fontSize: '14px', color: 'var(--accent-wine)', textDecoration: 'underline' }}>
            {linkedItemName}
          </span>
        </button>
      )}
      {!isRestaurant && record.linkedRestaurantId && linkedItemName && (
        <button
          type="button"
          onClick={() => router.push(`/restaurants/${record.linkedRestaurantId}`)}
          className="flex items-center gap-2.5"
        >
          <UtensilsCrossed size={16} style={{ color: 'var(--accent-food)' }} />
          <span style={{ fontSize: '14px', color: 'var(--accent-food)', textDecoration: 'underline' }}>
            {linkedItemName}
          </span>
        </button>
      )}
    </div>
  )
}
