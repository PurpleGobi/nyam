'use client'

import { useState, useCallback, useRef } from 'react'
import { Wine, Sparkles, Lock } from 'lucide-react'
import type { AromaSelection, AromaRing } from '@/domain/entities/aroma'
import type { WineStructure } from '@/domain/entities/wine-structure'
import type { PairingCategory } from '@/domain/entities/record'
import type { QuadrantReferencePoint } from '@/domain/entities/quadrant'
import { QuadrantInput } from '@/presentation/components/record/quadrant-input'
import { AromaWheel } from '@/presentation/components/record/aroma-wheel'
import { WineStructureEval } from '@/presentation/components/record/wine-structure-eval'
import { PairingGrid } from '@/presentation/components/record/pairing-grid'
import { CompanionInput } from '@/presentation/components/record/companion-input'
import { RecordSaveBar } from '@/presentation/components/record/record-save-bar'
import { LinkSearchSheet } from '@/presentation/components/record/link-search-sheet'
import type { LinkSearchResult } from '@/presentation/components/record/link-search-sheet'
import { NyamSelect } from '@/presentation/components/ui/nyam-select'
import { AROMA_SECTORS } from '@/shared/constants/aroma-sectors'
import {
  WINE_COUNTRIES, WINE_REGIONS, WINE_TYPES,
  WINE_VARIETIES_BY_TYPE, ITALIAN_VARIETIES,
} from '@/shared/constants/wine-meta'

interface WineTarget {
  id: string
  name: string
  wineType?: string
  region?: string
  country?: string
  variety?: string
  producer?: string
  vintage?: number
  isAiRecognized?: boolean
}

interface CreateWineRecordInput {
  targetId: string
  targetType: 'wine'
  // 와인 메타 (wines 테이블 업데이트용)
  wineMetaUpdate?: {
    vintage: number | null
    region: string | null
    country: string | null
    variety: string | null
  }
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
  companions?: string[]
  companionCount?: number
  privateNote?: string
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
  companions: string[] | null
  privateNote: string | null
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
  recentCompanions?: string[]
  onDelete?: () => void
  isDeleting?: boolean
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
  recentCompanions,
  onDelete,
  isDeleting,
}: WineRecordFormProps) {
  // 와인 메타 (자동 채움 + 수정 가능)
  const [vintage, setVintage] = useState(target.vintage ? String(target.vintage) : '')
  const [region, setRegion] = useState(target.region ?? '')
  const [country, setCountry] = useState(target.country ?? '')
  const [variety, setVariety] = useState(target.variety ?? '')
  // 와인 타입 (SSOT wine_type)
  const [wineType, setWineType] = useState(target.wineType ?? '')

  const [quadrant, setQuadrant] = useState({
    x: initialData?.axisX ?? 50,
    y: initialData?.axisY ?? 50,
  })
  const [quadrantTouched, setQuadrantTouched] = useState(!!initialData?.axisX)
  const [saveHint, setSaveHint] = useState(false)
  const quadrantSectionRef = useRef<HTMLElement>(null)
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
  const [companions, setCompanions] = useState<string[]>(initialData?.companions ?? [])
  const [privateNote, setPrivateNote] = useState(initialData?.privateNote ?? '')
  const [linkedRestaurant, setLinkedRestaurant] = useState<LinkSearchResult | null>(null)
  const [showLinkSheet, setShowLinkSheet] = useState(false)
  const isManualOverrideRef = useRef(false)

  const aromaRingCount = countActiveRings(aroma.regions)

  const isValid = quadrantTouched

  const handleQuadrantChange = useCallback((val: { x: number; y: number; satisfaction?: number }) => {
    isManualOverrideRef.current = true
    setQuadrant({ x: val.x, y: val.y })
    setQuadrantTouched(true)
    setSaveHint(false)
  }, [])

  const handleAutoScoreChange = useCallback((score: number) => {
    setAutoScore(score)
  }, [])

  const handleSave = useCallback(async () => {
    if (!isValid || !aroma.color) return

    await onSave({
      targetId: target.id,
      targetType: 'wine',
      wineMetaUpdate: {
        vintage: vintage ? Number(vintage) : null,
        region: region || null,
        country: country || null,
        variety: variety || null,
      },
      axisX: quadrant.x,
      axisY: quadrant.y,
      satisfaction: Math.round((quadrant.x + quadrant.y) / 2),
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
      companions: companions.length > 0 ? companions : undefined,
      companionCount: companions.length > 0 ? Math.min(companions.length + 1, 5) : undefined,
      privateNote: privateNote || undefined,
      visitDate,
      linkedRestaurantId: linkedRestaurant?.id,
    })
  }, [isValid, vintage, region, country, variety, quadrant, aroma, structure, autoScore, pairingCategories, comment, purchasePrice, companions, privateNote, visitDate, target.id, onSave, linkedRestaurant])

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
            {target.vintage ? ` ${target.vintage}` : ''}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
            {[target.wineType, target.country, target.region].filter(Boolean).join(' · ')}
          </span>
          {(target.variety || target.producer) && (
            <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
              {[target.variety, target.producer].filter(Boolean).join(' · ')}
            </span>
          )}
          {target.isAiRecognized && (
            <span className="mt-0.5 flex items-center gap-1" style={{ fontSize: '10px', color: 'var(--accent-wine)' }}>
              <Sparkles size={10} />
              AI 자동 인식
            </span>
          )}
        </div>
      </div>

      {/* 와인 정보 (자동 채움 + 수정 가능) */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          와인 정보
          <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)', marginLeft: '6px' }}>
            {target.isAiRecognized ? 'AI 자동입력 · 수정 가능' : '선택'}
          </span>
        </h3>
        <div className="flex flex-col gap-3">
          {/* 빈티지 */}
          <div className="flex items-center gap-3">
            <label className="w-14 shrink-0 text-[13px] font-medium" style={{ color: 'var(--text-sub)' }}>빈티지</label>
            <input
              type="number"
              inputMode="numeric"
              value={vintage}
              onChange={(e) => setVintage(e.target.value)}
              placeholder="예: 2020"
              min={1900}
              max={new Date().getFullYear()}
              className="nyam-input flex-1"
              style={{ backgroundColor: 'var(--bg-card)' }}
            />
          </div>
          {/* 국가 · 산지 */}
          <div className="flex items-center gap-3">
            <label className="w-14 shrink-0 text-[13px] font-medium" style={{ color: 'var(--text-sub)' }}>산지</label>
            <div className="relative flex flex-1 gap-2">
              <NyamSelect
                value={country}
                onChange={(v) => {
                  setCountry(v)
                  const regions = WINE_REGIONS[v]
                  if (regions && !regions.includes(region)) setRegion('')
                }}
                options={WINE_COUNTRIES.map((c) => ({ value: c, label: c }))}
                placeholder="국가"
                accentColor="var(--accent-wine)"
              />
              <NyamSelect
                value={region}
                onChange={setRegion}
                options={(WINE_REGIONS[country] ?? []).map((r) => ({ value: r, label: r }))}
                placeholder="지역"
                disabled={!country}
                accentColor="var(--accent-wine)"
              />
            </div>
          </div>
          {/* 품종: 와인 타입 → 품종 2단계 */}
          <div className="flex items-center gap-3">
            <label className="w-14 shrink-0 text-[13px] font-medium" style={{ color: 'var(--text-sub)' }}>품종</label>
            <div className="relative flex flex-1 gap-2">
              <NyamSelect
                value={wineType}
                onChange={(v) => {
                  setWineType(v)
                  const varieties = WINE_VARIETIES_BY_TYPE[v]
                  if (varieties && !varieties.includes(variety)) setVariety('')
                }}
                options={WINE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                placeholder="타입"
                accentColor="var(--accent-wine)"
              />
              <NyamSelect
                value={variety}
                onChange={setVariety}
                options={(() => {
                  const all = WINE_VARIETIES_BY_TYPE[wineType] ?? []
                  const normal = all.filter((v) => !ITALIAN_VARIETIES.has(v))
                  const italian = all.filter((v) => ITALIAN_VARIETIES.has(v))
                  return [
                    ...normal.map((v) => ({ value: v, label: v })),
                    ...italian.map((v) => ({ value: v, label: `${v}  ·  IT` })),
                  ]
                })()}
                placeholder="품종"
                disabled={!wineType}
                accentColor="var(--accent-wine)"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 사진 */}
      {photoSlot && (
        <section className="px-4 py-4">
          {photoSlot}
        </section>
      )}

      {/* 사분면 */}
      <section ref={quadrantSectionRef} className="relative px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          어떤 와인이었나요?
        </h3>
        <QuadrantInput type="wine" value={quadrant} onChange={handleQuadrantChange} referencePoints={referenceRecords} showHint={saveHint} />
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
          className="nyam-input w-full resize-none"
          style={{ backgroundColor: 'var(--bg-card)' }}
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
            className="nyam-input flex-1"
            style={{ backgroundColor: 'var(--bg-card)' }}
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
          className="nyam-input w-full"
          style={{ backgroundColor: 'var(--bg-card)' }}
        />
      </section>

      {/* 어디서 마셨나요? (식당 연결) */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          어디서 마셨나요? <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        {linkedRestaurant ? (
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-food)' }}
          >
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{linkedRestaurant.name}</p>
              {linkedRestaurant.meta && (
                <p style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '1px' }}>{linkedRestaurant.meta}</p>
              )}
            </div>
            <button type="button" onClick={() => setLinkedRestaurant(null)} style={{ fontSize: '12px', color: 'var(--negative)' }}>
              해제
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowLinkSheet(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text-hint)]"
          >
            <span>⊕</span> 식당 검색
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

      {/* 개인 메모 (비공개) */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          개인 메모 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        <textarea
          maxLength={500}
          value={privateNote}
          onChange={(e) => setPrivateNote(e.target.value)}
          placeholder="바디감, 셀러 보관 메모, 기억하고 싶은 것들..."
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
        type="restaurant"
        onSelect={setLinkedRestaurant}
      />

      {/* 저장 바 */}
      <RecordSaveBar
        variant="wine"
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
