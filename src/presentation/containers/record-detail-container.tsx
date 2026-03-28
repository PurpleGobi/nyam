'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, MoreHorizontal, Edit2, Trash2, Share2 } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useRecordDetail } from '@/application/hooks/use-record-detail'
import { recordRepo, restaurantRepo, wineRepo, xpRepo, wishlistRepo } from '@/shared/di/container'
import { getGaugeColor } from '@/shared/utils/gauge-color'
import { MiniQuadrant } from '@/presentation/components/record/mini-quadrant'
import { AromaDisplay } from '@/presentation/components/record/aroma-display'
import { PhotoGallery } from '@/presentation/components/record/photo-gallery'
import { PairingDisplay } from '@/presentation/components/record/pairing-display'
import { RecordPracticalInfo } from '@/presentation/components/record/record-practical-info'
import { XpEarnedSection } from '@/presentation/components/record/xp-earned-section'
import { RecordActions } from '@/presentation/components/record/record-actions'
import { DeleteConfirmModal } from '@/presentation/components/record/delete-confirm-modal'
import { ShareToBubbleSheet } from '@/presentation/components/share/share-to-bubble-sheet'
import { Toast } from '@/presentation/components/ui/toast'
import { useShareRecord } from '@/application/hooks/use-share-record'
import type { PairingCategory } from '@/domain/entities/record'

/** YYYY-MM-DD → YYYY.MM.DD */
function formatDate(iso: string): string {
  return iso.split('T')[0].replace(/-/g, '.')
}

/** 상황 태그 → 색상 매핑 (RATING_ENGINE §7) */
const SCENE_COLORS: Record<string, string> = {
  solo: '#7A9BAE',
  romantic: '#B8879B',
  friends: '#7EAE8B',
  family: '#C9A96E',
  business: '#8B7396',
  drinks: '#B87272',
}

interface RecordDetailContainerProps {
  recordId: string
}

export function RecordDetailContainer({ recordId }: RecordDetailContainerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const {
    record, photos, targetInfo, linkedItem, otherRecords, xpEarned,
    isLoading, error, isDeleting, deleteError, deleteRecord,
  } = useRecordDetail(recordId, user?.id ?? null, { recordRepo, restaurantRepo, wineRepo, xpRepo, wishlistRepo })

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showShareSheet, setShowShareSheet] = useState(false)

  const { availableBubbles, shareToBubbles, canShare, blockReason } = useShareRecord(user?.id ?? null, recordId)
  const [isScrolled, setIsScrolled] = useState(false)
  const [privacyToast, setPrivacyToast] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 스크롤 시 헤더 glassmorphism
  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 60)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [showDropdown])

  const handleEdit = useCallback(() => {
    if (!record) return
    setShowDropdown(false)
    const name = encodeURIComponent(targetInfo?.name ?? '')
    const meta = encodeURIComponent(targetInfo?.subText ?? '')
    router.push(`/record?type=${record.targetType}&targetId=${record.targetId}&name=${name}&meta=${meta}&edit=${record.id}&from=record_detail`)
  }, [record, router, targetInfo])

  const handleDelete = useCallback(async () => {
    const success = await deleteRecord()
    if (success) router.back()
  }, [deleteRecord, router])

  const navigateToTarget = useCallback(() => {
    if (!targetInfo) return
    router.push(`/${targetInfo.targetType === 'restaurant' ? 'restaurants' : 'wines'}/${targetInfo.id}?from=record`)
  }, [targetInfo, router])

  const navigateToLinkedItem = useCallback((id: string, type: 'restaurant' | 'wine') => {
    router.push(`/${type === 'restaurant' ? 'restaurants' : 'wines'}/${id}?from=record`)
  }, [router])

  if (isLoading || !record) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4">
        <p style={{ fontSize: '15px', color: 'var(--text-sub)' }}>{error}</p>
        <button type="button" onClick={() => router.back()} style={{ fontSize: '14px', color: 'var(--accent-food)' }}>
          뒤로 가기
        </button>
      </div>
    )
  }

  const isRestaurant = record.targetType === 'restaurant'
  const isWine = record.targetType === 'wine'
  const accentColor = isRestaurant ? 'var(--accent-food)' : 'var(--accent-wine)'

  // 사분면: currentDot + refDots
  const hasQuadrant = record.axisX !== null && record.axisY !== null
  const currentDot = hasQuadrant
    ? { axisX: record.axisX!, axisY: record.axisY!, satisfaction: record.satisfaction ?? 50 }
    : null
  const refDots = otherRecords
    .filter((r) => r.axisX !== null && r.axisY !== null)
    .map((r) => ({ axisX: r.axisX!, axisY: r.axisY!, satisfaction: r.satisfaction ?? 50 }))

  return (
    <div className="content-detail flex min-h-dvh flex-col bg-[var(--bg)]">
      {/* 고정 헤더 — glassmorphism */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-4"
        style={{
          height: '44px',
          backgroundColor: isScrolled ? 'rgba(248,246,243,0.55)' : 'var(--bg)',
          backdropFilter: isScrolled ? 'blur(20px)' : undefined,
          WebkitBackdropFilter: isScrolled ? 'blur(20px)' : undefined,
          transition: 'background-color 200ms ease',
        }}
      >
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>

        {/* 스크롤 시 대상명 표시 */}
        {isScrolled && targetInfo && (
          <span
            className="truncate px-2"
            style={{ fontSize: '15px', fontWeight: 700, color: accentColor, maxWidth: '200px' }}
          >
            {targetInfo.name}
          </span>
        )}
        {!isScrolled && <div />}

        {/* 더보기 드롭다운 */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex h-11 w-11 items-center justify-center"
          >
            <MoreHorizontal size={22} style={{ color: 'var(--text)' }} />
          </button>
          {showDropdown && (
            <div
              className="absolute right-0 top-11 z-50 w-40 rounded-xl py-1"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              <button
                type="button"
                onClick={handleEdit}
                className="flex w-full items-center gap-2 px-4 py-2.5"
                style={{ fontSize: '14px', color: 'var(--text)' }}
              >
                <Edit2 size={16} /> 수정
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDropdown(false)
                  if (!canShare) {
                    setPrivacyToast(true)
                  } else {
                    setShowShareSheet(true)
                  }
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5"
                style={{ fontSize: '14px', color: 'var(--text)' }}
              >
                <Share2 size={16} /> 버블에 공유
              </button>
              <button
                type="button"
                onClick={() => { setShowDropdown(false); setShowDeleteConfirm(true) }}
                className="flex w-full items-center gap-2 px-4 py-2.5"
                style={{ fontSize: '14px', color: 'var(--negative)' }}
              >
                <Trash2 size={16} /> 삭제
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="flex flex-col gap-6 px-4 py-4">
        {/* 대상명 + 방문 정보 */}
        <section>
          <button type="button" onClick={navigateToTarget}>
            <h2
              style={{
                fontSize: '21px',
                fontWeight: 800,
                color: isWine ? 'var(--accent-wine)' : 'var(--text)',
              }}
            >
              {targetInfo?.name ?? ''}
            </h2>
            {targetInfo?.subText && (
              <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '2px' }}>
                {targetInfo.subText}
              </p>
            )}
          </button>
          <div className="mt-1 flex items-center gap-2">
            <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
              {formatDate(record.visitDate ?? record.createdAt)}
            </span>
            {record.scene && (
              <span
                className="rounded-full px-2 py-0.5"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  backgroundColor: SCENE_COLORS[record.scene] ?? 'var(--text-hint)',
                }}
              >
                {record.scene}
              </span>
            )}
          </div>
        </section>

        {/* §1: Mini Quadrant */}
        <section>
          <MiniQuadrant
            currentDot={currentDot}
            refDots={refDots}
            targetType={record.targetType}
            onTap={navigateToTarget}
            onEdit={handleEdit}
          />
        </section>

        {/* §2: Satisfaction — 설계: 2.5rem 숫자 + 4px 게이지 바 */}
        {record.satisfaction !== null && (
          <section>
            <span
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: getGaugeColor(record.satisfaction),
                lineHeight: 1.2,
                display: 'block',
              }}
            >
              {record.satisfaction}
            </span>
            <div
              className="mt-2"
              style={{
                height: '4px',
                borderRadius: '2px',
                backgroundColor: 'var(--bg-elevated)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${record.satisfaction}%`,
                  height: '100%',
                  borderRadius: '2px',
                  backgroundColor: getGaugeColor(record.satisfaction),
                  transition: 'width 0.3s ease-out',
                }}
              />
            </div>
          </section>
        )}

        {/* §3: Aroma (wine only) — 설계: aromaRegions 있을 때만 */}
        {isWine && record.aromaRegions && (
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
            <p style={{ fontSize: '1rem', color: 'var(--text-sub)', fontStyle: 'italic', lineHeight: 1.6 }}>
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

        {/* §7: Menu Tags / Tips (restaurant only) */}
        {isRestaurant && (record.menuTags?.length || record.tips) && (
          <section>
            {record.menuTags && record.menuTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {record.menuTags.map((tag) => (
                  <span key={tag} className="rounded-full px-3 py-1" style={{ fontSize: '12px', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-sub)' }}>{tag}</span>
                ))}
              </div>
            )}
            {record.tips && (
              <p className="mt-2" style={{ fontSize: '0.875rem', color: 'var(--text-sub)' }}>{record.tips}</p>
            )}
          </section>
        )}

        {/* §8: Practical Info */}
        <section>
          <h3 className="mb-2" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>정보</h3>
          <RecordPracticalInfo
            targetType={record.targetType}
            totalPrice={record.totalPrice}
            purchasePrice={record.purchasePrice}
            companions={record.companions}
            visitDate={record.visitDate}
            createdAt={record.createdAt}
            linkedItem={linkedItem}
            onLinkedItemTap={navigateToLinkedItem}
          />
        </section>

        {/* §9: XP Earned */}
        {xpEarned.length > 0 && (
          <section>
            <XpEarnedSection items={xpEarned} />
          </section>
        )}

        {/* §10: Actions */}
        <section>
          <RecordActions onEdit={handleEdit} onDelete={() => setShowDeleteConfirm(true)} onShare={() => setShowShareSheet(true)} />
        </section>

        {/* h-20 spacer */}
        <div className="h-20" />
      </div>

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ShareToBubbleSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        bubbles={availableBubbles}
        onShareMultiple={shareToBubbles}
      />

      <Toast
        message={blockReason ?? '비공개 프로필은 공유할 수 없습니다'}
        visible={privacyToast}
        onHide={() => setPrivacyToast(false)}
      />

      {/* 삭제 실패 시 에러 토스트 */}
      {deleteError && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2.5"
          style={{ backgroundColor: 'var(--negative)', color: '#FFFFFF', fontSize: '13px', fontWeight: 600 }}
        >
          {deleteError}
        </div>
      )}
    </div>
  )
}
