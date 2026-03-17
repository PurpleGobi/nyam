"use client"

import { useCallback, useState } from "react"
import { Heart, Loader2, Search, Users } from "lucide-react"
import useSWR from "swr"
import { useAuth } from "@/application/hooks/use-auth"
import { useCompatibility } from "@/application/hooks/use-compatibility"
import { createClient } from "@/infrastructure/supabase/client"

interface BubbleMember {
  userId: string
  nickname: string
}

function useBubbleMembers(userId: string | null) {
  const supabase = createClient()

  const { data, isLoading } = useSWR<BubbleMember[]>(
    userId ? `bubble-members/${userId}` : null,
    async () => {
      if (!userId) return []

      // Get groups user belongs to
      const { data: memberships } = await supabase
        .from("group_memberships")
        .select("group_id")
        .eq("user_id", userId)
        .eq("status", "active")

      if (!memberships || memberships.length === 0) return []

      const groupIds = memberships.map((m) => m.group_id)

      // Get other members from those groups
      const { data: otherMembers } = await supabase
        .from("group_memberships")
        .select("user_id, users(nickname)")
        .in("group_id", groupIds)
        .eq("status", "active")
        .neq("user_id", userId)

      if (!otherMembers) return []

      const unique = new Map<string, BubbleMember>()
      for (const m of otherMembers) {
        const uid = m.user_id as string
        const nickname = (m.users as unknown as Record<string, unknown>)?.nickname as string
        if (!unique.has(uid)) {
          unique.set(uid, { userId: uid, nickname: nickname ?? "익명" })
        }
      }

      return Array.from(unique.values())
    },
  )

  return { members: data ?? [], isLoading }
}

function ScoreGauge({ score }: { score: number }) {
  const color =
    score >= 80 ? "text-red-500" : score >= 60 ? "text-orange-500" : score >= 40 ? "text-amber-500" : "text-neutral-400"
  const bg =
    score >= 80 ? "bg-red-50" : score >= 60 ? "bg-orange-50" : score >= 40 ? "bg-amber-50" : "bg-neutral-50"
  const label =
    score >= 80 ? "환상의 궁합!" : score >= 60 ? "잘 맞아요" : score >= 40 ? "나쁘지 않아요" : "서로 다른 취향"

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`flex h-24 w-24 items-center justify-center rounded-full ${bg}`}>
        <span className={`text-3xl font-bold ${color}`}>{score}</span>
      </div>
      <p className={`text-sm font-semibold ${color}`}>{label}</p>
    </div>
  )
}

export function CompatibilityContainer() {
  const { user } = useAuth()
  const { score, breakdown, isLoading, error, checkCompatibility } = useCompatibility()
  const { members, isLoading: membersLoading } = useBubbleMembers(user?.id ?? null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredMembers = searchQuery
    ? members.filter((m) => m.nickname.includes(searchQuery))
    : members

  const handleCheck = useCallback(() => {
    if (selectedUserId) checkCompatibility(selectedUserId)
  }, [selectedUserId, checkCompatibility])

  if (membersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-neutral-700">맛 궁합 매칭</h3>
          <p className="mt-1 text-sm text-neutral-500">
            버블에 가입하면 멤버들과 맛 궁합을 비교할 수 있어요
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      <div className="text-center">
        <h1 className="text-lg font-bold text-neutral-800">맛 궁합 매칭</h1>
        <p className="mt-1 text-sm text-neutral-500">
          친구를 선택하고 맛 궁합을 확인해보세요
        </p>
      </div>

      {/* Member search */}
      <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="멤버 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
          />
        </div>

        <div className="mt-3 flex flex-col gap-1 max-h-48 overflow-y-auto">
          {filteredMembers.length === 0 && (
            <p className="py-4 text-center text-xs text-neutral-400">검색 결과가 없어요</p>
          )}
          {filteredMembers.map((member) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => setSelectedUserId(member.userId)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                selectedUserId === member.userId
                  ? "bg-primary-50 ring-1 ring-primary-200"
                  : "hover:bg-neutral-50"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-500">
                {member.nickname.charAt(0)}
              </div>
              <span className="text-sm font-medium text-neutral-700">{member.nickname}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Check button */}
      <button
        type="button"
        disabled={!selectedUserId || isLoading}
        onClick={handleCheck}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:bg-neutral-200 disabled:text-neutral-400"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className="h-4 w-4" />
        )}
        궁합 확인하기
      </button>

      {/* Result */}
      {score !== null && (
        <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-sm)]">
          <ScoreGauge score={score} />
          {breakdown && (
            <div className="mt-4 rounded-xl bg-neutral-50 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">맛 유사도</span>
                <span className="font-semibold text-neutral-700">{breakdown.flavorSimilarity}%</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all"
                  style={{ width: `${breakdown.flavorSimilarity}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-center text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
