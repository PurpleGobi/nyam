"use client"

import Image from "next/image"
import { Crown, Shield, User } from "lucide-react"

interface GroupMember {
  userId: string
  nickname: string
  profileImageUrl: string | null
  role: "owner" | "moderator" | "member"
}

interface GroupMemberListProps {
  members: GroupMember[]
  onMemberClick?: (userId: string) => void
}

const roleConfig = {
  owner: { icon: Crown, label: "Owner", badgeClass: "bg-amber-100 text-amber-600" },
  moderator: { icon: Shield, label: "Moderator", badgeClass: "bg-blue-100 text-blue-600" },
  member: { icon: null, label: "Member", badgeClass: "" },
} as const

export function GroupMemberList({ members, onMemberClick }: GroupMemberListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {members.map((member) => {
        const config = roleConfig[member.role]
        const RoleIcon = config.icon

        return (
          <li key={member.userId}>
            <button
              type="button"
              onClick={() => onMemberClick?.(member.userId)}
              disabled={!onMemberClick}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-neutral-50 disabled:cursor-default disabled:hover:bg-transparent"
            >
              {/* Avatar */}
              {member.profileImageUrl ? (
                <Image
                  src={member.profileImageUrl}
                  alt={member.nickname}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                  <User className="h-4 w-4 text-neutral-400" />
                </div>
              )}

              {/* Name */}
              <span className="flex-1 text-left text-sm font-medium text-neutral-800">
                {member.nickname}
              </span>

              {/* Role badge */}
              {RoleIcon && (
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.badgeClass}`}>
                  <RoleIcon className="h-3 w-3" />
                  {config.label}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
