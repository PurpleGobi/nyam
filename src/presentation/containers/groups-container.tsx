"use client"

import { Users, Plus } from "lucide-react"
import Link from "next/link"
import { useAuthContext } from "@/presentation/providers/auth-provider"
import { useGroups } from "@/application/hooks/use-groups"

export function GroupsContainer() {
  const { user: authUser } = useAuthContext()
  const { data: groups, isLoading } = useGroups(authUser?.id)

  return (
    <div className="flex flex-col gap-6 px-4 pt-6">
      {/* Header */}
      <h1 className="text-xl font-bold text-[var(--color-neutral-800)]">
        그룹
      </h1>

      {/* My Groups */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-[var(--color-neutral-700)]">
          내 그룹
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
              <div key={group.id} className="flex items-center justify-between rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3.5">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[var(--color-neutral-800)]">{group.name}</span>
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
              첫 그룹에 참여해보세요
            </p>
            <p className="mt-1 text-center text-xs text-[var(--color-neutral-400)]">
              같은 취향의 사람들과 맛집을 공유할 수 있어요
            </p>
          </div>
        )}
      </section>

      {/* FAB */}
      <Link
        href="#"
        className="fixed bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6038] shadow-xl transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6 text-white" />
      </Link>
    </div>
  )
}
