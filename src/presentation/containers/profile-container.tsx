"use client"

import { useState } from "react"
import { User, Settings, ChevronRight, Flame, Star, BookOpen, Pencil, Check, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/presentation/providers/auth-provider"
import { useProfile } from "@/application/hooks/use-profile"
import { useUpdateProfile } from "@/application/hooks/use-update-profile"
import { useRecords } from "@/application/hooks/use-records"
import { useTasteDna } from "@/application/hooks/use-taste-dna"
import { useExperienceAtlas } from "@/application/hooks/use-experience-atlas"
import type { TasteDna } from "@/domain/entities/taste-dna"

const FLAVOR_LABELS: Record<string, string> = {
  flavorSpicy: '매운맛',
  flavorSweet: '단맛',
  flavorSalty: '짠맛',
  flavorSour: '신맛',
  flavorUmami: '감칠맛',
  flavorRich: '진한맛',
}

function FlavorBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-[var(--color-neutral-600)]">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-[var(--color-neutral-100)]">
        <div
          className="h-2 rounded-full bg-[#FF6038]"
          style={{ width: `${Math.min(value * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function ProfileContainer() {
  const router = useRouter()
  const { user: authUser, signOut } = useAuthContext()
  const userId = authUser?.id
  const { user: profile, stats, isLoading: profileLoading, mutate: mutateProfile } = useProfile(userId)
  const { updateProfile, isLoading: updateLoading } = useUpdateProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [editNickname, setEditNickname] = useState("")
  const { data: records, isLoading: recordsLoading } = useRecords(userId, 5)
  const { data: tasteDna, isLoading: dnaLoading } = useTasteDna(userId)
  const { regions, genres, isLoading: atlasLoading } = useExperienceAtlas(userId)

  const isLoading = profileLoading || recordsLoading || dnaLoading || atlasLoading

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-4 pt-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-[var(--color-neutral-100)]" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-24 animate-pulse rounded bg-[var(--color-neutral-100)]" />
            <div className="h-4 w-16 animate-pulse rounded bg-[var(--color-neutral-100)]" />
          </div>
        </div>
      </div>
    )
  }

  const nickname = profile?.nickname ?? authUser?.user_metadata?.full_name ?? '게스트'
  const avatarUrl = profile?.avatarUrl ?? authUser?.user_metadata?.avatar_url
  const level = stats?.nyamLevel ?? 1

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={nickname}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-neutral-100)]">
            <User className="h-8 w-8 text-[var(--color-neutral-400)]" />
          </div>
        )}
        <div className="flex flex-col">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                className="h-8 w-36 rounded-lg border border-[var(--color-neutral-300)] px-2 text-sm text-[var(--color-neutral-800)] outline-none focus:border-[#FF6038]"
                autoFocus
              />
              <button
                type="button"
                disabled={updateLoading || !editNickname.trim()}
                onClick={async () => {
                  if (!userId || !editNickname.trim()) return
                  const result = await updateProfile(userId, { nickname: editNickname.trim() })
                  if (result) {
                    await mutateProfile()
                    setIsEditing(false)
                  }
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FF6038] text-white disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold text-[var(--color-neutral-800)]">
                {nickname}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setEditNickname(nickname)
                  setIsEditing(true)
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-neutral-400)] hover:bg-[var(--color-neutral-100)]"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <span className="text-sm text-[#FF6038]">냠 Lv.{level}</span>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-xl bg-[var(--color-neutral-50)] p-3">
            <BookOpen className="mb-1 h-5 w-5 text-[#FF6038]" />
            <span className="text-lg font-bold text-[var(--color-neutral-800)]">{stats.totalRecords}</span>
            <span className="text-xs text-[var(--color-neutral-500)]">기록</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-[var(--color-neutral-50)] p-3">
            <Flame className="mb-1 h-5 w-5 text-[#FF6038]" />
            <span className="text-lg font-bold text-[var(--color-neutral-800)]">{stats.currentStreakDays}</span>
            <span className="text-xs text-[var(--color-neutral-500)]">연속일</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-[var(--color-neutral-50)] p-3">
            <Star className="mb-1 h-5 w-5 text-[#FF6038]" />
            <span className="text-lg font-bold text-[var(--color-neutral-800)]">{stats.points}</span>
            <span className="text-xs text-[var(--color-neutral-500)]">포인트</span>
          </div>
        </div>
      )}

      {/* Taste DNA */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
          취향 DNA
        </h2>
        {tasteDna ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#FF6038]">{tasteDna.tasteTypeName}</span>
              <span className="text-xs text-[var(--color-neutral-400)]">{tasteDna.sampleCount}개 기록 기반</span>
            </div>
            <div className="flex flex-col gap-2">
              {(Object.entries(FLAVOR_LABELS) as [keyof TasteDna, string][]).map(([key, label]) => (
                <FlavorBar key={key} label={label} value={tasteDna[key] as number} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-10">
            <p className="text-center text-sm text-[var(--color-neutral-500)]">
              기록이 5개 이상이면 취향 DNA가 생성됩니다
            </p>
          </div>
        )}
      </section>

      {/* Experience Atlas */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
          경험 Atlas
        </h2>
        {regions.length > 0 || genres.length > 0 ? (
          <div className="flex flex-col gap-3">
            {regions.length > 0 && (
              <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4">
                <span className="text-xs font-medium text-[var(--color-neutral-500)]">지역</span>
                <div className="flex flex-wrap gap-2">
                  {regions.slice(0, 6).map((r) => (
                    <span key={r.region} className="rounded-full bg-[var(--color-neutral-50)] px-3 py-1.5 text-xs text-[var(--color-neutral-700)]">
                      {r.region} Lv.{r.level}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {genres.length > 0 && (
              <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-4">
                <span className="text-xs font-medium text-[var(--color-neutral-500)]">장르</span>
                <div className="flex flex-wrap gap-2">
                  {genres.slice(0, 6).map((g) => (
                    <span key={g.category} className="rounded-full bg-[var(--color-neutral-50)] px-3 py-1.5 text-xs text-[var(--color-neutral-700)]">
                      {g.category} Lv.{g.level}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-10">
            <p className="text-center text-sm text-[var(--color-neutral-500)]">
              기록하면 자동으로 영역이 쌓입니다
            </p>
          </div>
        )}
      </section>

      {/* Record Timeline */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
          기록 타임라인
        </h2>
        {records && records.data.length > 0 ? (
          <div className="flex flex-col gap-2">
            {records.data.map((record) => (
              <div key={record.id} onClick={() => router.push(`/records/${record.id}`)} className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3 active:bg-[var(--color-neutral-50)]">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--color-neutral-800)]">{record.menuName}</span>
                  <span className="text-xs text-[var(--color-neutral-400)]">
                    {new Date(record.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-[#FF6038]" />
                  <span className="text-sm font-medium text-[var(--color-neutral-700)]">{record.ratingOverall.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-10">
            <p className="text-center text-sm text-[var(--color-neutral-500)]">
              아직 기록이 없습니다
            </p>
          </div>
        )}
      </section>

      {/* Settings & Logout */}
      <div className="flex flex-col gap-2">
        <Link
          href="#"
          className="flex items-center justify-between rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3.5"
        >
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-[var(--color-neutral-500)]" />
            <span className="text-sm text-[var(--color-neutral-700)]">설정</span>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--color-neutral-400)]" />
        </Link>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3.5 text-left text-sm text-[var(--color-neutral-500)]"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
