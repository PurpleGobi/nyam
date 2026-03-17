"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useProfile } from "@/application/hooks/use-profile"
import { useTasteDna } from "@/application/hooks/use-taste-dna"
import { useCalendarRecords } from "@/application/hooks/use-calendar-records"
import { useTodaysPick } from "@/application/hooks/use-todays-pick"
import { TodaysPickCard } from "@/presentation/components/home/todays-pick-card"
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

  const { user, stats } = useProfile()
  const { restaurant: tasteDnaRestaurant, wine: tasteDnaWine } = useTasteDna(user?.id ?? null)
  const { recordsByDay, records } = useCalendarRecords(user?.id ?? null, calendarYear, calendarMonth)
  const { pick } = useTodaysPick(user?.id ?? null)

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
      <TodaysPickCard record={pick} />

      {/* 2. Profile + Taste DNA */}
      <HomeProfileCard
        user={user}
        stats={stats}
        tasteDnaRestaurant={tasteDnaRestaurant}
        tasteDnaWine={tasteDnaWine}
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

      {/* 5. Friends Feed (placeholder - no data hook yet) */}
      <SectionHeader title="친구 피드" subtitle="버블 멤버의 최근 기록" />
      <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-sm)] text-center">
        <p className="text-sm text-neutral-400">
          버블에 가입하면 친구들의 기록을 볼 수 있어요
        </p>
      </div>
    </div>
  )
}
