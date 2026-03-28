'use client'

import { useState, useCallback, useRef } from 'react'
import { Wine, Sparkles } from 'lucide-react'
import type { AromaSelection, AromaRing } from '@/domain/entities/aroma'
import type { WineStructure } from '@/domain/entities/wine-structure'
import type { PairingCategory } from '@/domain/entities/record'
import type { QuadrantReferencePoint } from '@/domain/entities/quadrant'
import { QuadrantInput } from '@/presentation/components/record/quadrant-input'
import { AromaWheel } from '@/presentation/components/record/aroma-wheel'
import { WineStructureEval } from '@/presentation/components/record/wine-structure-eval'
import { PairingGrid } from '@/presentation/components/record/pairing-grid'
import { RecordSaveBar } from '@/presentation/components/record/record-save-bar'
import { AROMA_SECTORS } from '@/shared/constants/aroma-sectors'

interface WineTarget {
  id: string
  name: string
  wineType?: string
  region?: string
  vintage?: number
  isAiRecognized?: boolean
}

interface CreateWineRecordInput {
  targetId: string
  targetType: 'wine'
  axisX: number
  axisY: number
  satisfaction: number
  aromaRegions: Record<string, unknown>
  aromaLabels: string[]
  aromaColor: string
  complexity?: number
  finish?: number
  balance?: number
  autoScore?: number
  pairingCategories: string[]
  comment?: string
  purchasePrice?: number
  linkedRestaurantId?: string
  photoUrls?: string[]
  visitDate?: string
}

interface WineInitialData {
  axisX: number
  axisY: number
  satisfaction: number
  aromaRegions: Record<string, unknown> | null
  aromaLabels: string[] | null
  aromaColor: string | null
  complexity: number | null
  finish: number | null
  balance: number | null
  pairingCategories: string[] | null
  comment: string | null
  purchasePrice: number | null
  visitDate: string | null
}

interface WineRecordFormProps {
  target: WineTarget
  referenceRecords?: QuadrantReferencePoint[]
  initialData?: WineInitialData
  saveLabel?: string
  onSave: (data: CreateWineRecordInput) => Promise<void>
  isLoading: boolean
  photoSlot?: React.ReactNode
}

function countActiveRings(regions: AromaSelection['regions']): number {
  const activeIds = Object.keys(regions)
  const activeRings = new Set<AromaRing>()
  for (const id of activeIds) {
    const sector = AROMA_SECTORS.find((s) => s.id === id)
    if (sector) activeRings.add(sector.ring)
  }
  return activeRings.size
}

export function WineRecordForm({
  target,
  referenceRecords,
  initialData,
  saveLabel,
  onSave,
  isLoading,
  photoSlot,
}: WineRecordFormProps) {
  const [quadrant, setQuadrant] = useState({
    x: initialData?.axisX ?? 50,
    y: initialData?.axisY ?? 50,
    satisfaction: initialData?.satisfaction ?? 50,
  })
  const [aroma, setAroma] = useState<AromaSelection>({
    regions: (initialData?.aromaRegions as AromaSelection['regions']) ?? {},
    labels: initialData?.aromaLabels ?? [],
    color: initialData?.aromaColor ?? null,
  })
  const [structure, setStructure] = useState<WineStructure>({
    complexity: initialData?.complexity ?? 30,
    finish: initialData?.finish ?? 50,
    balance: initialData?.balance ?? 50,
  })
  const [autoScore, setAutoScore] = useState<number | null>(null)
  const [pairingCategories, setPairingCategories] = useState<PairingCategory[]>(
    (initialData?.pairingCategories as PairingCategory[]) ?? [],
  )
  const [pairingCustom, setPairingCustom] = useState('')
  const [comment, setComment] = useState(initialData?.comment ?? '')
  const [purchasePrice, setPurchasePrice] = useState(
    initialData?.purchasePrice ? String(initialData.purchasePrice) : '',
  )
  const [visitDate, setVisitDate] = useState(
    initialData?.visitDate ?? new Date().toISOString().split('T')[0],
  )
  const isManualOverrideRef = useRef(false)

  const aromaRingCount = countActiveRings(aroma.regions)

  const isValid =
    quadrant.satisfaction >= 1 &&
    aroma.labels.length > 0 &&
    pairingCategories.length > 0

  const handleQuadrantChange = useCallback((val: { x: number; y: number; satisfaction: number }) => {
    isManualOverrideRef.current = true
    setQuadrant(val)
  }, [])

  const handleAutoScoreChange = useCallback((score: number) => {
    setAutoScore(score)
    if (!isManualOverrideRef.current) {
      setQuadrant((prev) => ({ ...prev, satisfaction: score }))
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!isValid || !aroma.color) return

    await onSave({
      targetId: target.id,
      targetType: 'wine',
      axisX: quadrant.x,
      axisY: quadrant.y,
      satisfaction: quadrant.satisfaction,
      aromaRegions: aroma.regions as Record<string, unknown>,
      aromaLabels: aroma.labels,
      aromaColor: aroma.color,
      complexity: structure.complexity,
      finish: structure.finish,
      balance: structure.balance,
      autoScore: autoScore ?? undefined,
      pairingCategories,
      comment: comment || undefined,
      purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
      visitDate,
    })
  }, [isValid, quadrant, aroma, structure, autoScore, pairingCategories, comment, purchasePrice, visitDate, target.id, onSave])

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
            backgroundColor: 'color-mix(in srgb, var(--accent-wine) 10%, transparent)',
          }}
        >
          <Wine size={20} style={{ color: 'var(--accent-wine)' }} />
        </div>
        <div className="flex flex-col">
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            {target.name}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
            {[target.wineType, target.region, target.vintage].filter(Boolean).join(' · ')}
          </span>
          {target.isAiRecognized && (
            <span className="mt-0.5 flex items-center gap-1" style={{ fontSize: '10px', color: 'var(--accent-wine)' }}>
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
          어떤 와인이었나요?
        </h3>
        <QuadrantInput type="wine" value={quadrant} onChange={handleQuadrantChange} referencePoints={referenceRecords} />
      </section>

      {/* 아로마 팔레트 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          어떤 향이 났나요? <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--accent-wine)' }}>AI 감지</span>
        </h3>
        <AromaWheel value={aroma} onChange={setAroma} />
      </section>

      {/* 구조 평가 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          구조 평가 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        <WineStructureEval
          value={structure}
          onChange={setStructure}
          aromaRingCount={aromaRingCount}
          onAutoScoreChange={handleAutoScoreChange}
        />
      </section>

      {/* 페어링 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          무엇과 함께 마셨나요?
        </h3>
        <PairingGrid
          value={pairingCategories}
          onChange={setPairingCategories}
          customInput={pairingCustom}
          onCustomInputChange={setPairingCustom}
        />
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
          placeholder="이 와인을 한마디로?"
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

      {/* 가격 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          병 가격 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택 · AI 추정</span>
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
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

      {/* 음용 날짜 */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          음용 날짜 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
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

      {/* 어디서 마셨나요? (식당 연결) */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          어디서 마셨나요? <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text-hint)]"
        >
          <span>⊕</span> 식당 검색
        </button>
      </section>

      {/* 저장 바 */}
      <RecordSaveBar
        variant="wine"
        onSave={handleSave}
        isLoading={isLoading}
        disabled={!isValid}
        label={saveLabel}
      />
    </div>
  )
}
