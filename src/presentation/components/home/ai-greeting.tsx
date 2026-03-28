'use client'

import { useRouter } from 'next/navigation'
import type { GreetingResult } from '@/domain/services/greeting-generator'

interface AiGreetingProps {
  greeting: GreetingResult
  isDismissing: boolean
  onDismiss: () => void
}

/**
 * AI 인사 컴포넌트
 * - 위치: 앱 헤더 아래, 넛지 스트립 위
 * - 서브텍스트: "● nyam AI · 나의 기록 기반"
 * - AI dot: 5x5px, --positive (#7EAE8B), aiPulse 2s
 * - 소멸: 5초 후 자동 (opacity + max-height fade, 0.6s cubic-bezier)
 * - data-restaurant-id 있으면 탭 시 /restaurants/${restaurantId} 이동
 */
export function AiGreeting({ greeting, isDismissing }: AiGreetingProps) {
  const router = useRouter()

  const handleClick = () => {
    if (greeting.restaurantId) {
      router.push(`/restaurants/${greeting.restaurantId}`)
    }
  }

  return (
    <div
      role={greeting.restaurantId ? 'button' : undefined}
      tabIndex={greeting.restaurantId ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick() }}
      data-restaurant-id={greeting.restaurantId ?? undefined}
      style={{
        padding: isDismissing ? '0 20px' : '14px 20px 12px',
        background: 'var(--bg)',
        cursor: greeting.restaurantId ? 'pointer' : 'default',
        maxHeight: isDismissing ? '0px' : '120px',
        opacity: isDismissing ? 0 : 1,
        overflow: 'hidden',
        transition: 'max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1), padding 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease',
      }}
    >
      <p
        style={{
          fontSize: '15px',
          fontWeight: 500,
          color: 'var(--text)',
          lineHeight: 1.55,
          letterSpacing: '-0.2px',
        }}
      >
        {greeting.message}
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '4px',
          fontSize: '11px',
          color: 'var(--text-hint)',
        }}
      >
        <span
          className="animate-[aiPulse_2s_ease_infinite]"
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: 'var(--positive)',
            display: 'inline-block',
          }}
        />
        nyam AI · 나의 기록 기반
      </div>
    </div>
  )
}
