'use client'

import { useState, useCallback, useRef } from 'react'
import { Utensils, Sparkles, X, Lock } from 'lucide-react'
import type { QuadrantReferencePoint } from '@/domain/entities/quadrant'
import type { RestaurantScene } from '@/domain/entities/scene'
import type { RestaurantGenre } from '@/domain/entities/restaurant'
import { ALL_GENRES } from '@/domain/entities/restaurant'
import { QuadrantInput } from '@/presentation/components/record/quadrant-input'
import { PriceLevelSelector } from '@/presentation/components/record/price-level-selector'
import { SceneTagSelector } from '@/presentation/components/record/scene-tag-selector'
import { CompanionInput } from '@/presentation/components/record/companion-input'
import { RecordSaveBar } from '@/presentation/components/record/record-save-bar'
import { LinkSearchSheet } from '@/presentation/components/record/link-search-sheet'
import type { LinkSearchResult } from '@/presentation/components/record/link-search-sheet'
import { todayInTz, detectBrowserTimezone } from '@/shared/utils/date-format'

interface RestaurantTarget {
  id: string
  name: string
  genre?: string
  area?: string
  address?: string
  categoryPath?: string
  distance?: string
  isAiRecognized?: boolean
}

interface CreateRestaurantRecordInput {
  targetId: string
  targetType: 'restaurant'
  genre?: string
  priceRange?: number | null
  axisX?: number | null
  axisY?: number | null
  satisfaction?: number | null
  scene?: string | null
  comment?: string
  companions?: string[]
  companionCount?: number
  privateNote?: string
  menuTags?: string[]
  totalPrice?: number
  visitDate?: string
  linkedWineId?: string
  photoUrls?: string[]
}

interface RestaurantInitialData {
  axisX: number | null
  axisY: number | null
  satisfaction: number | null
  scene: string | null
  comment: string | null
  companions: string[] | null
  privateNote: string | null
  menuTags: string[] | null
  totalPrice: number | null
  visitDate: string | null
}

interface RestaurantRecordFormProps {
  target: RestaurantTarget
  genreHint?: string | null
  referenceRecords?: QuadrantReferencePoint[]
  initialData?: RestaurantInitialData
  saveLabel?: string
  onSave: (data: CreateRestaurantRecordInput) => Promise<void>
  isLoading: boolean
  photoSlot?: React.ReactNode
  recentCompanions?: string[]
  onDelete?: () => void
  isDeleting?: boolean
}

export function RestaurantRecordForm({
  target,
  genreHint,
  referenceRecords,
  initialData,
  saveLabel,
  onSave,
  isLoading,
  photoSlot,
  recentCompanions,
  onDelete,
  isDeleting,
}: RestaurantRecordFormProps) {
  const [selectedGenre, setSelectedGenre] = useState<RestaurantGenre | null>(
    (target.genre as RestaurantGenre) ?? null,
  )

  const suggestedGenres = ALL_GENRES

  const [quadrant, setQuadrant] = useState({
    x: initialData?.axisX ?? 50,
    y: initialData?.axisY ?? 50,
  })
  const [quadrantTouched, setQuadrantTouched] = useState(!!initialData?.axisX)
  const [scene, setScene] = useState<RestaurantScene | null>(
    (initialData?.scene as RestaurantScene) ?? null,
  )
  const [comment, setComment] = useState(initialData?.comment ?? '')
  const [companions, setCompanions] = useState<string[]>(initialData?.companions ?? [])
  const [privateNote, setPrivateNote] = useState(initialData?.privateNote ?? '')
  const [menuTags, setMenuTags] = useState<string[]>(initialData?.menuTags ?? [])
  const [menuTagInput, setMenuTagInput] = useState('')
  const [priceRange, setPriceRange] = useState<number | null>(null)
  const [totalPrice, setTotalPrice] = useState(initialData?.totalPrice ? String(initialData.totalPrice) : '')
  const [visitDate, setVisitDate] = useState(
    initialData?.visitDate ?? todayInTz(detectBrowserTimezone()),
  )
  const [linkedWine, setLinkedWine] = useState<LinkSearchResult | null>(null)
  const [showLinkSheet, setShowLinkSheet] = useState(false)
  const [saveHint, setSaveHint] = useState(false)
  const menuTagInputRef = useRef<HTMLInputElement>(null)
  const quadrantSectionRef = useRef<HTMLElement>(null)

  const isValid = quadrantTouched

  const handleQuadrantChange = useCallback((val: { x: number; y: number }) => {
    setQuadrant(val)
    setQuadrantTouched(true)
    setSaveHint(false)
  }, [])

  const addMenuTag = useCallback(() => {
    const trimmed = menuTagInput.trim()
    if (trimmed && !menuTags.includes(trimmed)) {
      setMenuTags((prev) => [...prev, trimmed])
    }
    setMenuTagInput('')
    menuTagInputRef.current?.focus()
  }, [menuTagInput, menuTags])

  const removeMenuTag = useCallback((tag: string) => {
    setMenuTags((prev) => prev.filter((t) => t !== tag))
  }, [])

  const handleSave = useCallback(async () => {
    if (!isValid) return
    const companionCount = companions.length > 0 ? Math.min(companions.length + 1, 5) : undefined

    await onSave({
      targetId: target.id,
      targetType: 'restaurant',
      genre: selectedGenre ?? undefined,
      priceRange,
      axisX: quadrant.x,
      axisY: quadrant.y,
      satisfaction: Math.round((quadrant.x + quadrant.y) / 2),
      scene: scene as string,
      comment: comment || undefined,
      companions: companions.length > 0 ? companions : undefined,
      companionCount,
      privateNote: privateNote || undefined,
      menuTags: menuTags.length > 0 ? menuTags : undefined,
      totalPrice: totalPrice ? Number(totalPrice) : undefined,
      visitDate,
      linkedWineId: linkedWine?.id,
    })
  }, [isValid, quadrant, scene, comment, companions, privateNote, menuTags, totalPrice, visitDate, target.id, onSave, linkedWine, selectedGenre, priceRange])

  const handleQuickSave = useCallback(async () => {
    await onSave({
      targetId: target.id,
      targetType: 'restaurant',
      genre: selectedGenre ?? undefined,
      axisX: null,
      axisY: null,
      satisfaction: null,
      scene: null,
      visitDate,
    })
  }, [target.id, onSave, selectedGenre, visitDate])

  return (
    <div className="flex flex-col overflow-x-hidden pb-24">
      {/* AI 인식 결과 헤더 */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex shrink-0 items-center justify-center"
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--r-md)',
            backgroundColor: 'color-mix(in srgb, var(--accent-food) 10%, transparent)',
          }}
        >
          <Utensils size={20} style={{ color: 'var(--accent-food)' }} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            {target.name}
          </span>
          {target.categoryPath && (
            <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
              {target.categoryPath}
            </span>
          )}
          <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
            {[target.address ?? target.area, target.distance].filter(Boolean).join(' · ')}
          </span>
          {target.isAiRecognized && (
            <span className="mt-0.5 flex items-center gap-1" style={{ fontSize: '10px', color: 'var(--accent-food)' }}>
              <Sparkles size={10} />
              AI 자동 인식
            </span>
          )}
        </div>
      </div>

      {/* 방문 날짜 (최상단) */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          방문 날짜
        </h3>
        <input
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          max={todayInTz(detectBrowserTimezone())}
          className="w-full"
          style={{
            padding: '10px 14px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            fontSize: '14px',
            color: 'var(--text)',
            backgroundColor: 'var(--bg-card)',
            outline: 'none',
            boxSizing: 'border-box',
            maxWidth: '100%',
            minWidth: 0,
          }}
        />
      </section>

      {/* 음식 종류 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          음식 종류 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {suggestedGenres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGenre(selectedGenre === g ? null : g)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                selectedGenre === g
                  ? 'bg-[var(--accent-food)] text-white'
                  : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-sub)]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      {/* 사진 (기본 공개) */}
      {photoSlot && (
        <section className="px-4 py-4">
          {photoSlot}
        </section>
      )}

      {/* 사분면 */}
      <section ref={quadrantSectionRef} className="relative px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          어떤 곳이었나요?
        </h3>
        <div className="relative">
          <div className="absolute flex gap-2" style={{ top: '-28px', left: '120px', zIndex: 20 }}>
            <button
              type="button"
              onClick={handleQuickSave}
              disabled={isLoading}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-food) 10%, transparent)',
                color: 'var(--accent-food)',
              }}
            >
              아직이에요
            </button>
          </div>
          <QuadrantInput type="restaurant" value={quadrant} onChange={handleQuadrantChange} referencePoints={referenceRecords} showHint={saveHint} hideDot={!quadrantTouched} />
        </div>
        <div className="mt-4">
          <PriceLevelSelector value={priceRange} onChange={setPriceRange} />
        </div>
      </section>

      {/* 상황 태그 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          어떤 상황이었나요?
        </h3>
        <SceneTagSelector value={scene} onChange={setScene} />
      </section>

      {/* 한줄 코멘트 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          한줄평 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        <textarea
          maxLength={200}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="이 식당을 한마디로?"
          rows={2}
          className="nyam-input w-full resize-none"
          style={{ backgroundColor: 'var(--bg-card)' }}
        />
        <span className="mt-1 block text-right" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
          {comment.length}/200
        </span>
      </section>

      {/* 추천 메뉴 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          추천 메뉴 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {menuTags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1"
              style={{
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: 'color-mix(in srgb, var(--accent-food) 10%, transparent)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--accent-food)',
              }}
            >
              {tag}
              <button type="button" onClick={() => removeMenuTag(tag)}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={menuTagInputRef}
            type="text"
            value={menuTagInput}
            onChange={(e) => setMenuTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMenuTag() } }}
            placeholder="메뉴 이름 입력"
            maxLength={30}
            className="nyam-input flex-1"
            style={{ backgroundColor: 'var(--bg-card)', fontSize: '13px' }}
          />
          <button
            type="button"
            onClick={addMenuTag}
            style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-food)', padding: '8px' }}
          >
            추가
          </button>
        </div>
      </section>

      {/* 같이 마신 와인 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          같이 마신 와인 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        {linkedWine ? (
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-wine)' }}
          >
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{linkedWine.name}</p>
              {linkedWine.meta && (
                <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '1px' }}>{linkedWine.meta}</p>
              )}
            </div>
            <button type="button" onClick={() => setLinkedWine(null)} style={{ fontSize: '12px', color: 'var(--negative)' }}>
              해제
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLinkSheet(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text-hint)]"
          >
            <span>⊕</span> 와인 검색
          </button>
        )}
      </section>

      {/* ─── 비공개 영역 구분선 ─── */}
      <div className="mx-4 my-2 flex items-center gap-2">
        <div className="flex-1" style={{ height: '1px', backgroundColor: 'var(--border)' }} />
        <span className="flex items-center gap-1" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-hint)' }}>
          <Lock size={12} />
          나만 보는 기록
        </span>
        <div className="flex-1" style={{ height: '1px', backgroundColor: 'var(--border)' }} />
      </div>
      <p className="px-4 pb-2" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
        아래 내용은 버블·프로필·검색에 공개되지 않습니다
      </p>

      {/* 동행자 (비공개) */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          누구와 함께? <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        <CompanionInput value={companions} onChange={setCompanions} recentCompanions={recentCompanions} />
      </section>

      {/* 지출내역 (비공개) */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          지출내역 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택 · 영수증 인식</span>
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            placeholder="0"
            className="flex-1"
            style={{
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              fontSize: '14px',
              color: 'var(--text)',
              backgroundColor: 'var(--bg-card)',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '14px', color: 'var(--text-sub)' }}>원</span>
        </div>
      </section>

      {/* 개인 메모 (비공개) */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          개인 메모 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        <textarea
          maxLength={500}
          value={privateNote}
          onChange={(e) => setPrivateNote(e.target.value)}
          placeholder="가격, 분위기, 기억하고 싶은 것들..."
          rows={3}
          className="nyam-input w-full resize-none"
          style={{ backgroundColor: 'var(--bg-card)' }}
        />
        <span className="mt-1 block text-right" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
          {privateNote.length}/500
        </span>
      </section>

      <LinkSearchSheet
        isOpen={showLinkSheet}
        onClose={() => setShowLinkSheet(false)}
        type="wine"
        onSelect={setLinkedWine}
      />

      {/* 저장 바 */}
      <RecordSaveBar
        variant="food"
        onSave={() => {
          if (!isValid) {
            quadrantSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setTimeout(() => {
              setSaveHint(true)
              setTimeout(() => setSaveHint(false), 3000)
            }, 400)
            return
          }
          handleSave()
        }}
        isLoading={isLoading}
        disabled={!isValid}
        label={saveLabel}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}
