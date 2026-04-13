'use client'

import { useState, useCallback, useRef } from 'react'
import { Wine, Sparkles, Lock, GlassWater, CalendarRange, Thermometer, UtensilsCrossed, Grape, Info, X, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react'
import { WINE_TYPE_COLORS } from '@/domain/entities/wine'
import type { WineType, PriceReview } from '@/domain/entities/wine'
import type { AromaSelection, AromaSectorId } from '@/domain/entities/aroma'
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
  referencePriceMin?: number
  referencePriceMax?: number
  drinkingWindowStart?: number
  drinkingWindowEnd?: number
  vivinoRating?: number
  criticScores?: { RP?: number; WS?: number; JR?: number; JH?: number }
  tastingNotes?: string
  foodPairings?: string[]
  priceReview?: PriceReview
  aromaPrimary?: string[]
  aromaSecondary?: string[]
  aromaTertiary?: string[]
  balance?: number
  finish?: number
  intensity?: number
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
    referencePriceMin: number | null
    referencePriceMax: number | null
    drinkingWindowStart: number | null
    drinkingWindowEnd: number | null
    vivinoRating: number | null
    criticScores: { RP?: number; WS?: number } | null
    tastingNotes: string | null
  }
  axisX?: number | null
  axisY?: number | null
  satisfaction?: number | null
  aromaPrimary: string[]
  aromaSecondary: string[]
  aromaTertiary: string[]
  complexity?: number
  finish?: number
  balance?: number
  intensity?: number
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
  aromaPrimary: string[]
  aromaSecondary: string[]
  aromaTertiary: string[]
  complexity: number | null
  finish: number | null
  balance: number | null
  intensity: number | null
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

function countActiveRings(sel: AromaSelection): number {
  let count = 0
  if (sel.primary.length > 0) count++
  if (sel.secondary.length > 0) count++
  if (sel.tertiary.length > 0) count++
  return count
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
  const [subRegion, setSubRegion] = useState(() => {
    if (target.subRegion) return target.subRegion
    // DB에 sub_region이 없고 appellation이 sub_region 목록에 있으면 채움
    if (target.appellation && target.region) {
      const subs = WINE_SUB_REGIONS[target.region] ?? []
      if (subs.includes(target.appellation)) return target.appellation
    }
    return ''
  })
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
  const [referencePriceMin, setReferencePriceMin] = useState(target.referencePriceMin ? String(target.referencePriceMin) : '')
  const [referencePriceMax, setReferencePriceMax] = useState(target.referencePriceMax ? String(target.referencePriceMax) : '')
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
    primary: (initialData?.aromaPrimary ?? target.aromaPrimary ?? []) as AromaSectorId[],
    secondary: (initialData?.aromaSecondary ?? target.aromaSecondary ?? []) as AromaSectorId[],
    tertiary: (initialData?.aromaTertiary ?? target.aromaTertiary ?? []) as AromaSectorId[],
  })
  const [structure, setStructure] = useState<WineStructure>({
    balance: initialData?.balance ?? target.balance ?? 50,
    finish: initialData?.finish ?? target.finish ?? 50,
    intensity: initialData?.intensity ?? target.intensity ?? 50,
    complexity: initialData?.complexity ?? 30,
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
  const [showPriceReview, setShowPriceReview] = useState(false)
  const isManualOverrideRef = useRef(false)

  const aromaRingCount = countActiveRings(aroma)

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
        referencePriceMin: referencePriceMin ? Number(referencePriceMin) : null,
        referencePriceMax: referencePriceMax ? Number(referencePriceMax) : null,
        drinkingWindowStart: drinkingWindowStart ? Number(drinkingWindowStart) : null,
        drinkingWindowEnd: drinkingWindowEnd ? Number(drinkingWindowEnd) : null,
        vivinoRating: vivinoRating ? Number(vivinoRating) : null,
        criticScores: (criticRP || criticWS) ? { RP: criticRP ? Number(criticRP) : undefined, WS: criticWS ? Number(criticWS) : undefined } : null,
        tastingNotes: tastingNotes || null,
      },
      axisX: quadrant.x,
      axisY: quadrant.y,
      satisfaction: Math.round((quadrant.x + quadrant.y) / 2),
      aromaPrimary: aroma.primary,
      aromaSecondary: aroma.secondary,
      aromaTertiary: aroma.tertiary,
      complexity: structure.complexity,
      finish: structure.finish,
      balance: structure.balance,
      intensity: structure.intensity,
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
  }, [isValid, producer, vintage, region, subRegion, appellation, country, varieties, abv, bodyLevel, acidityLevel, sweetnessLevel, classification, servingTemp, decanting, referencePriceMin, referencePriceMax, drinkingWindowStart, drinkingWindowEnd, vivinoRating, criticRP, criticWS, tastingNotes, quadrant, aroma, structure, autoScore, pairingCategories, comment, purchasePrice, companions, privateNote, visitDate, target.id, onSave, linkedRestaurant])

  const buildWineMetaUpdate = useCallback(() => ({
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
    referencePriceMin: referencePriceMin ? Number(referencePriceMin) : null,
    referencePriceMax: referencePriceMax ? Number(referencePriceMax) : null,
    drinkingWindowStart: drinkingWindowStart ? Number(drinkingWindowStart) : null,
    drinkingWindowEnd: drinkingWindowEnd ? Number(drinkingWindowEnd) : null,
    vivinoRating: vivinoRating ? Number(vivinoRating) : null,
    criticScores: (criticRP || criticWS) ? { RP: criticRP ? Number(criticRP) : undefined, WS: criticWS ? Number(criticWS) : undefined } : null,
    tastingNotes: tastingNotes || null,
  }), [vintage, producer, region, subRegion, appellation, country, varieties, abv, bodyLevel, acidityLevel, sweetnessLevel, classification, servingTemp, decanting, referencePriceMin, referencePriceMax, drinkingWindowStart, drinkingWindowEnd, vivinoRating, criticRP, criticWS, tastingNotes])

  const handleQuickSave = useCallback(async (_status: 'tasted' | 'cellar') => {
    await onSave({
      targetId: target.id,
      targetType: 'wine',
      wineMetaUpdate: buildWineMetaUpdate(),
      axisX: null,
      axisY: null,
      satisfaction: null,
      aromaPrimary: [],
      aromaSecondary: [],
      aromaTertiary: [],
      pairingCategories: [],
      visitDate,
    })
  }, [target.id, onSave, buildWineMetaUpdate, visitDate])

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
                {wineType ? (
                  <span
                    className="shrink-0 cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: WINE_TYPE_COLORS[wineType as WineType] ?? 'var(--accent-wine)' }}
                    onClick={() => {
                      const types = WINE_TYPES.map((t) => t.value as string)
                      const idx = types.indexOf(wineType)
                      const next = types[(idx + 1) % types.length] as string
                      setWineType(next)
                      setVarieties([])
                    }}
                  >
                    {wineType.charAt(0).toUpperCase() + wineType.slice(1)}
                  </span>
                ) : (
                  <NyamSelect
                    value={wineType}
                    onChange={(v) => { setWineType(v); setVarieties([]) }}
                    options={WINE_TYPES.map((t) => ({ value: t.value, label: t.value.charAt(0).toUpperCase() + t.value.slice(1) }))}
                    placeholder="Style"
                    accentColor="var(--accent-wine)"
                    inline
                  />
                )}
              </span>
              {(classification || vivinoRating || criticRP || criticWS) && (
                <div className="flex shrink-0 items-center gap-2">
                  {classification && (
                    <span className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text-sub)' }}>
                      {classification}
                    </span>
                  )}
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
              {target.priceReview && (
                <button
                  type="button"
                  onClick={() => setShowPriceReview(true)}
                  className="flex items-center gap-0.5"
                  style={{ padding: '3px 8px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--bg-elevated)', cursor: 'pointer' }}
                >
                  <Info size={11} style={{ color: 'var(--text-sub)' }} />
                  <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-sub)' }}>추가정보</span>
                </button>
              )}
              <div className="flex shrink-0 items-baseline gap-0.5 text-[13px] font-semibold" style={{ color: 'var(--accent-wine)' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-hint)', fontWeight: 500 }}>적정가</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={referencePriceMin ? Number(referencePriceMin).toLocaleString() : ''}
                  onChange={(e) => setReferencePriceMin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="—"
                  className="w-12 border-0 bg-transparent p-0 text-right text-[13px] font-semibold outline-none"
                  style={{ color: 'inherit' }}
                />
                <span style={{ color: 'var(--text-hint)', fontWeight: 400 }}>~</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={referencePriceMax ? Number(referencePriceMax).toLocaleString() : ''}
                  onChange={(e) => setReferencePriceMax(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="—"
                  className="w-12 border-0 bg-transparent p-0 text-right text-[13px] font-semibold outline-none"
                  style={{ color: 'inherit' }}
                />
                {(referencePriceMin || referencePriceMax) && <span style={{ fontSize: '10px', color: 'var(--text-hint)', fontWeight: 500 }}>원</span>}
              </div>
            </div>
          </div>
        </div>
        {divider}

        {/* 2-4행: 인라인 드롭다운 (구분선 없이 컴팩트) */}
        <div className="flex flex-col gap-0 px-4 py-1.5">
          {/* 2행: Country › Region › Sub-region */}
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
                <Grape size={11} />
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
            <div className="inline-flex items-baseline gap-0.5 text-[13px] font-medium" style={{ color: abv ? 'var(--text)' : 'var(--text-hint)' }}>
              <span>ABV</span>
              <input type="text" inputMode="decimal" value={abv} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); setAbv(v) }} placeholder="—" className="w-7 border-0 bg-transparent p-0 text-right text-[13px] font-medium outline-none" style={{ color: 'inherit', fontFamily: 'inherit', lineHeight: 'inherit' }} />
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
            <p className="py-1 text-[12px] italic leading-relaxed" style={{ color: 'var(--text-sub)' }}>
              &ldquo;{tastingNotes}&rdquo;
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
        <div className="relative">
          <div className="absolute flex gap-2" style={{ top: '-28px', left: '120px', zIndex: 20 }}>
            <button
              type="button"
              onClick={() => handleQuickSave('cellar')}
              disabled={isLoading}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-wine) 10%, transparent)',
                color: 'var(--accent-wine)',
              }}
            >
              셀러에 보관
            </button>
            <button
              type="button"
              onClick={() => handleQuickSave('tasted')}
              disabled={isLoading}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-wine) 10%, transparent)',
                color: 'var(--accent-wine)',
              }}
            >
              아직이에요
            </button>
          </div>
          <QuadrantInput type="wine" value={quadrant} onChange={handleQuadrantChange} referencePoints={referenceRecords} showHint={saveHint} hideDot={!quadrantTouched} />
        </div>
      </section>

      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          향 프로필 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--accent-wine)' }}>AI 감지</span>
        </h3>
        <AromaWheel value={aroma} onChange={setAroma} />
      </section>

      <section className="px-4 py-4">
        <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          품질 평가 <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-hint)' }}>선택</span>
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

      {/* ════ 섹션5: 한줄평 ════ */}
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

      {/* 가격 분석 바텀시트 */}
      {showPriceReview && target.priceReview && (
        <>
          <div className="fixed inset-0 z-[200]" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setShowPriceReview(false)} />
          <div className="fixed left-1/2 top-1/2 z-[201] w-[calc(100%-40px)] max-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-2xl px-5 pb-6 pt-5" style={{ backgroundColor: 'var(--bg)', maxHeight: '80dvh', overflowY: 'auto' }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>가격 분석</h3>
              <button type="button" onClick={() => setShowPriceReview(false)} style={{ color: 'var(--text-hint)' }}><X size={20} /></button>
            </div>
            <div className="mb-3 flex items-center gap-2">
              {target.priceReview.verdict === 'buy' && (
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold text-white" style={{ backgroundColor: '#16a34a' }}><ShieldCheck size={15} /> 구매 추천</span>
              )}
              {target.priceReview.verdict === 'conditional_buy' && (
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold text-white" style={{ backgroundColor: '#f59e0b' }}><ShieldAlert size={15} /> 조건부 구매</span>
              )}
              {target.priceReview.verdict === 'avoid' && (
                <span className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold text-white" style={{ backgroundColor: '#dc2626' }}><ShieldX size={15} /> 비추천</span>
              )}
            </div>
            <p className="mb-4 leading-relaxed" style={{ fontSize: '14px', color: 'var(--text)' }}>{target.priceReview.summary}</p>
            {target.priceReview.alternatives.length > 0 && (
              <div>
                <p className="mb-2" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-hint)' }}>같은 가격대 대안</p>
                <div className="flex flex-col gap-2">
                  {target.priceReview.alternatives.map((alt) => (
                    <div key={alt.name} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: 'var(--bg-card)' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{alt.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-wine)' }}>{alt.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

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
