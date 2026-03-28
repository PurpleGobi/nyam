'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Shield, SlidersHorizontal, Download, Share2 } from 'lucide-react'
import { toPng } from 'html-to-image'
import { useWrapped } from '@/application/hooks/use-wrapped'
import { useSettings } from '@/application/hooks/use-settings'
import { WrappedCard } from '@/presentation/components/profile/wrapped-card'
import { GaugeSlider } from '@/presentation/components/profile/gauge-slider'
import type { WrappedCategory } from '@/domain/entities/profile'

const FILTER_TABS: { key: WrappedCategory; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'restaurant', label: '식당' },
  { key: 'wine', label: '와인' },
]

const DEFAULT_VISIBILITY = {
  score: true, comment: true, photos: true, level: true,
  quadrant: true, bubbles: true, price: true,
}

export function WrappedContainer() {
  const router = useRouter()
  const [category, setCategory] = useState<WrappedCategory>('all')
  const [gaugePrivacy, setGaugePrivacy] = useState<0 | 1 | 2>(1)
  const [gaugeDetail, setGaugeDetail] = useState<0 | 1 | 2>(1)
  const { data: wrappedData } = useWrapped(category)
  const { settings } = useSettings()
  const cardRef = useRef<HTMLDivElement>(null)

  const handleSave = useCallback(async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `nyam-wrapped-${category}.png`
      link.href = dataUrl
      link.click()
    } catch {
      // 저장 실패 시 무시
    }
  }, [category])

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `nyam-wrapped-${category}.png`, { type: 'image/png' })
      if (navigator.share) {
        await navigator.share({ files: [file] })
      } else {
        // Web Share API 미지원 시 다운로드 폴백
        const link = document.createElement('a')
        link.download = file.name
        link.href = dataUrl
        link.click()
      }
    } catch {
      // 공유 취소 또는 실패 시 무시
    }
  }, [category])

  return (
    <div className="content-detail flex min-h-dvh flex-col bg-[var(--bg)]">
      {/* Navigation */}
      <nav className="flex items-center px-4" style={{ height: '44px' }}>
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <span className="flex-1 text-center" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          Wrapped
        </span>
        <div className="w-11" />
      </nav>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3">
        {FILTER_TABS.map((tab) => {
          const isActive = category === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategory(tab.key)}
              className="rounded-full px-4 py-1.5 transition-colors"
              style={{
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                backgroundColor: isActive ? 'var(--accent-food)' : 'var(--bg-card)',
                color: isActive ? '#FFFFFF' : 'var(--text-sub)',
                border: isActive ? 'none' : '1px solid var(--border)',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Gauge Sliders */}
      <div className="flex flex-col gap-3 px-4">
        <GaugeSlider
          icon={Shield}
          label="개인정보"
          options={['최소', '보통', '공개']}
          value={gaugePrivacy}
          onChange={setGaugePrivacy}
        />
        <GaugeSlider
          icon={SlidersHorizontal}
          label="디테일"
          options={['심플', '보통', '상세']}
          value={gaugeDetail}
          onChange={setGaugeDetail}
        />
      </div>

      {/* Content */}
      <div className="flex-1 pb-20 pt-4">
        {wrappedData ? (
          <>
            <div ref={cardRef}>
              <WrappedCard
                category={category}
                data={wrappedData}
                gaugePrivacy={gaugePrivacy}
                gaugeDetail={gaugeDetail}
                visibilityPublic={settings?.visibilityPublic ?? DEFAULT_VISIBILITY}
              />
            </div>

            {/* 저장/공유 버튼 */}
            <div className="mt-4 flex justify-center gap-3 px-4">
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-full px-4 py-2"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-sub)',
                  border: '1px solid var(--border)',
                }}
              >
                <Download size={14} />
                저장
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-full px-4 py-2"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'var(--accent-food)',
                  color: '#FFFFFF',
                }}
              >
                <Share2 size={14} />
                공유
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-20">
            <p style={{ fontSize: '14px', color: 'var(--text-hint)' }}>기록이 없습니다</p>
            <p className="mt-1" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
              첫 기록을 남겨보세요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
