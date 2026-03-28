'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleList } from '@/application/hooks/use-bubble-list'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { BubbleCard } from '@/presentation/components/bubble/bubble-card'

type ContentTab = 'bubbles' | 'bubblers'
type RoleFilter = 'all' | 'mine' | 'joined'
type SortType = 'activity' | 'members' | 'records' | 'name'

const PAGE_SIZE = 10

export function BubbleListContainer() {
  const router = useRouter()
  const { user } = useAuth()
  const [now] = useState(() => Date.now())
  const { bubbles, isLoading } = useBubbleList(user?.id ?? null)

  const [contentTab, setContentTab] = useState<ContentTab>('bubbles')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [sortBy, setSortBy] = useState<SortType>('activity')
  const [page, setPage] = useState(1)

  // 역할 분류
  const classified = useMemo(() => {
    return bubbles.map((b) => {
      const isMine = b.createdBy === user?.id
      return { bubble: b, role: isMine ? 'mine' as const : 'joined' as const }
    })
  }, [bubbles, user?.id])

  // 필터 적용
  const filtered = useMemo(() => {
    if (roleFilter === 'all') return classified
    return classified.filter((c) => c.role === roleFilter)
  }, [classified, roleFilter])

  // 정렬
  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sortBy) {
      case 'activity':
        return arr.sort((a, b) => new Date(b.bubble.lastActivityAt ?? '').getTime() - new Date(a.bubble.lastActivityAt ?? '').getTime())
      case 'members':
        return arr.sort((a, b) => b.bubble.memberCount - a.bubble.memberCount)
      case 'records':
        return arr.sort((a, b) => b.bubble.recordCount - a.bubble.recordCount)
      case 'name':
        return arr.sort((a, b) => a.bubble.name.localeCompare(b.bubble.name))
      default:
        return arr
    }
  }, [filtered, sortBy])

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // 필터칩 카운트
  const mineCount = classified.filter((c) => c.role === 'mine').length
  const joinedCount = classified.filter((c) => c.role === 'joined').length

  return (
    <div className="flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader variant="inner" title="버블" backHref="/" />

      {/* 콘텐츠 탭: 버블 / 버블러 */}
      <div className="flex items-center px-4 pt-2" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['bubbles', 'bubblers'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setContentTab(tab)}
            className="px-4 py-2.5 text-[13px] font-semibold"
            style={{
              color: contentTab === tab ? 'var(--accent-social)' : 'var(--text-hint)',
              borderBottom: contentTab === tab ? '2px solid var(--accent-social)' : '2px solid transparent',
            }}
          >
            {tab === 'bubbles' ? '버블' : '버블러'}
          </button>
        ))}
      </div>

      {contentTab === 'bubbles' && (
        <>
          {/* 필터칩 */}
          <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
            {([
              { key: 'all', label: `전체(${classified.length})` },
              { key: 'mine', label: `운영(${mineCount})` },
              { key: 'joined', label: `가입(${joinedCount})` },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setRoleFilter(key); setPage(1) }}
                className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold"
                style={{
                  backgroundColor: roleFilter === key ? 'var(--accent-social)' : 'var(--bg-card)',
                  color: roleFilter === key ? '#FFFFFF' : 'var(--text-sub)',
                  border: roleFilter === key ? 'none' : '1px solid var(--border)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 버블 목록 */}
          <div className="flex flex-col gap-3 px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
              </div>
            ) : paged.length === 0 ? (
              <div className="flex flex-col items-center py-16">
                <Users size={48} style={{ color: 'var(--text-hint)' }} />
                <p className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>아직 버블이 없어요</p>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--text-hint)' }}>버블을 만들어 맛집을 공유해보세요</p>
              </div>
            ) : (
              paged.map(({ bubble: b, role }) => (
                <BubbleCard
                  key={b.id}
                  bubble={b}
                  role={role}
                  isRecentlyActive={b.lastActivityAt ? now - new Date(b.lastActivityAt).getTime() < 86400000 : false}
                  onClick={() => router.push(`/bubbles/${b.id}`)}
                />
              ))
            )}
          </div>

          {/* 인라인 페이��� */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-[14px] font-semibold disabled:opacity-30"
                style={{ color: 'var(--text-sub)' }}
              >
                &lt;
              </button>
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="text-[14px] font-semibold disabled:opacity-30"
                style={{ color: 'var(--text-sub)' }}
              >
                &gt;
              </button>
            </div>
          )}
        </>
      )}

      {contentTab === 'bubblers' && (
        <div className="flex flex-col items-center py-16">
          <Users size={48} style={{ color: 'var(--text-hint)' }} />
          <p className="mt-4 text-[14px]" style={{ color: 'var(--text-hint)' }}>버블러 탭은 준�� 중입니다</p>
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={() => router.push('/bubbles?create=true')}
        className="fixed bottom-7 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90"
        style={{ backgroundColor: 'var(--accent-social)', marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <Plus size={28} color="#FFFFFF" />
      </button>
    </div>
  )
}
