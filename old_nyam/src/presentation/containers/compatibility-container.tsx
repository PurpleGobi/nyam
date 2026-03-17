'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Compass } from 'lucide-react'
import { useAuthContext } from '@/presentation/providers/auth-provider'
import { useCompatibility } from '@/application/hooks/use-compatibility'
import { useProfile } from '@/application/hooks/use-profile'

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-neutral-100)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FF6038"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-[var(--color-neutral-800)]">{score}</span>
        <span className="text-xs text-[var(--color-neutral-500)]">/ 100</span>
      </div>
    </div>
  )
}

function PercentageBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-[var(--color-neutral-700)]">{label}</span>
        </div>
        <span className="text-sm font-bold text-[#FF6038]">{value}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--color-neutral-100)]">
        <div
          className="h-2 rounded-full bg-[#FF6038] transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function CompatibilityContainer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetUserId = searchParams.get('with')

  const { user: authUser } = useAuthContext()
  const currentUserId = authUser?.id

  const { result, isLoading: compatLoading } = useCompatibility(currentUserId, targetUserId ?? undefined)
  const { user: targetUser, isLoading: profileLoading } = useProfile(targetUserId ?? undefined)

  const isLoading = compatLoading || profileLoading

  const targetName = targetUser?.nickname ?? '상대방'

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-neutral-50)]"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--color-neutral-600)]" />
          </button>
          <div className="h-5 w-32 animate-pulse rounded bg-[var(--color-neutral-100)]" />
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="h-[120px] w-[120px] animate-pulse rounded-full bg-[var(--color-neutral-100)]" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-neutral-50)]"
        >
          <ArrowLeft className="h-5 w-5 text-[var(--color-neutral-600)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--color-neutral-800)]">
          {targetName}님과의 궁합
        </h1>
      </div>

      {!result ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-16">
          <p className="text-center text-sm text-[var(--color-neutral-500)]">
            아직 비교할 수 있는 데이터가 부족합니다
          </p>
        </div>
      ) : (
        <>
          {/* Overall Score */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6">
            <span className="text-sm font-medium text-[var(--color-neutral-500)]">종합 궁합</span>
            <ScoreRing score={result.overall} />
          </div>

          {/* Breakdown */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
            <PercentageBar
              label="취향 유사도"
              value={result.tasteSimilarity}
              icon={<Heart className="h-4 w-4 text-[#FF6038]" />}
            />
            <PercentageBar
              label="경험 보완성"
              value={result.experienceComplementarity}
              icon={<Compass className="h-4 w-4 text-[#FF6038]" />}
            />
          </div>

          {/* Strong Areas */}
          {result.strongAreas.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
              <span className="text-sm font-medium text-[var(--color-neutral-700)]">
                {targetName}님이 강한 영역
              </span>
              <div className="flex flex-wrap gap-2">
                {result.strongAreas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full bg-[#FF6038]/10 px-3 py-1.5 text-xs font-medium text-[#FF6038]"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
