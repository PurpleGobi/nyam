'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/presentation/providers/auth-provider'
import { useProfile } from '@/application/hooks/use-profile'
import { useTodaysPick } from '@/application/hooks/use-todays-pick'
import { useCalendarRecords } from '@/application/hooks/use-calendar-records'
import { useRecordsForMap } from '@/application/hooks/use-records-for-map'
import { useGeolocation } from '@/application/hooks/use-geolocation'
import { useFriendsFeed } from '@/application/hooks/use-friends-feed'
import { useTasteDna } from '@/application/hooks/use-taste-dna'
import { useTasteDnaWine } from '@/application/hooks/use-taste-dna-wine'
import { useStyleDna } from '@/application/hooks/use-style-dna'
import type { CalendarDayRecord } from '@/application/hooks/use-calendar-records'
import { TodaysPickCard } from '@/presentation/components/home/todays-pick-card'
import { HomeProfileCard } from '@/presentation/components/home/home-profile-card'
import { PhotoCalendar } from '@/presentation/components/home/photo-calendar'
import { HomeMapSection } from '@/presentation/components/home/home-map-section'
import { FriendsFeedCard } from '@/presentation/components/home/friends-feed-card'
import { CalendarDayPopup } from '@/presentation/components/home/calendar-day-popup'

type MapFilter = 'all' | 'mine' | 'friends'

export function HomeContainer() {
  const router = useRouter()
  const { user: authUser } = useAuthContext()
  const userId = authUser?.id

  // Hooks
  const { user: profile, stats } = useProfile(userId)
  const { picks, isLoading: picksLoading } = useTodaysPick(userId)
  const { data: tasteDna } = useTasteDna(userId)
  const { data: tasteDnaWine } = useTasteDnaWine(userId)
  const { regions, genres, scenes } = useStyleDna(userId)
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

  // Calendar day popup state
  const [selectedDay, setSelectedDay] = useState<{ day: number; records: CalendarDayRecord[] } | null>(null)

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

  const handleGoToday = () => {
    const today = new Date()
    setCalendarYear(today.getFullYear())
    setCalendarMonth(today.getMonth() + 1)
  }

  const handleDayClick = (day: number, records: CalendarDayRecord[]) => {
    if (records.length === 1) {
      router.push(`/records/${records[0].id}`)
    } else {
      setSelectedDay({ day, records })
    }
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
    <div className="flex flex-col gap-3 pb-4 pt-6">
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
          level={stats?.nyamLevel ?? 1}
          points={stats?.points ?? 0}
          pointsToNextLevel={1000}
          stats={profileStats}
          tasteDna={tasteDna ?? null}
          tasteDnaWine={tasteDnaWine ?? null}
          regions={regions}
          genres={genres}
          scenes={scenes}
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
            onGoToday={handleGoToday}
            onDayClick={handleDayClick}
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

      {/* Calendar day popup */}
      {selectedDay && (
        <CalendarDayPopup
          day={selectedDay.day}
          month={calendarMonth}
          records={selectedDay.records}
          onSelect={(recordId) => {
            setSelectedDay(null)
            router.push(`/records/${recordId}`)
          }}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}
