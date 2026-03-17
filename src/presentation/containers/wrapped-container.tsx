"use client"

import { Gift, Utensils, MapPin, Flame, Loader2 } from "lucide-react"
import { useAuth } from "@/application/hooks/use-auth"
import { useWrapped } from "@/application/hooks/use-wrapped"
import { TasteDnaRadar } from "@/presentation/components/profile/taste-dna-radar"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { ROUTES } from "@/shared/constants/routes"

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Gift
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
        <Icon className="h-5 w-5 text-primary-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="truncate text-base font-bold text-neutral-800">{value}</p>
        {sub && <p className="text-xs text-neutral-500">{sub}</p>}
      </div>
    </div>
  )
}

export function WrappedContainer() {
  const { user } = useAuth()
  const currentYear = new Date().getFullYear()
  const { stats, isLoading } = useWrapped(user?.id ?? null, currentYear)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (!stats || stats.totalRecords === 0) {
    return (
      <div className="px-4 pt-6 pb-4">
        <EmptyState
          icon={Gift}
          title="Nyam Wrapped"
          description="올해 기록이 아직 없어요. 첫 기록을 남겨보세요!"
          actionLabel="기록하러 가기"
          actionHref={ROUTES.RECORD}
        />
      </div>
    )
  }

  const dnaAxes = stats.tasteDnaAverages
    ? [
        { label: "매운맛", value: stats.tasteDnaAverages.spicy },
        { label: "단맛", value: stats.tasteDnaAverages.sweet },
        { label: "짠맛", value: stats.tasteDnaAverages.salty },
        { label: "신맛", value: stats.tasteDnaAverages.sour },
        { label: "감칠맛", value: stats.tasteDnaAverages.umami },
        { label: "풍미", value: stats.tasteDnaAverages.rich },
      ]
    : null

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 p-6 text-center text-white">
        <Gift className="mx-auto h-10 w-10" />
        <h1 className="mt-3 text-xl font-bold">{currentYear} Nyam Wrapped</h1>
        <p className="mt-1 text-sm text-white/80">올 한 해의 맛 여정</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Utensils}
          label="총 기록"
          value={`${stats.totalRecords}개`}
        />
        <StatCard
          icon={Flame}
          label="최장 연속"
          value={`${stats.recordStreak}일`}
        />
        {stats.mostVisitedRestaurant && (
          <StatCard
            icon={MapPin}
            label="단골 맛집"
            value={stats.mostVisitedRestaurant.name}
            sub={`${stats.mostVisitedRestaurant.visitCount}회 방문`}
          />
        )}
        {stats.topGenre && (
          <StatCard
            icon={Utensils}
            label="최애 장르"
            value={stats.topGenre.genre}
            sub={`${stats.topGenre.count}개 기록`}
          />
        )}
      </div>

      {/* Taste DNA */}
      {dnaAxes && (
        <div className="rounded-2xl bg-white p-5 shadow-[var(--shadow-sm)]">
          <h2 className="mb-3 text-center text-sm font-semibold text-neutral-700">
            나의 Taste DNA
          </h2>
          <TasteDnaRadar axes={dnaAxes} size={200} />
        </div>
      )}
    </div>
  )
}
