"use client"

import Link from "next/link"
import { ArrowLeft, Users, Globe, Lock } from "lucide-react"
import { useGroupDetail } from "@/application/hooks/use-group-detail"
import { RecordCard } from "@/presentation/components/record/record-card"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { ROUTES } from "@/shared/constants/routes"

interface GroupDetailContainerProps {
  groupId: string
}

export function GroupDetailContainer({ groupId }: GroupDetailContainerProps) {
  const { group, members, recentRecords, isLoading } = useGroupDetail(groupId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 pt-6 pb-4">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
        <div className="h-10 w-48 animate-pulse rounded-lg bg-neutral-100" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="px-4 pt-6 pb-4">
        <EmptyState
          icon={Users}
          title="버블을 찾을 수 없어요"
          description="삭제되었거나 존재하지 않는 버블이에요"
          actionLabel="버블 목록"
          actionHref={ROUTES.GROUPS}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6">
        <Link href={ROUTES.GROUPS} className="text-neutral-500 hover:text-neutral-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold text-neutral-800">{group.name}</h1>
        {group.accessType === "private" ? (
          <Lock className="h-4 w-4 text-neutral-400" />
        ) : (
          <Globe className="h-4 w-4 text-neutral-400" />
        )}
      </div>

      {/* Group info card */}
      <div className="mx-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-sm)]">
        {group.description && (
          <p className="text-sm text-neutral-600">{group.description}</p>
        )}
        <div className="mt-3 flex gap-4 text-xs text-neutral-400">
          <span>{group.memberCount ?? members.length}명 멤버</span>
          <span>{group.stats?.recordCount ?? recentRecords.length}개 기록</span>
          <span>{group.accessType === "private" ? "비공개" : "공개"}</span>
        </div>
      </div>

      {/* Members */}
      <div className="px-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">멤버</h2>
        <div className="flex -space-x-2">
          {members.slice(0, 8).map((member) => (
            <div
              key={member.userId}
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-neutral-100 text-xs font-medium text-neutral-500"
            >
              {member.role === "owner" ? "O" : "M"}
            </div>
          ))}
          {members.length > 8 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-xs font-medium text-neutral-500">
              +{members.length - 8}
            </div>
          )}
        </div>
      </div>

      {/* Records */}
      <div className="px-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-700">기록</h2>
        {recentRecords.length === 0 ? (
          <EmptyState
            icon={Users}
            title="아직 기록이 없어요"
            description="첫 기록을 남겨보세요"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recentRecords.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
