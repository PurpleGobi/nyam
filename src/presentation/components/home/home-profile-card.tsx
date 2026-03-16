'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/shared/utils/cn'
import { User, Heart, Users, Utensils, Wine, Briefcase, Cake, MapPin } from 'lucide-react'
import type { TasteDna, TasteDnaWine } from '@/domain/entities/taste-dna'
import type {
  ExperienceAtlasRegion,
  ExperienceAtlasGenre,
  ExperienceAtlasScene,
} from '@/domain/entities/experience-atlas'

type TasteMode = 'food' | 'wine'

const FOOD_AXES = [
  { key: 'flavorSpicy' as const, label: '매운맛' },
  { key: 'flavorSweet' as const, label: '단맛' },
  { key: 'flavorSalty' as const, label: '짠맛' },
  { key: 'flavorSour' as const, label: '신맛' },
  { key: 'flavorUmami' as const, label: '감칠맛' },
  { key: 'flavorRich' as const, label: '풍미' },
]

const WINE_AXES = [
  { key: 'prefBody' as const, label: '바디' },
  { key: 'prefAcidity' as const, label: '산미' },
  { key: 'prefTannin' as const, label: '타닌' },
  { key: 'prefSweetness' as const, label: '당도' },
  { key: 'aromaFruit' as const, label: '과일향' },
  { key: 'aromaOak' as const, label: '오크' },
]

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function polygonPoints(cx: number, cy: number, r: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const { x, y } = polar(cx, cy, r, (360 / n) * i)
    return `${x},${y}`
  }).join(' ')
}

function dataPoints(cx: number, cy: number, maxR: number, values: number[]) {
  return values
    .map((v, i) => {
      const { x, y } = polar(cx, cy, (v * maxR), (360 / values.length) * i)
      return `${x},${y}`
    })
    .join(' ')
}

function RadarChart({
  values,
  labels,
  color,
}: {
  values: number[]
  labels: string[]
  color: string
}) {
  const CX = 64
  const CY = 64
  const R = 46

  return (
    <svg width={128} height={128} viewBox="0 0 128 128">
      {[0.33, 0.66, 1].map((s) => (
        <polygon
          key={s}
          points={polygonPoints(CX, CY, R * s, 6)}
          fill="none"
          stroke="var(--color-neutral-200)"
          strokeWidth={0.5}
        />
      ))}
      {labels.map((_, i) => {
        const end = polar(CX, CY, R, (360 / 6) * i)
        return (
          <line
            key={i}
            x1={CX} y1={CY} x2={end.x} y2={end.y}
            stroke="var(--color-neutral-200)"
            strokeWidth={0.4}
          />
        )
      })}
      <polygon
        points={dataPoints(CX, CY, R, values)}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.4}
      />
      {values.map((v, i) => {
        const { x, y } = polar(CX, CY, v * R, (360 / values.length) * i)
        return <circle key={i} cx={x} cy={y} r={2.5} fill={color} />
      })}
      {labels.map((label, i) => {
        const { x, y } = polar(CX, CY, R + 12, (360 / 6) * i)
        return (
          <text
            key={label} x={x} y={y}
            textAnchor="middle" dominantBaseline="central"
            className="fill-[var(--color-neutral-500)]"
            fontSize={7.5} fontFamily="Pretendard"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}

const SCENE_ICONS: Record<string, React.ReactNode> = {
  '혼밥': <User className="h-3 w-3" />,
  '데이트': <Heart className="h-3 w-3" />,
  '회식': <Users className="h-3 w-3" />,
  '비즈니스': <Briefcase className="h-3 w-3" />,
  '기념일': <Cake className="h-3 w-3" />,
  '와인바': <Wine className="h-3 w-3" />,
}

export function HomeProfileCard({
  nickname,
  level,
  points,
  pointsToNextLevel,
  stats,
  tasteDna,
  tasteDnaWine,
  regions,
  genres,
  scenes,
}: {
  nickname: string
  level: number
  points: number
  pointsToNextLevel: number
  stats: { records: number; places: number; groups: number }
  tasteDna: TasteDna | null
  tasteDnaWine: TasteDnaWine | null
  regions: ExperienceAtlasRegion[]
  genres: ExperienceAtlasGenre[]
  scenes: ExperienceAtlasScene[]
}) {
  const [tasteMode, setTasteMode] = useState<TasteMode>('food')

  const initial = nickname.charAt(0).toUpperCase()
  const xpProgress = pointsToNextLevel > 0 ? Math.min((points / pointsToNextLevel) * 100, 100) : 0
  const remaining = Math.max(pointsToNextLevel - points, 0)

  const foodValues = tasteDna
    ? FOOD_AXES.map((a) => tasteDna[a.key])
    : []
  const foodTop3 = tasteDna
    ? [...FOOD_AXES]
        .sort((a, b) => tasteDna[b.key] - tasteDna[a.key])
        .slice(0, 3)
        .map((a) => ({ label: a.label, value: tasteDna[a.key] }))
    : []

  const wineValues = tasteDnaWine
    ? WINE_AXES.map((a) => tasteDnaWine[a.key])
    : []
  const wineTop = tasteDnaWine
    ? [
        ...(tasteDnaWine.preferredVarieties.slice(0, 2).map((v) => ({ label: v, type: 'variety' as const }))),
        ...(tasteDnaWine.preferredOrigins.slice(0, 1).map((o) => ({ label: o, type: 'origin' as const }))),
      ]
    : []

  const hasFood = foodValues.length > 0
  const hasWine = wineValues.length > 0

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-sm)]">
      {/* Top row: identity + level */}
      <div className="flex items-center gap-3 p-4 pb-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary-400)] to-[var(--color-primary-600)] text-sm font-bold text-white">
          {initial}
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold text-[var(--color-neutral-800)]">
            {nickname}의 맛 노트
          </span>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-neutral-500)]">
            <span>{stats.records} 기록</span>
            <span>{stats.places} 장소</span>
            <span>{stats.groups} 버블</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="rounded-lg bg-[var(--color-primary-50)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-primary-600)]">
            Lv.{level}
          </span>
          <div className="flex items-center gap-1">
            <div className="h-1 w-16 overflow-hidden rounded-full bg-[var(--color-neutral-100)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary-500)] transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <span className="text-[9px] text-[var(--color-neutral-400)]">{remaining}xp</span>
          </div>
        </div>
      </div>

      {/* Taste DNA card section */}
      <div className="px-4 pb-4 pt-3">
        {/* Header + toggle */}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-neutral-400)]">
            Taste DNA
          </span>
          {(hasFood || hasWine) && (
            <div className="flex rounded-lg bg-[var(--color-neutral-100)] p-0.5">
              {(['food', 'wine'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTasteMode(mode)}
                  className={cn(
                    'rounded-md px-3 py-1 text-[10px] font-semibold transition-all duration-200',
                    tasteMode === mode
                      ? mode === 'food'
                        ? 'bg-[var(--color-primary-500)] text-white shadow-sm'
                        : 'bg-[#6B4C8A] text-white shadow-sm'
                      : 'text-[var(--color-neutral-400)]',
                  )}
                >
                  {mode === 'food' ? 'Food' : 'Wine'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Flip card */}
        <div className="relative" style={{ perspective: '800px' }}>
          <AnimatePresence mode="wait">
            {tasteMode === 'food' ? (
              <motion.div
                key="food"
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="rounded-xl bg-[var(--color-neutral-50)] p-3"
                style={{ backfaceVisibility: 'hidden' }}
              >
                {hasFood ? (
                  <div className="flex items-center gap-2">
                    <RadarChart
                      values={foodValues}
                      labels={FOOD_AXES.map((a) => a.label)}
                      color="var(--color-primary-500)"
                    />
                    <div className="flex flex-1 flex-col gap-1.5">
                      {foodTop3.map((t) => (
                        <div key={t.label} className="flex items-center gap-2">
                          <span className="w-12 text-[10px] text-[var(--color-neutral-600)]">{t.label}</span>
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-neutral-200)]">
                            <div
                              className="h-full rounded-full bg-[var(--color-primary-500)]"
                              style={{ width: `${t.value * 100}%` }}
                            />
                          </div>
                          <span className="w-6 text-right text-[10px] font-semibold text-[var(--color-primary-600)]">
                            {(t.value * 100).toFixed(0)}
                          </span>
                        </div>
                      ))}
                      {tasteDna && (
                        <div className="mt-1 text-[9px] text-[var(--color-neutral-400)]">
                          {tasteDna.sampleCount}개 기록 기반
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-xs text-[var(--color-neutral-400)]">
                    기록이 쌓이면 맛 취향이 분석돼요
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="wine"
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -90, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="rounded-xl bg-[#F8F5FA] p-3"
                style={{ backfaceVisibility: 'hidden' }}
              >
                {hasWine ? (
                  <div className="flex items-center gap-2">
                    <RadarChart
                      values={wineValues}
                      labels={WINE_AXES.map((a) => a.label)}
                      color="#6B4C8A"
                    />
                    <div className="flex flex-1 flex-col gap-1.5">
                      {WINE_AXES.slice(0, 3).map((a) => (
                        <div key={a.key} className="flex items-center gap-2">
                          <span className="w-10 text-[10px] text-[var(--color-neutral-600)]">{a.label}</span>
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#EDE6F5]">
                            <div
                              className="h-full rounded-full bg-[#6B4C8A]"
                              style={{ width: `${(tasteDnaWine?.[a.key] ?? 0) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {wineTop.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {wineTop.map((t) => (
                            <span
                              key={t.label}
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[9px] font-medium',
                                t.type === 'variety'
                                  ? 'bg-[#EDE6F5] text-[#6B4C8A]'
                                  : 'bg-[#F0ECE6] text-[#8B7355]',
                              )}
                            >
                              {t.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {tasteDnaWine && (
                        <div className="mt-1 text-[9px] text-[var(--color-neutral-400)]">
                          {tasteDnaWine.sampleCount}개 기록 기반
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-xs text-[var(--color-neutral-400)]">
                    와인 기록이 쌓이면 취향이 분석돼요
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Experience Atlas */}
      {(regions.length > 0 || genres.length > 0 || scenes.length > 0) && (
        <div className="border-t border-[var(--color-neutral-100)] px-4 pb-4 pt-3">
          <span className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-[var(--color-neutral-400)]">
            Experience Atlas
          </span>

          <div className="flex gap-4">
            {/* WHERE — 지역 태그 클라우드 */}
            {regions.length > 0 && (
              <div className="flex-1">
                <div className="mb-1.5 flex items-center gap-1 text-[9px] font-semibold text-[var(--color-neutral-400)]">
                  <MapPin className="h-2.5 w-2.5" />
                  WHERE
                </div>
                <div className="flex flex-wrap gap-1">
                  {regions.slice(0, 5).map((r) => (
                    <span
                      key={r.region}
                      className="rounded-full px-2 py-0.5 font-medium text-[var(--color-neutral-700)]"
                      style={{
                        fontSize: Math.max(9, Math.min(14, 9 + r.level)),
                        fontWeight: r.level >= 5 ? 700 : r.level >= 3 ? 500 : 400,
                        backgroundColor: r.level >= 5 ? 'var(--color-primary-50)' : 'var(--color-neutral-100)',
                        color: r.level >= 5 ? 'var(--color-primary-600)' : undefined,
                      }}
                    >
                      {r.region}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* WHAT — 장르 태그 클라우드 */}
            {genres.length > 0 && (
              <div className="flex-1">
                <div className="mb-1.5 flex items-center gap-1 text-[9px] font-semibold text-[var(--color-neutral-400)]">
                  <Utensils className="h-2.5 w-2.5" />
                  WHAT
                </div>
                <div className="flex flex-wrap items-baseline gap-1">
                  {genres.slice(0, 5).map((g) => (
                    <span
                      key={g.category}
                      className="text-[var(--color-neutral-700)]"
                      style={{
                        fontSize: Math.max(9, Math.min(15, 9 + g.level)),
                        fontWeight: g.level >= 5 ? 700 : g.level >= 3 ? 600 : 400,
                        opacity: Math.max(0.4, Math.min(1, 0.3 + g.level * 0.12)),
                      }}
                    >
                      {g.category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* WHY — 씬 아이콘 뱃지 */}
          {scenes.length > 0 && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center gap-1 text-[9px] font-semibold text-[var(--color-neutral-400)]">
                WHY
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scenes.slice(0, 5).map((s) => (
                  <span
                    key={s.scene}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--color-neutral-50)] px-2 py-0.5 text-[10px] text-[var(--color-neutral-600)]"
                    style={{ opacity: Math.max(0.4, Math.min(1, 0.3 + s.level * 0.12)) }}
                  >
                    <span className="flex-shrink-0">
                      {SCENE_ICONS[s.scene] ?? <Utensils className="h-2.5 w-2.5" />}
                    </span>
                    {s.scene}
                    <span className="text-[8px] text-[var(--color-neutral-400)]">
                      Lv.{s.level}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
