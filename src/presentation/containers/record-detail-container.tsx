'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useRecordDetail } from '@/application/hooks/use-record-detail'
import { getGaugeColor } from '@/shared/utils/gauge-color'
import { SatisfactionGauge } from '@/presentation/components/record/satisfaction-gauge'
import { MiniQuadrant } from '@/presentation/components/record/mini-quadrant'
import { AromaDisplay } from '@/presentation/components/record/aroma-display'
import { PhotoGallery } from '@/presentation/components/record/photo-gallery'
import { PairingDisplay } from '@/presentation/components/record/pairing-display'
import { RecordPracticalInfo } from '@/presentation/components/record/record-practical-info'
import { RecordActions } from '@/presentation/components/record/record-actions'
import { DeleteConfirmModal } from '@/presentation/components/record/delete-confirm-modal'
import type { PairingCategory } from '@/domain/entities/record'

interface RecordDetailContainerProps {
  recordId: string
}

export function RecordDetailContainer({ recordId }: RecordDetailContainerProps) {
  const router = useRouter()
  const { record, photos, isLoading, isDeleting, deleteRecord } = useRecordDetail(recordId)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleEdit = useCallback(() => {
    if (!record) return
    router.push(`/record?type=${record.targetType}&targetId=${record.targetId}&edit=${record.id}&from=record_detail`)
  }, [record, router])

  const handleDelete = useCallback(async () => {
    const success = await deleteRecord()
    if (success) router.back()
  }, [deleteRecord, router])

  if (isLoading || !record) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  const isRestaurant = record.targetType === 'restaurant'
  const isWine = record.targetType === 'wine'
  const accentColor = isRestaurant ? 'var(--accent-food)' : 'var(--accent-wine)'

  const quadrantDots = [
    { x: record.axisX ?? 50, y: record.axisY ?? 50, satisfaction: record.satisfaction ?? 50, isCurrent: true },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4" style={{ height: '44px' }}>
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <span style={{ fontSize: '15px', fontWeight: 700, color: accentColor }}>기록 상세</span>
        <div className="w-11" />
      </nav>

      <div className="flex flex-col gap-6 px-4 py-4">
        {/* §1: Mini Quadrant */}
        <section>
          <MiniQuadrant
            dots={quadrantDots}
            type={record.targetType}
            onTap={() => router.push(`/${isRestaurant ? 'restaurants' : 'wines'}/${record.targetId}`)}
          />
        </section>

        {/* §2: Satisfaction */}
        {record.satisfaction !== null && (
          <section>
            <div className="mb-2 flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: getGaugeColor(record.satisfaction) }}
              >
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>{record.satisfaction}</span>
              </div>
              <span style={{ fontSize: '14px', color: 'var(--text-sub)' }}>만족도</span>
            </div>
            <SatisfactionGauge value={record.satisfaction} />
          </section>
        )}

        {/* §3: Aroma (wine only) */}
        {isWine && record.aromaLabels && record.aromaLabels.length > 0 && (
          <section>
            <h3 className="mb-2" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>향</h3>
            <AromaDisplay
              aromaRegions={record.aromaRegions}
              aromaLabels={record.aromaLabels}
              complexity={record.complexity}
              finish={record.finish}
              balance={record.balance}
            />
          </section>
        )}

        {/* §4: Comment */}
        {record.comment && (
          <section
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p style={{ fontSize: '14px', color: 'var(--text-sub)', fontStyle: 'italic', lineHeight: 1.6 }}>
              {record.comment}
            </p>
          </section>
        )}

        {/* §5: Photos */}
        {photos.length > 0 && (
          <section>
            <h3 className="mb-2" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>사진</h3>
            <PhotoGallery photos={photos} />
          </section>
        )}

        {/* §6: Pairing (wine only) */}
        {isWine && record.pairingCategories && record.pairingCategories.length > 0 && (
          <section>
            <h3 className="mb-2" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>페어링</h3>
            <PairingDisplay categories={record.pairingCategories as PairingCategory[]} />
          </section>
        )}

        {/* §7: Scene + Menu Tags (restaurant only) */}
        {isRestaurant && (record.scene || (record.menuTags && record.menuTags.length > 0)) && (
          <section>
            {record.scene && (
              <div className="mb-2 flex items-center gap-2">
                <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>상황</span>
                <span
                  className="rounded-full px-2.5 py-0.5"
                  style={{ fontSize: '12px', fontWeight: 600, backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  {record.scene}
                </span>
              </div>
            )}
            {record.menuTags && record.menuTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {record.menuTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--bg)] px-3 py-1 text-[12px] text-[var(--text-sub)]">{tag}</span>
                ))}
              </div>
            )}
            {record.tips && (
              <p className="mt-2" style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{record.tips}</p>
            )}
          </section>
        )}

        {/* §8: Practical Info */}
        <section>
          <h3 className="mb-2" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>정보</h3>
          <RecordPracticalInfo record={record} />
        </section>

        {/* §10: Actions */}
        <section className="pb-8">
          <RecordActions onEdit={handleEdit} onDelete={() => setShowDeleteConfirm(true)} />
        </section>
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}
