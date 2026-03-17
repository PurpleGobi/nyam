"use client"

import { useSearchParams } from "next/navigation"
import { Users, Lock, Globe, UserPlus } from "lucide-react"
import { useInvite } from "@/application/hooks/use-invite"
import { EmptyState } from "@/presentation/components/ui/empty-state"

export function GroupJoinContainer() {
  const searchParams = useSearchParams()
  const code = searchParams.get("code")
  const { group, isLoading, isJoining, joinError, joinGroup } = useInvite(code)

  if (!code) {
    return (
      <div className="px-4 pt-6 pb-4">
        <EmptyState
          icon={UserPlus}
          title="초대 코드가 없어요"
          description="초대 링크를 다시 확인해주세요"
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
        <div className="h-40 animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="px-4 pt-6 pb-4">
        <EmptyState
          icon={UserPlus}
          title="버블을 찾을 수 없어요"
          description="유효하지 않은 초대 코드예요"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">
      {/* Group preview */}
      <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-2 mb-2">
          {group.accessType === "private" ? (
            <Lock className="h-4 w-4 text-neutral-400" />
          ) : (
            <Globe className="h-4 w-4 text-neutral-400" />
          )}
          <h2 className="text-lg font-semibold text-neutral-800">{group.name}</h2>
        </div>
        {group.description && (
          <p className="text-sm text-neutral-500">{group.description}</p>
        )}
        <div className="mt-3 flex items-center gap-1 text-xs text-neutral-400">
          <Users className="h-3.5 w-3.5" />
          <span>{group.accessType === "private" ? "비공개 버블" : "공개 버블"}</span>
        </div>
      </div>

      {/* Error */}
      {joinError && (
        <p className="text-center text-sm text-red-500">{joinError}</p>
      )}

      {/* Join button */}
      <button
        type="button"
        onClick={joinGroup}
        disabled={isJoining}
        className="h-12 rounded-xl bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
      >
        {isJoining ? "가입 중..." : "버블 가입하기"}
      </button>
    </div>
  )
}
