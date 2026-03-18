"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { useGroups } from "@/application/hooks/use-groups"
import { usePublicGroups } from "@/application/hooks/use-public-groups"
import { useGroupActions } from "@/application/hooks/use-group-actions"
import { GroupCard } from "@/presentation/components/group/group-card"
import { CreateGroupModal } from "@/presentation/components/group/create-group-modal"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { cn } from "@/shared/utils/cn"
import { Users } from "lucide-react"

export function GroupsContainer() {
  const [tab, setTab] = useState<"my" | "discover">("my")
  const [showCreate, setShowCreate] = useState(false)
  const { groups: myGroups, isLoading: myLoading, mutate } = useGroups()
  const { groups: publicGroups, isLoading: publicLoading } = usePublicGroups()
  const { createGroup, isLoading: actionLoading } = useGroupActions()

  const handleCreate = async (data: { name: string; description: string; accessType: "private" | "public" }) => {
    try {
      await createGroup(data)
      setShowCreate(false)
      mutate()
    } catch (err) {
      console.error("Group creation failed:", err)
      alert(`버블 생성 실패: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const groups = tab === "my" ? myGroups : publicGroups
  const isLoading = tab === "my" ? myLoading : publicLoading

  return (
    <div className="flex flex-col gap-3 px-4 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("my")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === "my" ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-500",
            )}
          >
            내 버블
          </button>
          <button
            type="button"
            onClick={() => setTab("discover")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === "discover" ? "bg-primary-500 text-white" : "bg-neutral-100 text-neutral-500",
            )}
          >
            탐색
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title={tab === "my" ? "아직 버블이 없어요" : "공개 버블이 없어요"}
          description={tab === "my" ? "새 버블을 만들어보세요" : "첫 공개 버블을 만들어보세요"}
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}

      <CreateGroupModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
        isLoading={actionLoading}
      />
    </div>
  )
}
