"use client"

import { Bookmark as BookmarkIcon } from "lucide-react"
import { useBookmarks } from "@/application/hooks/use-bookmarks"
import { RecordCard } from "@/presentation/components/record/record-card"
import { EmptyState } from "@/presentation/components/ui/empty-state"

export function BookmarksContainer() {
  const { bookmarks, isLoading } = useBookmarks()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-4 pt-6 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 pt-6 pb-4">
      <h1 className="text-lg font-semibold text-neutral-800">북마크</h1>

      {bookmarks.length === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title="저장한 기록이 없어요"
          description="마음에 드는 기록을 북마크해보세요"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {bookmarks.map((bookmark) => (
            <RecordCard key={bookmark.recordId} record={bookmark.record} />
          ))}
        </div>
      )}
    </div>
  )
}
