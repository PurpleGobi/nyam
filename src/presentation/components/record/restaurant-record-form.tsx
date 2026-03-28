'use client'

import { useState, useCallback, useRef } from 'react'
import { Utensils, Sparkles, X } from 'lucide-react'
import type { QuadrantReferencePoint } from '@/domain/entities/quadrant'
import type { RestaurantScene } from '@/domain/entities/scene'
import { QuadrantInput } from '@/presentation/components/record/quadrant-input'
import { SceneTagSelector } from '@/presentation/components/record/scene-tag-selector'
import { CompanionInput } from '@/presentation/components/record/companion-input'
import { RecordSaveBar } from '@/presentation/components/record/record-save-bar'

interface RestaurantTarget {
  id: string
  name: string
  genre?: string
  area?: string
  distance?: string
  isAiRecognized?: boolean
}

interface CreateRestaurantRecordInput {
  targetId: string
  targetType: 'restaurant'
  axisX: number
  axisY: number
  satisfaction: number
  scene: string
  comment?: string
  companions?: string[]
  companionCount?: number
  menuTags?: string[]
  totalPrice?: number
  visitDate?: string
  linkedWineId?: string
  photoUrls?: string[]
}

interface RestaurantRecordFormProps {
  target: RestaurantTarget
  referenceRecords?: QuadrantReferencePoint[]
  onSave: (data: CreateRestaurantRecordInput) => Promise<void>
  isLoading: boolean
  photoSlot?: React.ReactNode
}

export function RestaurantRecordForm({
  target,
  referenceRecords,
  onSave,
  isLoading,
  photoSlot,
}: RestaurantRecordFormProps) {
  const [quadrant, setQuadrant] = useState({ x: 50, y: 50, satisfaction: 50 })
  const [scene, setScene] = useState<RestaurantScene | null>(null)
  const [comment, setComment] = useState('')
  const [companions, setCompanions] = useState<string[]>([])
  const [menuTags, setMenuTags] = useState<string[]>([])
  const [menuTagInput, setMenuTagInput] = useState('')
  const [totalPrice, setTotalPrice] = useState('')
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0])
  const menuTagInputRef = useRef<HTMLInputElement>(null)

  const isValid = quadrant.satisfaction >= 1 && scene !== null

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
      axisX: quadrant.x,
      axisY: quadrant.y,
      satisfaction: quadrant.satisfaction,
      scene: scene as string,
      comment: comment || undefined,
      companions: companions.length > 0 ? companions : undefined,
      companionCount,
      menuTags: menuTags.length > 0 ? menuTags : undefined,
      totalPrice: totalPrice ? Number(totalPrice) : undefined,
      visitDate,
    })
  }, [isValid, quadrant, scene, comment, companions, menuTags, totalPrice, visitDate, target.id, onSave])

  return (
    <div className="flex flex-col pb-24">
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
        <div className="flex flex-col">
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            {target.name}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
            {[target.genre, target.area, target.distance].filter(Boolean).join(' · ')}
          </span>
          {target.isAiRecognized && (
            <span className="mt-0.5 flex items-center gap-1" style={{ fontSize: '10px', color: 'var(--accent-food)' }}>
              <Sparkles size={10} />
              AI 자동 인식
            </span>
          )}
        </div>
      </div>

      {/* 사진 */}
      {photoSlot && (
        <section className="px-4 py-4">
          {photoSlot}
        </section>
      )}

      {/* 사분면 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          어떤 곳이었나요?
        </h3>
        <QuadrantInput type="restaurant" value={quadrant} onChange={setQuadrant} referencePoints={referenceRecords} />
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
          className="w-full resize-none"
          style={{
            padding: '12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            fontSize: '14px',
            color: 'var(--text)',
            backgroundColor: 'var(--bg-card)',
            outline: 'none',
          }}
        />
        <span className="mt-1 block text-right" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
          {comment.length}/200
        </span>
      </section>

      {/* 동행자 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          누구와 함께? <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택 · 비공개 · 사진 인식</span>
        </h3>
        <CompanionInput value={companions} onChange={setCompanions} />
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
            className="flex-1"
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              fontSize: '13px',
              color: 'var(--text)',
              backgroundColor: 'var(--bg-card)',
              outline: 'none',
            }}
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

      {/* 가격 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          1인 가격 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택 · 영수증 인식</span>
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

      {/* 방문 날짜 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          방문 날짜 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        <input
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="w-full"
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
      </section>

      {/* 같이 마신 와인 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          같이 마신 와인 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        {/* S3 검색 연동 전까지 껍데기만 */}
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text-hint)]"
        >
          <span>⊕</span> 와인 추가
        </button>
      </section>

      {/* 저장 바 */}
      <RecordSaveBar
        variant="food"
        onSave={handleSave}
        isLoading={isLoading}
        disabled={!isValid}
      />
    </div>
  )
}
