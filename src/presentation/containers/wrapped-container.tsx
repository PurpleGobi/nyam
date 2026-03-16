'use client'

import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Star,
  TrendingUp,
  Calendar,
  UtensilsCrossed,
  Wine,
  ChefHat,
  Hash,
  Award,
  MapPin,
  Clock,
  Share2,
} from 'lucide-react'
import { useAuthContext } from '@/presentation/providers/auth-provider'
import { useWrapped, type WrappedData } from '@/application/hooks/use-wrapped'

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

function HeroSection({ data }: { data: WrappedData }) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16">
      <p className="mb-4 text-sm font-medium tracking-widest text-[var(--color-neutral-400)] uppercase">
        Year in Review
      </p>
      <h1
        className="mb-6 text-8xl font-black"
        style={{
          background: 'linear-gradient(135deg, #FF6038 0%, #FF8A65 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {data.year}
      </h1>
      <p className="mb-10 text-lg text-[var(--color-neutral-600)]">
        {`당신의 ${data.year}년 맛 여정`}
      </p>
      <div className="flex flex-col items-center">
        <span className="text-6xl font-black text-[var(--color-neutral-800)]">
          {data.totalRecords}
        </span>
        <span className="mt-2 text-base text-[var(--color-neutral-500)]">
          {`총 기록 수`}
        </span>
      </div>
    </section>
  )
}

function TopCategorySection({ data }: { data: WrappedData }) {
  // Build top 5 categories from monthlyDistribution... we need category counts.
  // We only have topCategory from the hook. Let's show what we have.
  if (!data.topCategory) return null

  return (
    <section className="flex flex-col gap-6 bg-[var(--color-neutral-50)] px-6 py-16">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="h-5 w-5 text-[#FF6038]" />
        <h2 className="text-sm font-medium tracking-wide text-[var(--color-neutral-400)] uppercase">
          {`올해 가장 많이 먹은 카테고리`}
        </h2>
      </div>
      <div className="flex flex-col items-center gap-2 py-4">
        <span className="text-4xl font-black text-[var(--color-neutral-800)]">
          {data.topCategory.name}
        </span>
        <span className="text-lg text-[#FF6038]">
          {data.topCategory.count}회
        </span>
      </div>
      <div className="text-center text-sm text-[var(--color-neutral-500)]">
        {`${data.totalCategories}개 카테고리를 경험했습니다`}
      </div>
    </section>
  )
}

function TopMenuSection({ data }: { data: WrappedData }) {
  if (!data.topMenu) return null

  return (
    <section className="flex flex-col gap-6 px-6 py-16">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-[#FF6038]" />
        <h2 className="text-sm font-medium tracking-wide text-[var(--color-neutral-400)] uppercase">
          {`가장 자주 먹은 메뉴`}
        </h2>
      </div>
      <div className="flex flex-col items-center gap-2 py-4">
        <span className="text-3xl font-black text-[var(--color-neutral-800)]">
          {data.topMenu.name}
        </span>
        <span className="text-lg text-[#FF6038]">
          {data.topMenu.count}회
        </span>
      </div>
    </section>
  )
}

function BestRatedSection({ data }: { data: WrappedData }) {
  if (!data.topRated) return null

  return (
    <section className="flex flex-col gap-6 bg-[var(--color-neutral-50)] px-6 py-16">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-[#FF6038]" />
        <h2 className="text-sm font-medium tracking-wide text-[var(--color-neutral-400)] uppercase">
          {`올해 최고의 한 끼`}
        </h2>
      </div>
      <div className="flex flex-col items-center gap-3 py-4">
        <span className="text-3xl font-black text-[var(--color-neutral-800)]">
          {data.topRated.menuName}
        </span>
        <div className="flex items-center gap-2">
          <Star className="h-6 w-6 fill-[#FF6038] text-[#FF6038]" />
          <span className="text-2xl font-bold text-[#FF6038]">
            {Math.round(data.topRated.rating)}
          </span>
        </div>
      </div>
    </section>
  )
}

function MonthlyActivitySection({ data }: { data: WrappedData }) {
  const maxCount = Math.max(...data.monthlyDistribution, 1)

  return (
    <section className="flex flex-col gap-6 px-6 py-16">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-[#FF6038]" />
        <h2 className="text-sm font-medium tracking-wide text-[var(--color-neutral-400)] uppercase">
          {`월별 기록`}
        </h2>
      </div>
      <div className="flex items-end justify-between gap-1" style={{ height: 160 }}>
        {data.monthlyDistribution.map((count, i) => {
          const isBusiest = data.busiestMonth?.month === i + 1
          const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-[var(--color-neutral-500)]">
                {count > 0 ? count : ''}
              </span>
              <div
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${Math.max(heightPercent, count > 0 ? 4 : 0)}%`,
                  backgroundColor: isBusiest ? '#FF6038' : 'var(--color-neutral-200)',
                  minHeight: count > 0 ? 4 : 0,
                }}
              />
              <span
                className="text-xs"
                style={{
                  color: isBusiest ? '#FF6038' : 'var(--color-neutral-400)',
                  fontWeight: isBusiest ? 700 : 400,
                }}
              >
                {MONTH_NAMES[i]}
              </span>
            </div>
          )
        })}
      </div>
      {data.busiestMonth && (
        <p className="text-center text-sm text-[var(--color-neutral-500)]">
          {`${MONTH_NAMES[data.busiestMonth.month - 1]}이 가장 활발했어요 (${data.busiestMonth.count}회)`}
        </p>
      )}
    </section>
  )
}

function RecordTypeSection({ data }: { data: WrappedData }) {
  const { restaurant, wine, homemade } = data.recordTypeBreakdown
  const total = restaurant + wine + homemade
  if (total === 0) return null

  const items = [
    { label: '외식', count: restaurant, icon: UtensilsCrossed, color: '#FF6038' },
    { label: '와인', count: wine, icon: Wine, color: '#8B5CF6' },
    { label: '홈메이드', count: homemade, icon: ChefHat, color: '#10B981' },
  ]

  return (
    <section className="flex flex-col gap-6 bg-[var(--color-neutral-50)] px-6 py-16">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="h-5 w-5 text-[#FF6038]" />
        <h2 className="text-sm font-medium tracking-wide text-[var(--color-neutral-400)] uppercase">
          {`기록 유형`}
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map(({ label, count, icon: Icon, color }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4"
          >
            <Icon className="h-6 w-6" style={{ color }} />
            <span className="text-2xl font-bold text-[var(--color-neutral-800)]">{count}</span>
            <span className="text-xs text-[var(--color-neutral-500)]">{label}</span>
            {total > 0 && (
              <span className="text-xs font-medium" style={{ color }}>
                {Math.round((count / total) * 100)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function TagsSection({ data }: { data: WrappedData }) {
  if (data.topTags.length === 0 && data.topFlavorTags.length === 0) return null

  return (
    <section className="flex flex-col gap-6 px-6 py-16">
      <div className="flex items-center gap-2">
        <Hash className="h-5 w-5 text-[#FF6038]" />
        <h2 className="text-sm font-medium tracking-wide text-[var(--color-neutral-400)] uppercase">
          {`당신의 맛 키워드`}
        </h2>
      </div>
      {data.topTags.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--color-neutral-500)]">Tags</span>
          <div className="flex flex-wrap gap-2">
            {data.topTags.map(({ tag, count }) => (
              <span
                key={tag}
                className="rounded-full border border-[#FF6038]/20 bg-[#FF6038]/5 px-4 py-2 text-sm font-medium text-[#FF6038]"
              >
                {tag} ({count})
              </span>
            ))}
          </div>
        </div>
      )}
      {data.topFlavorTags.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--color-neutral-500)]">Flavor</span>
          <div className="flex flex-wrap gap-2">
            {data.topFlavorTags.map(({ tag, count }) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] px-4 py-2 text-sm font-medium text-[var(--color-neutral-700)]"
              >
                {tag} ({count})
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function StatsSummarySection({ data }: { data: WrappedData }) {
  const statItems = [
    {
      icon: Star,
      label: '평균 점수',
      value: data.averageRating > 0 ? Math.round(data.averageRating).toString() : '-',
    },
    {
      icon: MapPin,
      label: '방문한 식당',
      value: `${data.uniqueRestaurants}곳`,
    },
    {
      icon: Calendar,
      label: '첫 기록',
      value: data.firstRecord ? formatDate(data.firstRecord.date) : '-',
      sub: data.firstRecord?.menuName,
    },
    {
      icon: TrendingUp,
      label: '가장 활발한 달',
      value: data.busiestMonth ? MONTH_NAMES[data.busiestMonth.month - 1] : '-',
    },
    {
      icon: Clock,
      label: '최장 공백',
      value: data.longestGap > 0 ? `${data.longestGap}일` : '-',
    },
  ]

  return (
    <section className="flex flex-col gap-6 bg-[var(--color-neutral-50)] px-6 py-16">
      <h2 className="text-center text-sm font-medium tracking-wide text-[var(--color-neutral-400)] uppercase">
        {`통계 요약`}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {statItems.map(({ icon: Icon, label, value, sub }) => (
          <div
            key={label}
            className="flex flex-col gap-1 rounded-2xl bg-white p-4"
          >
            <Icon className="mb-1 h-4 w-4 text-[#FF6038]" />
            <span className="text-xs text-[var(--color-neutral-500)]">{label}</span>
            <span className="text-lg font-bold text-[var(--color-neutral-800)]">{value}</span>
            {sub && (
              <span className="text-xs text-[var(--color-neutral-400)]">{sub}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function OutroSection({ year }: { year: number }) {
  const handleShare = async () => {
    const url = `${window.location.origin}/wrapped`
    if (navigator.share) {
      try {
        await navigator.share({ title: `${year} 맛 리뷰`, url })
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <section className="flex flex-col items-center gap-6 px-6 py-20">
      <p className="text-center text-xl font-bold text-[var(--color-neutral-800)]">
        {`내년에도 맛있는 한 해 되세요!`}
      </p>
      <button
        type="button"
        onClick={handleShare}
        className="flex items-center gap-2 rounded-full bg-[#FF6038] px-6 py-3 text-sm font-medium text-white active:opacity-80"
      >
        <Share2 className="h-4 w-4" />
        {`공유하기`}
      </button>
    </section>
  )
}

export function WrappedContainer() {
  const router = useRouter()
  const { user } = useAuthContext()
  const userId = user?.id
  const { data, isLoading } = useWrapped(userId)

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-neutral-200)] border-t-[#FF6038]" />
        <p className="mt-4 text-sm text-[var(--color-neutral-500)]">
          {`맛 여정을 정리하는 중...`}
        </p>
      </div>
    )
  }

  if (!data || data.totalRecords === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-neutral-50)]"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-neutral-600)]" />
        </button>
        <UtensilsCrossed className="mb-4 h-12 w-12 text-[var(--color-neutral-300)]" />
        <p className="text-center text-base text-[var(--color-neutral-500)]">
          {`올해 기록이 없습니다`}
        </p>
        <p className="mt-1 text-center text-sm text-[var(--color-neutral-400)]">
          {`맛있는 기록을 남기고 다시 와주세요!`}
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <button
        type="button"
        onClick={() => router.back()}
        className="fixed left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm"
      >
        <ArrowLeft className="h-5 w-5 text-[var(--color-neutral-600)]" />
      </button>

      <HeroSection data={data} />
      <TopCategorySection data={data} />
      <TopMenuSection data={data} />
      <BestRatedSection data={data} />
      <MonthlyActivitySection data={data} />
      <RecordTypeSection data={data} />
      <TagsSection data={data} />
      <StatsSummarySection data={data} />
      <OutroSection year={data.year} />
    </div>
  )
}
