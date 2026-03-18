"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/presentation/providers/auth-provider"
import { useProfile } from "@/application/hooks/use-profile"
import { useTasteDna } from "@/application/hooks/use-taste-dna"
import { useStyleDna } from "@/application/hooks/use-style-dna"
import { useCalendarRecords } from "@/application/hooks/use-calendar-records"
import { useTodaysPick } from "@/application/hooks/use-todays-pick"
import { useFriendsFeed } from "@/application/hooks/use-friends-feed"
import { TodaysPickCard } from "@/presentation/components/home/todays-pick-card"
import { FriendsFeedCard } from "@/presentation/components/home/friends-feed-card"
import { HomeProfileCard } from "@/presentation/components/home/home-profile-card"
import { PhotoCalendar } from "@/presentation/components/home/photo-calendar"
import { HomeMapSection } from "@/presentation/components/home/home-map-section"
import { SectionHeader } from "@/presentation/components/ui/section-header"
import { ROUTES } from "@/shared/constants/routes"

export function HomeContainer() {
  const router = useRouter()
  const now = new Date()
  const [calendarYear, setCalendarYear] = useState(now.getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1)

  const { user: authUser } = useAuthContext()
  const { user, stats } = useProfile(authUser?.id)
  const { restaurant: tasteDnaRestaurant, wine: tasteDnaWine } = useTasteDna(user?.id ?? null)
  const { restaurant: styleDnaRestaurant, wine: styleDnaWine } = useStyleDna(user?.id ?? null)
  const { recordsByDay, records } = useCalendarRecords(user?.id ?? null, calendarYear, calendarMonth)
  // Derive top taste axis from Taste DNA for dna_match preset
  const tasteDnaTopAxis = useMemo(() => {
    if (!tasteDnaRestaurant) return null
    const axes: Array<{ key: string; value: number }> = [
      { key: "spicy", value: tasteDnaRestaurant.flavorSpicy },
      { key: "sweet", value: tasteDnaRestaurant.flavorSweet },
      { key: "salty", value: tasteDnaRestaurant.flavorSalty },
      { key: "sour", value: tasteDnaRestaurant.flavorSour },
      { key: "umami", value: tasteDnaRestaurant.flavorUmami },
      { key: "rich", value: tasteDnaRestaurant.flavorRich },
    ]
    const top = axes.reduce((a, b) => (a.value >= b.value ? a : b))
    return top.value > 0 ? top.key : null
  }, [tasteDnaRestaurant])

  const { pick, reason, refresh } = useTodaysPick(user?.id ?? null, tasteDnaTopAxis)
  const { records: friendsRecords, isLoading: friendsLoading } = useFriendsFeed(user?.id ?? null, 5)

  const handleMonthChange = (year: number, month: number) => {
    setCalendarYear(year)
    setCalendarMonth(month)
  }

  const handleRecordClick = (id: string) => {
    router.push(ROUTES.recordDetail(id))
  }

  const mapRecords = useMemo(
    () =>
      records.map((r) => ({
        id: r.id,
        locationLat: r.locationLat,
        locationLng: r.locationLng,
        title: r.menuName ?? r.restaurant?.name ?? "기록",
        thumbnailUrl: r.photos[0]?.thumbnailUrl ?? null,
      })),
    [records],
  )

  return (
    <div className="flex flex-col gap-3 px-4 pt-6 pb-4">
      {/* 1. Today's Pick */}
      <TodaysPickCard pick={pick} reason={reason} onRefresh={refresh} />

      {/* 2. Profile + Taste DNA */}
      <HomeProfileCard
        user={user}
        stats={stats}
        tasteDnaRestaurant={tasteDnaRestaurant}
        tasteDnaWine={tasteDnaWine}
        styleDnaRestaurant={styleDnaRestaurant}
        styleDnaWine={styleDnaWine}
      />

      {/* 3. Photo Calendar */}
      <SectionHeader title="캘린더" />
      <PhotoCalendar
        recordsByDay={recordsByDay}
        year={calendarYear}
        month={calendarMonth}
        onMonthChange={handleMonthChange}
        totalRecords={records.length}
      />

      {/* 4. Map Section */}
      <SectionHeader title="지도" subtitle="내 기록 지도" />
      <HomeMapSection
        records={mapRecords}
        onRecordClick={handleRecordClick}
      />

      {/* 5. Friends Feed */}
      <SectionHeader title="친구 피드" subtitle="버블 멤버의 최근 기록" />
      {friendsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      ) : friendsRecords.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-sm)] text-center">
          <p className="text-sm text-neutral-400">
            버블에 가입하면 친구들의 기록을 볼 수 있어요
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {friendsRecords.map((record) => (
            <FriendsFeedCard
              key={record.id}
              nickname={record.authorNickname}
              profileImageUrl={record.authorAvatarUrl}
              recordTitle={record.menuName ?? record.restaurant?.name ?? "무제"}
              thumbnailUrl={record.photos[0]?.thumbnailUrl ?? null}
              recordType={record.recordType}
              createdAt={record.createdAt}
              onClick={() => router.push(ROUTES.recordDetail(record.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
