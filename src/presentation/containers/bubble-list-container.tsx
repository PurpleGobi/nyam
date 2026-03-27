'use client'

import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleList } from '@/application/hooks/use-bubble-list'
import { AppHeader } from '@/presentation/components/layout/app-header'

export function BubbleListContainer() {
  const router = useRouter()
  const { user } = useAuth()
  const { bubbles, isLoading } = useBubbleList(user?.id ?? null)

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader variant="inner" title="버블" backHref="/" />

      <div className="flex flex-col gap-3 px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
          </div>
        ) : bubbles.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <span style={{ fontSize: '48px' }}>🫧</span>
            <p className="mt-4 text-[15px] font-semibold text-[var(--text)]">아직 버블이 없어요</p>
            <p className="mt-1 text-[13px] text-[var(--text-hint)]">버블을 만들어 맛집을 공유해보세요</p>
          </div>
        ) : (
          bubbles.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => router.push(`/bubbles/${b.id}`)}
              className="flex items-center gap-3 rounded-xl p-4 text-left"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: b.iconBgColor ?? 'var(--accent-social-light)', fontSize: '20px' }}
              >
                {b.icon ?? '🫧'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[var(--text)]">{b.name}</p>
                <p className="mt-0.5 text-[12px] text-[var(--text-sub)]">
                  멤버 {b.memberCount}명 · 기록 {b.recordCount}개
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => {/* 버블 생성 모달 */}}
        className="fixed bottom-7 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90"
        style={{ backgroundColor: 'var(--accent-social)', marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <Plus size={28} color="#FFFFFF" />
      </button>
    </div>
  )
}
