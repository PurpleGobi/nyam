'use client'

import { ArrowRight, Lock, Users } from 'lucide-react'
import type { OnboardingSeedBubble } from '@/domain/entities/onboarding'

interface BubbleExploreStepProps {
  seedBubbles: OnboardingSeedBubble[]
  userLevel: number
  isLoading: boolean
  onBubblePress: (bubble: OnboardingSeedBubble) => void
  onComplete: () => void
}

export function BubbleExploreStep({
  seedBubbles,
  userLevel,
  isLoading,
  onBubblePress,
  onComplete,
}: BubbleExploreStepProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="px-6 pt-6">
        <h2 className="text-[20px] font-bold" style={{ color: 'var(--text)' }}>
          인기 버블을 둘러보세요
        </h2>
        <p className="mt-1 text-[14px]" style={{ color: 'var(--text-sub)' }}>
          다양한 커뮤니티에서 맛집 정보를 공유해요
        </p>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto px-6 pb-28">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }} />
            ))}
          </div>
        ) : seedBubbles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-[13px]" style={{ color: 'var(--text-hint)' }}>아직 공개 버블이 없어요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {seedBubbles.map((b) => {
              const isLocked = b.minLevel > userLevel
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBubblePress(b)}
                  className="flex items-center gap-3 rounded-2xl p-4 transition-colors active:scale-[0.98]"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    opacity: isLocked ? 0.5 : 1,
                  }}
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[20px]"
                    style={{ backgroundColor: b.iconBgColor }}
                  >
                    {b.icon}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold" style={{ color: 'var(--text)' }}>{b.name}</p>
                      {isLocked && <Lock size={12} style={{ color: 'var(--text-hint)' }} />}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[12px]" style={{ color: 'var(--text-sub)' }}>
                      {b.description}
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Users size={11} style={{ color: 'var(--text-hint)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>{b.memberCount}명</span>
                      </div>
                      {b.minLevel > 0 && (
                        <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
                          Lv.{b.minLevel} 이상
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-6 pb-8 pt-4" style={{ backgroundColor: 'var(--bg)' }}>
        <button
          type="button"
          onClick={onComplete}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold text-white"
          style={{ backgroundColor: 'var(--accent-food)' }}
        >
          시작하기
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
