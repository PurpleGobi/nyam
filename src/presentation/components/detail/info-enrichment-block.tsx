'use client'

import { useState, useMemo } from 'react'
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Home,
  Wallet,
  UtensilsCrossed,
  ExternalLink,
  ChevronDown,
  Star,
  Loader2,
} from 'lucide-react'
import type {
  RestaurantEnrichment,
  EnrichmentSource,
  EnrichmentSourceType,
} from '@/domain/entities/restaurant-enrichment'

interface InfoEnrichmentBlockProps {
  enrichment: RestaurantEnrichment | null
  /** 초기 fetch 중 여부. 현재는 banner 표시 기준에만 간접 사용 */
  isLoading: boolean
}

const SOURCE_LABEL: Record<EnrichmentSourceType, string> = {
  naver_blog: '네이버 블로그',
  naver_local: '네이버 Local',
  naver_news: '네이버 뉴스',
  google_review: '구글 리뷰',
  google_place: '구글 Places',
  youtube: '유튜브',
  kakao_local: '카카오맵',
  other_web: '웹',
}

const SOURCE_COLOR: Record<EnrichmentSourceType, string> = {
  naver_blog: '#03C75A',
  naver_local: '#03C75A',
  naver_news: '#03C75A',
  google_review: '#4285F4',
  google_place: '#4285F4',
  youtube: '#FF0000',
  kakao_local: '#FEE500',
  other_web: 'var(--text-hint)',
}

function pickSourcesByIds(all: EnrichmentSource[], ids: number[]): EnrichmentSource[] {
  const map = new Map(all.map((s) => [s.id, s]))
  return ids.map((id) => map.get(id)).filter((s): s is EnrichmentSource => !!s)
}

function SourceChips({ sources }: { sources: EnrichmentSource[] }) {
  if (sources.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {sources.map((s) => (
        <a
          key={s.id}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{
            fontSize: '10px',
            fontWeight: 500,
            color: 'var(--text-sub)',
            backgroundColor: 'var(--bg-elevated)',
            border: `1px solid ${SOURCE_COLOR[s.type]}33`,
          }}
          title={s.title}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: SOURCE_COLOR[s.type] }}
          />
          {SOURCE_LABEL[s.type]}
          <ExternalLink size={9} style={{ color: 'var(--text-hint)' }} />
        </a>
      ))}
    </div>
  )
}

function StatusBanner({ status, error }: { status: RestaurantEnrichment['status']; error: string | null }) {
  if (status === 'pending' || status === 'processing') {
    return (
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2.5"
        style={{ backgroundColor: 'var(--bg-elevated)', fontSize: '12px', color: 'var(--text-sub)' }}
      >
        <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent-food)' }} />
        <span>웹에서 정보 수집 중… 잠시만 기다려 주세요.</span>
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div
        className="rounded-lg px-3 py-2.5"
        style={{ backgroundColor: 'var(--bg-elevated)', fontSize: '12px', color: 'var(--text-hint)' }}
      >
        외부 정보를 가져오지 못했어요.
        {error ? <span className="ml-1 opacity-60">({error.slice(0, 60)})</span> : null}
      </div>
    )
  }
  return null
}

export function InfoEnrichmentBlock({ enrichment, isLoading: _isLoading }: InfoEnrichmentBlockProps) {
  const [linksOpen, setLinksOpen] = useState(false)

  const sources = useMemo(() => enrichment?.sources ?? [], [enrichment])
  const sourceCountsByType = useMemo(() => {
    const counts: Partial<Record<EnrichmentSourceType, number>> = {}
    for (const s of sources) counts[s.type] = (counts[s.type] ?? 0) + 1
    return counts
  }, [sources])

  // row가 아직 없거나 로딩 중이면 pending으로 간주 → 검색중 배너 노출
  const status = enrichment?.status ?? 'pending'
  const ai = enrichment?.aiSummary ?? null
  const ratings = enrichment?.externalRatings ?? null

  const hasAnyRating = !!(ratings?.naver ?? ratings?.google)
  const hasAnyAi =
    !!ai &&
    (ai.pros.length > 0 ||
      ai.cons.length > 0 ||
      !!ai.atmosphere ||
      !!ai.priceRange ||
      ai.signatures.length > 0)

  // 상태별 UI
  if (status !== 'done') {
    return (
      <div className="mt-4">
        <StatusBanner status={status} error={enrichment?.errorMessage ?? null} />
      </div>
    )
  }

  if (!hasAnyAi && !hasAnyRating && sources.length === 0) return null

  return (
    <div
      className="mt-4 rounded-xl p-3.5"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-elevated)',
      }}
    >
      {/* 헤더 */}
      <div className="mb-3 flex items-center gap-1.5">
        <Sparkles size={14} style={{ color: 'var(--accent-food)' }} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
          웹 정보 요약 (AI)
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
          · 출처 {sources.length}곳
        </span>
      </div>

      {/* AI 요약 */}
      {ai && (
        <div className="flex flex-col gap-3">
          {ai.pros.length > 0 && (
            <ClaimRow
              icon={<ThumbsUp size={12} style={{ color: 'var(--positive)' }} />}
              label="장점"
              items={ai.pros}
              allSources={sources}
            />
          )}
          {ai.cons.length > 0 && (
            <ClaimRow
              icon={<ThumbsDown size={12} style={{ color: 'var(--caution)' }} />}
              label="단점"
              items={ai.cons}
              allSources={sources}
            />
          )}
          {ai.atmosphere && ai.atmosphere.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                <Home size={12} style={{ color: 'var(--text-hint)' }} />
                <span style={{ fontWeight: 600 }}>분위기</span>
                <span>{ai.atmosphere.tags.join(' · ')}</span>
              </div>
              <SourceChips sources={pickSourcesByIds(sources, ai.atmosphere.sourceIds)} />
            </div>
          )}
          {ai.priceRange && (
            <div>
              <div className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                <Wallet size={12} style={{ color: 'var(--text-hint)' }} />
                <span style={{ fontWeight: 600 }}>가격대</span>
                <span>{ai.priceRange.text}</span>
              </div>
              <SourceChips sources={pickSourcesByIds(sources, ai.priceRange.sourceIds)} />
            </div>
          )}
          {ai.signatures.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                <UtensilsCrossed size={12} style={{ color: 'var(--text-hint)' }} />
                <span style={{ fontWeight: 600 }}>시그니처</span>
              </div>
              <div className="mt-1 flex flex-col gap-1.5">
                {ai.signatures.map((sig, i) => (
                  <div key={i}>
                    <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                      <span style={{ fontWeight: 600 }}>{sig.name}</span>
                      <span style={{ color: 'var(--text-hint)' }}> · 언급 {sig.mentionCount}회</span>
                    </div>
                    <SourceChips sources={pickSourcesByIds(sources, sig.sourceIds)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 외부 평점 */}
      {hasAnyRating && (
        <div
          className="mt-3 flex flex-col gap-1.5 rounded-lg p-2"
          style={{ backgroundColor: 'var(--bg)' }}
        >
          <div className="flex items-center gap-1.5" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sub)' }}>
            <Star size={11} style={{ color: 'var(--text-hint)' }} />
            외부 평점
          </div>
          {ratings?.google && (
            <a
              href={ratings.google.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between"
              style={{ fontSize: '12px', color: 'var(--text)' }}
            >
              <span>
                <span style={{ color: '#4285F4', fontWeight: 600 }}>구글</span> ★{ratings.google.rating.toFixed(1)}
                <span style={{ color: 'var(--text-hint)' }}> · {ratings.google.count.toLocaleString()} 리뷰</span>
              </span>
              <ExternalLink size={10} style={{ color: 'var(--text-hint)' }} />
            </a>
          )}
          {ratings?.naver && (
            <a
              href={ratings.naver.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between"
              style={{ fontSize: '12px', color: 'var(--text)' }}
            >
              <span>
                <span style={{ color: '#03C75A', fontWeight: 600 }}>네이버</span> ★{ratings.naver.rating.toFixed(1)}
                <span style={{ color: 'var(--text-hint)' }}> · {ratings.naver.count.toLocaleString()} 리뷰</span>
              </span>
              <ExternalLink size={10} style={{ color: 'var(--text-hint)' }} />
            </a>
          )}
        </div>
      )}

      {/* 전체 출처 */}
      {sources.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setLinksOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5"
            style={{ backgroundColor: 'var(--bg)', fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)' }}
          >
            <span>
              전체 출처 ({sources.length}) ·{' '}
              {Object.entries(sourceCountsByType)
                .map(([type, count]) => `${SOURCE_LABEL[type as EnrichmentSourceType]} ${count}`)
                .join(' / ')}
            </span>
            <ChevronDown
              size={14}
              style={{
                transform: linksOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
          {linksOpen && (
            <ul className="mt-1.5 flex flex-col gap-1">
              {sources.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-1.5 rounded-md px-2 py-1.5"
                    style={{ fontSize: '12px', color: 'var(--text)' }}
                  >
                    <span
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: SOURCE_COLOR[s.type] }}
                    />
                    <span className="flex-1 truncate" title={s.title}>
                      <span style={{ color: 'var(--text-hint)', fontSize: '10px', marginRight: 4 }}>
                        {SOURCE_LABEL[s.type]}
                      </span>
                      {s.title}
                    </span>
                    <ExternalLink size={10} style={{ color: 'var(--text-hint)' }} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 안내 */}
      <div
        className="mt-3 border-t pt-2.5"
        style={{ borderColor: 'var(--border)', fontSize: '10px', color: 'var(--text-hint)' }}
      >
        ※ 회원 기록이 없는 식당을 위한 AI 자동 요약입니다. 원본 자료의 의견이며, 정확도는 출처마다 다를 수 있습니다.
      </div>
    </div>
  )
}

function ClaimRow({
  icon,
  label,
  items,
  allSources,
}: {
  icon: React.ReactNode
  label: string
  items: { text: string; quote?: string; sourceIds: number[] }[]
  allSources: EnrichmentSource[]
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
        {icon}
        <span style={{ fontWeight: 600 }}>{label}</span>
      </div>
      <ul className="mt-1 flex flex-col gap-1.5">
        {items.map((c, i) => (
          <li key={i}>
            <div style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5 }}>
              {c.text}
              {c.quote && (
                <span
                  className="ml-1"
                  style={{ color: 'var(--text-sub)', fontStyle: 'italic' }}
                >
                  “{c.quote}”
                </span>
              )}
            </div>
            <SourceChips sources={pickSourcesByIds(allSources, c.sourceIds)} />
          </li>
        ))}
      </ul>
    </div>
  )
}
