'use client'

import { useState, useCallback, useRef } from 'react'
import { Wine, Sparkles, Lock, GlassWater, CalendarRange, Thermometer, UtensilsCrossed } from 'lucide-react'
import { WINE_TYPE_COLORS } from '@/domain/entities/wine'
import type { WineType } from '@/domain/entities/wine'
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
import { todayInTz, detectBrowserTimezone } from '@/shared/utils/date-format'
import { AROMA_SECTORS } from '@/shared/constants/aroma-sectors'
import {
  WINE_COUNTRIES, WINE_REGIONS, WINE_SUB_REGIONS, WINE_APPELLATIONS, WINE_TYPES,
  WINE_VARIETIES_BY_TYPE, ITALIAN_VARIETIES,
} from '@/shared/constants/wine-meta'

interface WineTarget {
  id: string
  name: string
  wineType?: string
  region?: string
  subRegion?: string
  appellation?: string
  country?: string
  variety?: string
  grapeVarieties?: Array<{ name: string; pct: number }>
  producer?: string
  vintage?: number
  abv?: number
  bodyLevel?: number
  acidityLevel?: number
  sweetnessLevel?: number
  classification?: string
  servingTemp?: string
  decanting?: string
  referencePrice?: number
  drinkingWindowStart?: number
  drinkingWindowEnd?: number
  vivinoRating?: number
  criticScores?: { RP?: number; WS?: number; JR?: number; JH?: number }
  tastingNotes?: string
  foodPairings?: string[]
  isAiRecognized?: boolean
}

interface CreateWineRecordInput {
  targetId: string
  targetType: 'wine'
  // 와인 메타 (wines 테이블 업데이트용 — AI 전체 필드)
  wineMetaUpdate?: {
    vintage: number | null
    producer: string | null
    region: string | null
    subRegion: string | null
    appellation: string | null
    country: string | null
    variety: string | null
    abv: number | null
    bodyLevel: number | null
    acidityLevel: number | null
    sweetnessLevel: number | null
    classification: string | null
    servingTemp: string | null
    decanting: string | null
    referencePrice: number | null
    drinkingWindowStart: number | null
    drinkingWindowEnd: number | null
    vivinoRating: number | null
    criticScores: { RP?: number; WS?: number } | null
    tastingNotes: string | null
  }
  axisX: number
  axisY: number
  satisfaction: number
  aromaRegions: Record<string, unknown> | null
  aromaLabels: string[] | null
  aromaColor: string | null
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
  axisX: number | null
  axisY: number | null
  satisfaction: number | null
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
  // 와인 메타 (AI 자동 채움 + 수정 가능)
  const [producer, setProducer] = useState(target.producer ?? '')
  const [vintage, setVintage] = useState(target.vintage ? String(target.vintage) : '')
  const [region, setRegion] = useState(target.region ?? '')
  const [subRegion, setSubRegion] = useState(target.subRegion ?? '')
  const [appellation, setAppellation] = useState(target.appellation ?? '')
  // region이 있는데 country가 없으면 역방향 추론
  const [country, setCountry] = useState(() => {
    if (target.country) return target.country
    if (target.region) {
      for (const [c, regions] of Object.entries(WINE_REGIONS)) {
        if (regions.includes(target.region)) return c
      }
    }
    return ''
  })
  const [varieties, setVarieties] = useState<Array<{ name: string; pct: number }>>(() => {
    if (target.grapeVarieties?.length) return target.grapeVarieties
    if (target.variety) return [{ name: target.variety, pct: 100 }]
    return []
  })
  const [wineType, setWineType] = useState(target.wineType ?? '')
  const [abv, setAbv] = useState(target.abv ? String(target.abv) : '')
  const [bodyLevel, setBodyLevel] = useState(target.bodyLevel ? String(target.bodyLevel) : '')
  const [acidityLevel, setAcidityLevel] = useState(target.acidityLevel ? String(target.acidityLevel) : '')
  const [sweetnessLevel, setSweetnessLevel] = useState(target.sweetnessLevel ? String(target.sweetnessLevel) : '')
  const [classification, setClassification] = useState(target.classification ?? '')
  const [servingTemp, setServingTemp] = useState(target.servingTemp ?? '')
  const [decanting, setDecanting] = useState(target.decanting ?? '')
  const [referencePrice, setReferencePrice] = useState(target.referencePrice ? String(target.referencePrice) : '')
  const [drinkingWindowStart, setDrinkingWindowStart] = useState(target.drinkingWindowStart ? String(target.drinkingWindowStart) : '')
  const [drinkingWindowEnd, setDrinkingWindowEnd] = useState(target.drinkingWindowEnd ? String(target.drinkingWindowEnd) : '')
  const [vivinoRating, setVivinoRating] = useState(target.vivinoRating ? String(target.vivinoRating) : '')
  const [criticRP, setCriticRP] = useState(target.criticScores?.RP ? String(target.criticScores.RP) : '')
  const [criticWS, setCriticWS] = useState(target.criticScores?.WS ? String(target.criticScores.WS) : '')
  const [tastingNotes, setTastingNotes] = useState(target.tastingNotes ?? '')

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
    initialData?.visitDate ?? todayInTz(detectBrowserTimezone()),
  )
  const [companions, setCompanions] = useState<string[]>(initialData?.companions ?? [])
  const [privateNote, setPrivateNote] = useState(initialData?.privateNote ?? '')
  const [linkedRestaurant, setLinkedRestaurant] = useState<LinkSearchResult | null>(null)
  const [showLinkSheet, setShowLinkSheet] = useState(false)
  const isManualOverrideRef = useRef(false)

  const aromaRingCount = countActiveRings(aroma.regions)

  const isEditMode = !!onDelete
  const isValid = isEditMode || quadrantTouched

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
    if (!isValid) return

    await onSave({
      targetId: target.id,
      targetType: 'wine',
      wineMetaUpdate: {
        vintage: vintage ? Number(vintage) : null,
        producer: producer || null,
        region: region || null,
        subRegion: subRegion || null,
        appellation: appellation || null,
        country: country || null,
        variety: varieties[0]?.name || null,
        abv: abv ? Number(abv) : null,
        bodyLevel: bodyLevel ? Number(bodyLevel) : null,
        acidityLevel: acidityLevel ? Number(acidityLevel) : null,
        sweetnessLevel: sweetnessLevel ? Number(sweetnessLevel) : null,
        classification: classification || null,
        servingTemp: servingTemp || null,
        decanting: decanting || null,
        referencePrice: referencePrice ? Number(referencePrice) : null,
        drinkingWindowStart: drinkingWindowStart ? Number(drinkingWindowStart) : null,
        drinkingWindowEnd: drinkingWindowEnd ? Number(drinkingWindowEnd) : null,
        vivinoRating: vivinoRating ? Number(vivinoRating) : null,
        criticScores: (criticRP || criticWS) ? { RP: criticRP ? Number(criticRP) : undefined, WS: criticWS ? Number(criticWS) : undefined } : null,
        tastingNotes: tastingNotes || null,
      },
      axisX: quadrant.x,
      axisY: quadrant.y,
      satisfaction: Math.round((quadrant.x + quadrant.y) / 2),
      aromaRegions: Object.keys(aroma.regions).length > 0 ? aroma.regions as Record<string, unknown> : null,
      aromaLabels: aroma.labels.length > 0 ? aroma.labels : null,
      aromaColor: aroma.color ?? null,
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
  }, [isValid, producer, vintage, region, subRegion, appellation, country, varieties, wineType, abv, bodyLevel, acidityLevel, sweetnessLevel, classification, servingTemp, decanting, referencePrice, drinkingWindowStart, drinkingWindowEnd, vivinoRating, criticRP, criticWS, tastingNotes, quadrant, aroma, structure, autoScore, pairingCategories, comment, purchasePrice, companions, privateNote, visitDate, target.id, onSave, linkedRestaurant])

  // 인라인 입력 공통 스타일
  const fi = 'min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] font-medium outline-none'
  const fc = { color: 'var(--text)' } as const
  const rowClass = 'flex flex-wrap items-center gap-1 px-4 py-2.5'
  const divider = <div className="mx-4" style={{ height: '1px', backgroundColor: 'var(--border)', opacity: 0.5 }} />

  return (
    <div className="flex flex-col pb-24">

      {/* ════ 섹션1: 기본 정보 ════ */}
      <section className="pb-1">
        {/* 헤더: 아이콘 + 와인명 + 메타 (식당 기록 페이지와 동일 패턴) */}
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
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 truncate">
                <span className="truncate text-[15px] font-bold" style={{ color: 'var(--text)' }}>{target.name}</span>
                <NyamSelect
                  value={wineType}
                  onChange={(v) => { setWineType(v); setVarieties([]) }}
                  options={WINE_TYPES.map((t) => ({ value: t.value, label: t.value.charAt(0).toUpperCase() + t.value.slice(1) }))}
                  placeholder="Style"
                  accentColor={WINE_TYPE_COLORS[wineType as WineType] ?? 'var(--accent-wine)'}
                  inline
                />
              </span>
              {(vivinoRating || criticRP || criticWS) && (
                <div className="flex shrink-0 items-center gap-2">
                  {vivinoRating && (
                    <div className="flex items-baseline gap-0.5">
                      <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>Vivino</span>
                      <span className="text-[20px] font-bold" style={{ color: 'var(--text-sub)' }}>{vivinoRating}</span>
                    </div>
                  )}
                  {criticRP && (
                    <div className="flex items-baseline gap-0.5">
                      <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>RP</span>
                      <span className="text-[20px] font-bold" style={{ color: 'var(--text-sub)' }}>{criticRP}</span>
                    </div>
                  )}
                  {criticWS && (
                    <div className="flex items-baseline gap-0.5">
                      <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>WS</span>
                      <span className="text-[20px] font-bold" style={{ color: 'var(--text-sub)' }}>{criticWS}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              <input type="number" inputMode="numeric" value={vintage} onChange={(e) => setVintage(e.target.value)} placeholder="Vintage" min={1900} max={new Date().getFullYear()} className="w-16 border-0 bg-transparent p-0 text-[13px] outline-none" style={{ color: 'var(--text-sub)' }} />
              <input type="text" value={producer} onChange={(e) => setProducer(e.target.value)} placeholder="Winery" className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] outline-none" style={{ color: 'var(--text-sub)' }} />
              <div className="flex shrink-0 items-baseline gap-0.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={referencePrice ? Number(referencePrice).toLocaleString() : ''}
                  onChange={(e) => setReferencePrice(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="적정가"
                  className="w-16 border-0 bg-transparent p-0 text-right text-[13px] font-semibold outline-none"
                  style={{ color: 'var(--accent-wine)' }}
                />
                {referencePrice && <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>원</span>}
              </div>
            </div>
          </div>
        </div>
        {divider}

        {/* 2-4행: 인라인 드롭다운 (구분선 없이 컴팩트) */}
        <div className="flex flex-col gap-0 px-4 py-1.5">
          {/* 2행: Country › Region › Sub-region (appellation은 DB만 저장) */}
          <div className="flex flex-wrap items-center gap-1 py-1">
            <NyamSelect value={country} onChange={(v) => { setCountry(v); const r = WINE_REGIONS[v]; if (r && !r.includes(region)) { setRegion(''); setSubRegion(''); setAppellation('') } }} options={WINE_COUNTRIES.map((c) => ({ value: c, label: c }))} placeholder="Country" accentColor="var(--accent-wine)" inline />
            <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>›</span>
            <NyamSelect value={region} onChange={(v) => { setRegion(v); const s = WINE_SUB_REGIONS[v]; if (s && !s.includes(subRegion)) { setSubRegion(''); setAppellation('') } }} options={(WINE_REGIONS[country] ?? []).map((r) => ({ value: r, label: r }))} placeholder="Region" disabled={!country} accentColor="var(--accent-wine)" inline />
            <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>›</span>
            <NyamSelect value={subRegion} onChange={(v) => { setSubRegion(v) }} options={(WINE_SUB_REGIONS[region] ?? []).map((s) => ({ value: s, label: s }))} placeholder="Sub-region" disabled={!region || (WINE_SUB_REGIONS[region] ?? []).length === 0} accentColor="var(--accent-wine)" inline />
          </div>
          {/* 3행: Grape Varieties (다중 선택 칩) */}
          <div className="flex flex-wrap items-center gap-1 py-1">
            {varieties.map((g) => (
              <button
                key={g.name}
                type="button"
                onClick={() => setVarieties(varieties.filter((x) => x.name !== g.name))}
                className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[12px] font-medium"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent-wine) 10%, transparent)', color: 'var(--accent-wine)' }}
              >
                {g.name}
                {g.pct > 0 && g.pct < 100 && (
                  <span style={{ fontSize: '10px', opacity: 0.55 }}>{g.pct}%</span>
                )}
                <span style={{ fontSize: '10px', opacity: 0.6 }}>×</span>
              </button>
            ))}
            <NyamSelect
              value=""
              onChange={(v) => { if (v && !varieties.some((g) => g.name === v)) setVarieties([...varieties, { name: v, pct: 0 }]) }}
              options={(() => { const all = WINE_VARIETIES_BY_TYPE[wineType] ?? []; const normal = all.filter((v) => !ITALIAN_VARIETIES.has(v)); const italian = all.filter((v) => ITALIAN_VARIETIES.has(v)); return [...normal.map((v) => ({ value: v, label: v })), ...italian.map((v) => ({ value: v, label: `${v}  ·  IT` }))] })()}
              placeholder={varieties.length > 0 ? '+' : 'Grape Variety'}
              disabled={!wineType}
              accentColor="var(--accent-wine)"
              inline
            />
          </div>
          {/* 4행: Body | Acidity | Sweetness | ABV */}
          <div className="flex flex-wrap items-center gap-1.5 py-1">
            <NyamSelect value={bodyLevel} onChange={setBodyLevel} options={[{ value: '1', label: 'Light Body' }, { value: '2', label: 'Med- Body' }, { value: '3', label: 'Med Body' }, { value: '4', label: 'Med+ Body' }, { value: '5', label: 'Full Body' }]} placeholder="Body" accentColor="var(--accent-wine)" inline />
            <span style={{ fontSize: '13px', color: 'var(--border)' }}>|</span>
            <NyamSelect value={acidityLevel} onChange={setAcidityLevel} options={[{ value: '1', label: 'Low Acid' }, { value: '2', label: 'Med Acid' }, { value: '3', label: 'High Acid' }]} placeholder="Acidity" accentColor="var(--accent-wine)" inline />
            <span style={{ fontSize: '13px', color: 'var(--border)' }}>|</span>
            <NyamSelect value={sweetnessLevel} onChange={setSweetnessLevel} options={[{ value: '1', label: 'Dry' }, { value: '2', label: 'Off-dry' }, { value: '3', label: 'Sweet' }]} placeholder="Sweet" accentColor="var(--accent-wine)" inline />
            <span style={{ fontSize: '13px', color: 'var(--border)' }}>|</span>
            <div className="inline-flex items-center gap-0.5 text-[13px] font-medium" style={{ color: abv ? 'var(--text)' : 'var(--text-hint)' }}>
              <span>ABV</span>
              <input type="text" inputMode="decimal" value={abv} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); setAbv(v) }} placeholder="—" className="w-7 border-0 bg-transparent p-0 text-right text-[13px] font-medium outline-none" style={{ color: 'inherit', fontFamily: 'inherit' }} />
              <span>%</span>
            </div>
          </div>
          {/* 5행: 서빙온도 · 디캔팅 · 음용시기 (AI 데이터 있을 때만 표시) */}
          {(servingTemp || decanting || drinkingWindowStart || drinkingWindowEnd) && (
            <div className="flex flex-wrap items-center gap-1 py-1 text-[13px] font-medium" style={{ color: 'var(--text-sub)' }}>
              {servingTemp && (
                <>
                  <Thermometer size={13} style={{ color: 'var(--text-hint)' }} />
                  <span>{servingTemp}</span>
                </>
              )}
              {servingTemp && decanting && (
                <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>·</span>
              )}
              {decanting && (
                <>
                  <GlassWater size={13} style={{ color: 'var(--text-hint)' }} />
                  <span><span style={{ color: 'var(--text-hint)' }}>디캔팅</span> {decanting}</span>
                </>
              )}
              {(servingTemp || decanting) && (drinkingWindowStart || drinkingWindowEnd) && (
                <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>·</span>
              )}
              {(drinkingWindowStart || drinkingWindowEnd) && (
                <>
                  <CalendarRange size={13} style={{ color: 'var(--text-hint)' }} />
                  <span>
                    <span style={{ color: 'var(--text-hint)' }}>음용</span> {drinkingWindowStart && drinkingWindowEnd
                      ? `${drinkingWindowStart}–${drinkingWindowEnd}`
                      : drinkingWindowStart
                        ? `${drinkingWindowStart}~`
                        : `~${drinkingWindowEnd}`}
                  </span>
                </>
              )}
            </div>
          )}
          {/* 6행: 푸드 페어링 (AI 추천) */}
          {target.foodPairings && target.foodPairings.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 py-1 text-[13px] font-medium" style={{ color: 'var(--text-sub)' }}>
              <UtensilsCrossed size={13} style={{ color: 'var(--text-hint)' }} />
              <span>{target.foodPairings.join(', ')}</span>
            </div>
          )}
          {/* 7행: 테이스팅 노트 (AI 요약) */}
          {tastingNotes && (
            <p className="py-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              {tastingNotes}
            </p>
          )}
        </div>
      </section>

      {/* ════ 섹션2: 사진 ════ */}
      {photoSlot && (
        <section className="px-4 py-4">
          {photoSlot}
        </section>
      )}

      {/* ════ 섹션3: 테이스팅 ════ */}
      <section ref={quadrantSectionRef} className="relative px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          테이스팅
        </h3>
        <QuadrantInput type="wine" value={quadrant} onChange={handleQuadrantChange} referencePoints={referenceRecords} showHint={saveHint} hideDot={!quadrantTouched} />
      </section>

      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          향 프로필 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--accent-wine)' }}>AI 감지</span>
        </h3>
        <AromaWheel value={aroma} onChange={setAroma} />
      </section>

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

      {/* ════ 섹션4: 페어링 ════ */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          페어링
        </h3>
        <PairingGrid
          value={pairingCategories}
          onChange={setPairingCategories}
          customInput={pairingCustom}
          onCustomInputChange={setPairingCustom}
        />
      </section>

      {/* ════ 섹션5: 테이스팅 노트 ════ */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          테이스팅 노트 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        <textarea
          maxLength={200}
          value={tastingNotes || comment}
          onChange={(e) => { setTastingNotes(e.target.value); setComment(e.target.value) }}
          placeholder="이 와인을 한마디로?"
          rows={2}
          className="nyam-input w-full resize-none"
          style={{ backgroundColor: 'var(--bg-card)' }}
        />
        <span className="mt-1 block text-right" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
          {(tastingNotes || comment).length}/200
        </span>
      </section>

      {/* ════ 섹션6: 기타정보 ════ */}
      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          기타 정보 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
        </h3>
        <div className="flex flex-col gap-3">
          {/* 구입가격 */}
          <div className="flex items-center gap-3">
            <label className="w-16 shrink-0 text-[13px] font-medium" style={{ color: 'var(--text-sub)' }}>구입가</label>
            <div className="flex flex-1 items-center gap-1">
              <input type="number" inputMode="numeric" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0" className="nyam-input flex-1" style={{ backgroundColor: 'var(--bg-card)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>원</span>
            </div>
          </div>
          {/* 음용 날짜 */}
          <div className="flex items-center gap-3">
            <label className="w-16 shrink-0 text-[13px] font-medium" style={{ color: 'var(--text-sub)' }}>음용일</label>
            <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} max={todayInTz(detectBrowserTimezone())} className="nyam-input flex-1" style={{ backgroundColor: 'var(--bg-card)' }} />
          </div>
          {/* 식당 연결 */}
          <div className="flex items-center gap-3">
            <label className="w-16 shrink-0 text-[13px] font-medium" style={{ color: 'var(--text-sub)' }}>식당</label>
            {linkedRestaurant ? (
              <div className="flex flex-1 items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-food)' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{linkedRestaurant.name}</p>
                  {linkedRestaurant.meta && <p style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{linkedRestaurant.meta}</p>}
                </div>
                <button type="button" onClick={() => setLinkedRestaurant(null)} style={{ fontSize: '11px', color: 'var(--negative)' }}>해제</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowLinkSheet(true)} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-[13px] text-[var(--text-hint)]">
                식당 검색
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ════ 섹션7: 나만 보는 기록 ════ */}
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

      <LinkSearchSheet isOpen={showLinkSheet} onClose={() => setShowLinkSheet(false)} type="restaurant" onSelect={setLinkedRestaurant} />

      <RecordSaveBar
        variant="wine"
        onSave={() => {
          if (!isValid) {
            quadrantSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setTimeout(() => { setSaveHint(true); setTimeout(() => setSaveHint(false), 3000) }, 400)
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
