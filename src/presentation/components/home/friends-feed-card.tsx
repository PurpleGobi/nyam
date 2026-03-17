"use client"

import Image from "next/image"
import { User } from "lucide-react"

interface FriendsFeedCardProps {
  nickname: string
  profileImageUrl: string | null
  recordTitle: string
  thumbnailUrl: string | null
  recordType: string
  createdAt: string
  onClick: () => void
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "방금 전"
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  return `${diffDay}일 전`
}

function recordTypeLabel(recordType: string): string {
  switch (recordType) {
    case "wine":
      return "와인"
    case "cooking":
      return "요리"
    default:
      return "식당"
  }
}

export function FriendsFeedCard({
  nickname,
  profileImageUrl,
  recordTitle,
  thumbnailUrl,
  recordType,
  createdAt,
  onClick,
}: FriendsFeedCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-[var(--shadow-sm)] transition-colors hover:bg-neutral-50 active:scale-[0.98]"
    >
      {/* Avatar */}
      {profileImageUrl ? (
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
          <Image
            src={profileImageUrl}
            alt={nickname}
            fill
            className="object-cover"
            sizes="32px"
          />
        </div>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100">
          <User className="h-4 w-4 text-neutral-400" />
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header: nickname + timestamp */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-800 truncate">
            {nickname}
          </span>
          <span className="shrink-0 text-[10px] text-neutral-400">
            {formatRelativeTime(createdAt)}
          </span>
        </div>

        {/* Record info */}
        <div className="mt-1.5 flex items-center gap-2">
          {thumbnailUrl ? (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
              <Image
                src={thumbnailUrl}
                alt={recordTitle}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
              <span className="text-[10px] text-neutral-400">
                {recordTypeLabel(recordType)}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm text-neutral-700">{recordTitle}</p>
            <p className="text-[10px] text-neutral-400">
              {recordTypeLabel(recordType)}
            </p>
          </div>
        </div>
      </div>
    </button>
  )
}
