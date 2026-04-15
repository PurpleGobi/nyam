'use client'

import { useState, Suspense } from 'react'
import { Search, X } from 'lucide-react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useFollowListWithSimilarity } from '@/application/hooks/use-follow-list-with-similarity'
import type { EnrichedFollowUser } from '@/application/hooks/use-follow-list-with-similarity'
import { useFollow } from '@/application/hooks/use-follow'
import { useUserSearch } from '@/application/hooks/use-user-search'

import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { StickyTabs } from '@/presentation/components/ui/sticky-tabs'
import { FollowButton } from '@/presentation/components/follow/follow-button'
import { MiniProfilePopup } from '@/presentation/components/profile/mini-profile-popup'
import { SimilarityIndicator } from '@/presentation/components/similarity-indicator'

type FollowTab = 'followers' | 'following'

function FollowersInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'following' ? 'following' : 'followers'
  const { user } = useAuth()
  const {
    followers: followerUsers,
    following: followingUsers,
    counts,
    isLoading,
    sortedBy,
    setSortedBy,
  } = useFollowListWithSimilarity(user?.id ?? null)
  const [activeTab, setActiveTab] = useState<FollowTab>(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [miniProfileUserId, setMiniProfileUserId] = useState<string | null>(null)

  // 전체 DB 사용자 검색 (2글자 이상)
  const isDbSearch = searchQuery.trim().length >= 2
  const { results: searchResults, isSearching } = useUserSearch(searchQuery, user?.id ?? null)

  const currentList = activeTab === 'followers' ? followerUsers : followingUsers

  const tabs = [
    { key: 'followers' as const, label: `팔로워 ${counts.followers}`, variant: 'social' as const },
    { key: 'following' as const, label: `팔로잉 ${counts.following}`, variant: 'social' as const },
  ]

  const showEmptyState = isDbSearch
    ? !isSearching && searchResults.length === 0
    : currentList.length === 0
  const emptyMessage = isDbSearch
    ? '검색 결과가 없어요'
    : activeTab === 'followers'
      ? '아직 팔로워가 없어요'
      : '아직 팔로잉이 없어요'

  return (
    <div className="content-detail flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader />
      <FabBack />

      <StickyTabs tabs={tabs} activeTab={activeTab} variant="social" onTabChange={setActiveTab} />

      {/* 검색바 + 정렬 토글 */}
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <Search size={16} style={{ color: 'var(--text-hint)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름 또는 핸들로 검색"
          className="flex-1"
          style={{ border: 'none', background: 'none', fontSize: '13px', color: 'var(--text)', outline: 'none' }}
        />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery('')} style={{ color: 'var(--text-hint)' }}>
            <X size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setSortedBy(sortedBy === 'default' ? 'similarity' : 'default')}
          className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold transition-colors"
          style={{
            backgroundColor: sortedBy === 'similarity' ? 'var(--accent-social-light)' : 'var(--bg-section)',
            color: sortedBy === 'similarity' ? 'var(--accent-social)' : 'var(--text-sub)',
            border: '1px solid var(--border)',
          }}
        >
          {sortedBy === 'similarity' ? '적합도순' : '기본순'}
        </button>
      </div>

      {/* 목록 */}
      {isLoading || isSearching ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
        </div>
      ) : showEmptyState ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-sub)' }}>{emptyMessage}</p>
        </div>
      ) : isDbSearch ? (
        <div className="flex flex-col">
          <div className="px-4 pb-1 pt-3">
            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-hint)' }}>
              검색 결과 {searchResults.length}명
            </p>
          </div>
          {searchResults.map((u) => (
            <FollowUserRow key={u.userId} item={u} currentUserId={user?.id ?? null} onAvatarPress={() => setMiniProfileUserId(u.userId)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {currentList.map((u) => (
            <FollowUserRow key={u.userId} item={u} currentUserId={user?.id ?? null} onAvatarPress={() => setMiniProfileUserId(u.userId)} />
          ))}
        </div>
      )}

      {miniProfileUserId && (
        <MiniProfilePopup isOpen={true} onClose={() => setMiniProfileUserId(null)} targetUserId={miniProfileUserId} />
      )}
    </div>
  )
}

function FollowUserRow({ item, currentUserId, onAvatarPress }: { item: EnrichedFollowUser; currentUserId: string | null; onAvatarPress: () => void }) {
  const { accessLevel, isLoading, toggleFollow } = useFollow(currentUserId, item.userId)
  const isSelf = currentUserId === item.userId

  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <button type="button" onClick={onAvatarPress} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold transition-opacity active:opacity-70" style={{ backgroundColor: item.avatarColor ?? 'var(--accent-social-light)', color: 'var(--text-inverse)' }}>
        {item.avatarUrl ? (
          <Image src={item.avatarUrl} alt="" width={44} height={44} className="h-full w-full rounded-full object-cover" />
        ) : (
          item.nickname.charAt(0)
        )}
      </button>

      <button type="button" onClick={onAvatarPress} className="min-w-0 flex-1 text-left transition-opacity active:opacity-70">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold" style={{ color: 'var(--text)' }}>{item.nickname}</span>
          <span className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold" style={{ backgroundColor: `${item.levelColor}18`, color: item.levelColor }}>Lv.{item.level}</span>
          {item.similarity != null && item.confidence != null && (
            <SimilarityIndicator similarity={item.similarity} confidence={item.confidence} compact />
          )}
        </div>
        {item.handle && <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-hint)' }}>@{item.handle}</p>}
      </button>

      {!isSelf && <FollowButton accessLevel={accessLevel} onToggle={toggleFollow} isLoading={isLoading} />}
    </div>
  )
}

export function FollowersContainer() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center" style={{ color: 'var(--text-hint)' }}>로딩 중...</div>}>
      <FollowersInner />
    </Suspense>
  )
}
