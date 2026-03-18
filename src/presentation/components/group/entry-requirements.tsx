"use client"

import { Lock, Globe, Users, Eye } from "lucide-react"

interface EntryRequirementsProps {
  accessType: "private" | "public"
  memberCount: number
  maxMembers?: number
  sharingType: "interactive" | "view_only"
}

const sharingTypeLabels = {
  interactive: "서로의 기록에 반응할 수 있어요",
  view_only: "기록을 조회만 할 수 있어요",
} as const

export function EntryRequirements({
  accessType,
  memberCount,
  maxMembers,
  sharingType,
}: EntryRequirementsProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-sm)]">
      {/* Access type */}
      <div className="flex items-center gap-2.5">
        {accessType === "private" ? (
          <Lock className="h-4 w-4 text-neutral-400" />
        ) : (
          <Globe className="h-4 w-4 text-neutral-400" />
        )}
        <span className="text-sm text-neutral-700">
          {accessType === "private" ? "비공개 버블" : "공개 버블"}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            accessType === "private"
              ? "bg-neutral-100 text-neutral-500"
              : "bg-green-50 text-green-600"
          }`}
        >
          {accessType === "private" ? "초대 필요" : "누구나 참여"}
        </span>
      </div>

      {/* Member count */}
      <div className="flex items-center gap-2.5">
        <Users className="h-4 w-4 text-neutral-400" />
        <span className="text-sm text-neutral-700">
          {memberCount}명 참여 중
          {maxMembers != null && (
            <span className="text-neutral-400"> / {maxMembers}명</span>
          )}
        </span>
      </div>

      {/* Sharing type */}
      <div className="flex items-center gap-2.5">
        <Eye className="h-4 w-4 text-neutral-400" />
        <span className="text-sm text-neutral-700">
          {sharingTypeLabels[sharingType]}
        </span>
      </div>
    </div>
  )
}
