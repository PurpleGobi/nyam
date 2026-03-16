'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Utensils, Wine, Heart, Briefcase, Cake } from 'lucide-react'
import { useAuthContext } from '@/presentation/providers/auth-provider'
import { useProfile } from '@/application/hooks/use-profile'
import { useNotifications } from '@/application/hooks/use-notifications'
import { useTodaysPick } from '@/application/hooks/use-todays-pick'
import { useCalendarRecords } from '@/application/hooks/use-calendar-records'
import { useRecordsForMap } from '@/application/hooks/use-records-for-map'
import { useGeolocation } from '@/application/hooks/use-geolocation'
import { useFriendsFeed } from '@/application/hooks/use-friends-feed'
import { HomeHeader } from '@/presentation/components/home/home-header'
import { TodaysPickCard } from '@/presentation/components/home/todays-pick-card'
import { HomeProfileCard } from '@/presentation/components/home/home-profile-card'
import { PhotoCalendar } from '@/presentation/components/home/photo-calendar'
import { HomeMapSection } from '@/presentation/components/home/home-map-section'
import { FriendsFeedCard } from '@/presentation/components/home/friends-feed-card'

type MapFilter = 'all' | 'mine' | 'friends'

const PLACEHOLDER_TASTE_DNA = {
  spicy: 0.81,
  sweet: 0.45,
  salty: 0.55,
  sour: 0.3,
  umami: 0.72,
  rich: 0.65,
}

const PLACEHOLDER_REGIONS = [
  { name: '강남', level: 6 },
  { name: '한남', level: 4 },
  { name: '성수', level: 5 },
  { name: '을지로', level: 3 },
  { name: '연남', level: 4 },
]

const PLACEHOLDER_GENRES = [
  { name: '중식', level: 6 },
  { name: '와인', level: 5 },
  { name: '일식', level: 4 },
  { name: '이탈리안', level: 3 },
  { name: '한식', level: 5 },
  { name: '디저트', level: 2 },
]

const PLACEHOLDER_SCENES = [
  { name: '데이트', level: 5, icon: <Heart className="h-3 w-3" /> },
  { name: '회식', level: 4, icon: <Users className="h-3 w-3" /> },
  { name: '혼밥', level: 6, icon: <Utensils className="h-3 w-3" /> },
  { name: '와인바', level: 3, icon: <Wine className="h-3 w-3" /> },
  { name: '비즈니스', level: 2, icon: <Briefcase className="h-3 w-3" /> },
  { name: '기념일', level: 3, icon: <Cake className="h-3 w-3" /> },
]

export function HomeContainer() {
  const router = useRouter()
  const { user: authUser } = useAuthContext()
  const userId = authUser?.id

  // Hooks
  const { unreadCount } = useNotifications(userId)
  const { user: profile, stats } = useProfile(userId)
  const { picks, isLoading: picksLoading } = useTodaysPick(userId)
  const { location } = useGeolocation()
  const { myPins, friendPins } = useRecordsForMap(userId)
  const { items: feedItems } = useFriendsFeed(userId)

  // Today's Pick cycling state
  const [currentPickIndex, setCurrentPickIndex] = useState(0)

  // Calendar month navigation state
  const now = new Date()
  const [calendarYear, setCalendarYear] = useState(now.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1)
  const { recordsByDay, summary, isLoading: calendarLoading } = useCalendarRecords(
    userId,
    calendarYear,
    calendarMonth,
  )

  // Map filter state
  const [mapFilter, setMapFilter] = useState<MapFilter>('all')

  // Derived values
  const nickname = profile?.nickname ?? authUser?.user_metadata?.full_name ?? '게스트'

  const handlePickTap = () => {
    if (picks.length > 0) {
      setCurrentPickIndex((prev) => (prev + 1) % picks.length)
    }
  }

  const handlePickDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const pick = picks[currentPickIndex]
    if (pick?.recordId) {
      router.push(`/records/${pick.recordId}`)
    }
  }

  const handlePrevMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 1) {
        setCalendarYear((y) => y - 1)
        return 12
      }
      return prev - 1
    })
  }

  const handleNextMonth = () => {
    setCalendarMonth((prev) => {
      if (prev === 12) {
        setCalendarYear((y) => y + 1)
        return 1
      }
      return prev + 1
    })
  }

  // Map friend pins with required fields
  const mappedFriendPins = friendPins.map((pin) => ({
    id: pin.id,
    lat: pin.lat,
    lng: pin.lng,
    rating: pin.rating,
    name: pin.name,
    friendName: pin.friendName ?? '익명',
    color: pin.color ?? '#4A90D9',
  }))

  const profileStats = {
    records: stats?.totalRecords ?? 0,
    places: stats?.totalPhotos ?? 0,
    groups: stats?.groupsCount ?? 0,
  }

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Header */}
      <HomeHeader unreadCount={unreadCount} />

      {/* Today's Pick */}
      <div className="px-4">
        {picksLoading ? (
          <div className="h-52 animate-pulse rounded-2xl bg-[var(--color-neutral-100)]" />
        ) : picks.length > 0 ? (
          <TodaysPickCard
            pick={picks[currentPickIndex]}
            totalCount={picks.length}
            onTap={handlePickTap}
            onDetailClick={handlePickDetailClick}
          />
        ) : null}
      </div>

      {/* Profile Card */}
      <div className="px-4">
        <HomeProfileCard
          nickname={nickname}
          stats={profileStats}
          tasteTypeCode="미식 탐험가"
          tasteDna={PLACEHOLDER_TASTE_DNA}
          experienceRegions={PLACEHOLDER_REGIONS}
          experienceGenres={PLACEHOLDER_GENRES}
          experienceScenes={PLACEHOLDER_SCENES}
        />
      </div>

      {/* Photo Calendar */}
      <div className="px-4">
        {calendarLoading ? (
          <div className="h-80 animate-pulse rounded-2xl bg-[var(--color-neutral-100)]" />
        ) : (
          <PhotoCalendar
            year={calendarYear}
            month={calendarMonth}
            recordsByDay={recordsByDay}
            summary={summary}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        )}
      </div>

      {/* Map Section */}
      <div className="px-4">
        <HomeMapSection
          myLocation={location}
          myPins={myPins}
          friendPins={mappedFriendPins}
          filter={mapFilter}
          onFilterChange={setMapFilter}
        />
      </div>

      {/* Friends Feed */}
      <div className="px-4">
        <FriendsFeedCard items={feedItems} />
      </div>
    </div>
  )
}
