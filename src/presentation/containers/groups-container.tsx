"use client"

import { useState } from "react"
import { Users, Plus, Crown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "@/presentation/providers/auth-provider"
import { useGroups } from "@/application/hooks/use-groups"
import { useGroupActions } from "@/application/hooks/use-group-actions"
import { usePublicGroups } from "@/application/hooks/use-public-groups"
import { CreateGroupModal } from "@/presentation/components/group/create-group-modal"
import { PublicGroupsSection } from "@/presentation/components/group/public-groups-section"
import type { GroupType, GroupEntryRequirements } from "@/domain/entities/group"

const DEFAULT_ENTRY_REQUIREMENTS: GroupEntryRequirements = {
  minLevel: null,
  minRecords: null,
  minCategory: null,
  minRegion: null,
  minFrequency: null,
  requiresApproval: false,
}

export function GroupsContainer() {
  const router = useRouter()
  const { user: authUser } = useAuthContext()
  const { data: groups, isLoading, mutate } = useGroups(authUser?.id)
  const { createGroup, joinGroup, isLoading: isCreating } = useGroupActions()
  const { data: publicGroups, isLoading: isPublicLoading } = usePublicGroups()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const handleJoinGroup = async (groupId: string) => {
    if (!authUser?.id) return
    setIsJoining(true)
    await joinGroup(groupId, authUser.id)
    setIsJoining(false)
    mutate()
  }

  const handleCreateGroup = async (data: { name: string; description: string; type: GroupType }) => {
    if (!authUser?.id) return
    const group = await createGroup({
      name: data.name,
      description: data.description,
      type: data.type,
      ownerId: authUser.id,
      entryRequirements: DEFAULT_ENTRY_REQUIREMENTS,
    })
    if (group) {
      setIsModalOpen(false)
      mutate()
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      {/* Header */}
      <h1 className="text-xl font-bold text-[var(--color-neutral-800)]">
        버블
      </h1>

      {/* My Groups */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
          내 버블
        </h2>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
            ))}
          </div>
        ) : groups && groups.length > 0 ? (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => router.push(`/groups/${group.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3.5 transition-colors active:bg-[var(--color-neutral-50)]"
              >
                <div className="flex flex-col">
                  <span className="flex items-center gap-1 text-sm font-medium text-[var(--color-neutral-800)]">
                    {group.name}
                    {group.type === 'viewonly' && <Crown className="h-3.5 w-3.5 text-[#FF6038]" />}
                  </span>
                  {group.description && (
                    <span className="mt-0.5 text-xs text-[var(--color-neutral-400)] line-clamp-1">{group.description}</span>
                  )}
                  <span className="mt-1 text-xs text-[var(--color-neutral-500)]">
                    멤버 {group.memberCount}명
                  </span>
                </div>
                <Users className="h-5 w-5 text-[var(--color-neutral-400)]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-16">
            <Users className="mb-3 h-8 w-8 text-[var(--color-neutral-300)]" />
            <p className="text-center text-sm text-[var(--color-neutral-500)]">
              첫 버블에 참여해보세요
            </p>
            <p className="mt-1 text-center text-xs text-[var(--color-neutral-400)]">
              같은 취향의 사람들과 맛집을 공유할 수 있어요
            </p>
          </div>
        )}
      </section>

      {/* Public Groups */}
      <PublicGroupsSection
        groups={publicGroups ?? []}
        isLoading={isPublicLoading}
        onJoin={handleJoinGroup}
        isJoining={isJoining}
      />

      {/* FAB */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6038] shadow-xl transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6 text-white" />
      </button>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateGroup}
        isLoading={isCreating}
      />
    </div>
  )
}
