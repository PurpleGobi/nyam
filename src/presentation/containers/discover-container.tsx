'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import type { DiscoverArea } from '@/domain/entities/discover'
import { AreaChips } from '@/presentation/components/discover/area-chips'

export function DiscoverContainer() {
  const router = useRouter()
  const [activeArea, setActiveArea] = useState<DiscoverArea | null>(null)

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <nav className="flex items-center px-4" style={{ height: '44px' }}>
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <span className="flex-1 text-center" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>탐색</span>
        <div className="w-11" />
      </nav>

      <AreaChips activeArea={activeArea} onAreaChange={setActiveArea} />

      <div className="flex flex-col items-center px-4 py-12">
        <span style={{ fontSize: '48px' }}>🔍</span>
        <p className="mt-4 text-[15px] font-semibold text-[var(--text)]">
          {activeArea ? `${activeArea} 맛집을 탐색해보세요` : '지역을 선택하세요'}
        </p>
        <p className="mt-1 text-[13px] text-[var(--text-hint)]">
          권위 있는 맛집과 높은 평가의 식당을 발견하세요
        </p>
      </div>
    </div>
  )
}
