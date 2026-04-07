'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { Search, X } from 'lucide-react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useFollowList } from '@/application/hooks/use-follow-list'
import { useFollow } from '@/application/hooks/use-follow'
import { useMiniProfile } from '@/application/hooks/use-mini-profile'
import { profileRepo } from '@/shared/di/container'
import { getLevelTitle, getLevelColor } from '@/domain/services/xp-calculator'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { StickyTabs } from '@/presentation/components/ui/sticky-tabs'
import { FollowButton } from '@/presentation/components/follow/follow-button'
import { MiniProfilePopup } from '@/presentation/components/profile/mini-profile-popup'

type FollowTab = 'followers' | 'following'

interface FollowUserItem {
  userId: string
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  level: number
  levelColor: string
}

function FollowersInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'following' ? 'following' : 'followers'
  const { user } = useAuth()
  const { followers, following, counts, isLoading } = useFollowList(user?.id ?? null)
  const [activeTab, setActiveTab] = useState<FollowTab>(initialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [miniProfileUserId, setMiniProfileUserId] = useState<string | null>(null)

  // 프로필 enrichment
  const [followerUsers, setFollowerUsers] = useState<FollowUserItem[]>([])
  const [followingUsers, setFollowingUsers] = useState<FollowUserItem[]>([])
  const [enrichLoading, setEnrichLoading] = useState(false)

  useEffect(() => {
    if (isLoading || !user) return
    setEnrichLoading(true)

    const enrichIds = (ids: string[]) =>
      Promise.allSettled(ids.map((id) => profileRepo.getUserProfile(id)))
        .then((results) =>
          results
            .map((r, i) => {
              if (r.status !== 'fulfilled') return null
              const p = r.value
              const level = Math.max(1, Math.floor(p.totalXp / 100) + 1)
              return {
                userId: ids[i],
                nickname: p.nickname,
                handle: p.handle,
                avatarUrl: p.avatarUrl,
                avatarColor: p.avatarColor,
                level,
                levelColor: getLevelColor(level),
              }
            })
            .filter((x): x is FollowUserItem => x !== null)
        )

    const followerIds = followers.map((f) => f.followerId)
    const followingIds = following.map((f) => f.followingId)

    Promise.all([enrichIds(followerIds), enrichIds(followingIds)])
      .then(([fUsers, gUsers]) => {
        setFollowerUsers(fUsers)
        setFollowingUsers(gUsers)
      })
      .finally(() => setEnrichLoading(false))
  }, [isLoading, followers, following, user])

  const currentList = activeTab === 'followers' ? followerUsers : followingUsers

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return currentList
    const q = searchQuery.toLowerCase()
    return currentList.filter((u) =>
      u.nickname.toLowerCase().includes(q) ||
      (u.handle ?? '').toLowerCase().includes(q)
    )
  }, [currentList, searchQuery])

  const tabs = [
    { key: 'followers' as const, label: `팔로워 ${counts.followers}`, variant: 'social' as const },
    { key: 'following' as const, label: `팔로잉 ${counts.following}`, variant: 'social' as const },
  ]

  return (
    <div className="content-detail flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader />
      <FabBack />

      <StickyTabs
        tabs={tabs}
        activeTab={activeTab}
        variant="social"
        onTabChange={setActiveTab}
      />

      {/* 검색바 */}
      <div className="flex items-center gap-2 px-4 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <Search size={16} style={{ color: 'var(--text-hint)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름 또는 핸들로 검색"
          className="flex-1"
          style={{
            border: 'none',
            background: 'none',
            fontSize: '13px',
            color: 'var(--text)',
            outline: 'none',
          }}
        />
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery('')} style={{ color: 'var(--text-hint)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* 목록 */}
      {isLoading || enrichLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
          <p className="text-[14px] font-semibold" style={{ color: 'var(--text-sub)' }}>
            {searchQuery ? '검색 결과가 없어요' : activeTab === 'followers' ? '아직 팔로워가 없어요' : '아직 팔로잉이 없어요'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {filtered.map((u) => (
            <FollowUserRow
              key={u.userId}
              item={u}
              currentUserId={user?.id ?? null}
              onAvatarPress={() => setMiniProfileUserId(u.userId)}
            />
          ))}
        </div>
      )}

      {/* 미니 프로필 팝업 */}
      {miniProfileUserId && (
        <MiniProfilePopup
          isOpen={true}
          onClose={() => setMiniProfileUserId(null)}
          targetUserId={miniProfileUserId}
        />
      )}
    </div>
  )
}

function FollowUserRow({
  item,
  currentUserId,
  onAvatarPress,
}: {
  item: FollowUserItem
  currentUserId: string | null
  onAvatarPress: () => void
}) {
  const { accessLevel, isLoading, toggleFollow } = useFollow(currentUserId, item.userId)
  const isSelf = currentUserId === item.userId

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* 아바타 */}
      <button
        type="button"
        onClick={onAvatarPress}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold transition-opacity active:opacity-70"
        style={{ backgroundColor: item.avatarColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
      >
        {item.avatarUrl ? (
          <Image src={item.avatarUrl} alt="" width={44} height={44} className="h-full w-full rounded-full object-cover" />
        ) : (
          item.nickname.charAt(0)
        )}
      </button>

      {/* 정보 */}
      <button
        type="button"
        onClick={onAvatarPress}
        className="min-w-0 flex-1 text-left transition-opacity active:opacity-70"
      >
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
            {item.nickname}
          </span>
          <span
            className="shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold"
            style={{ backgroundColor: `${item.levelColor}18`, color: item.levelColor }}
          >
            Lv.{item.level}
          </span>
        </div>
        {item.handle && (
          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-hint)' }}>@{item.handle}</p>
        )}
      </button>

      {/* 팔로우 버튼 */}
      {!isSelf && (
        <FollowButton
          accessLevel={accessLevel}
          onToggle={toggleFollow}
          isLoading={isLoading}
        />
      )}
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
