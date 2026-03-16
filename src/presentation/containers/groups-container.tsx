"use client"

import { Users, Plus } from "lucide-react"
import Link from "next/link"

export function GroupsContainer() {
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] px-6 py-16">
          <Users className="mb-3 h-8 w-8 text-[var(--color-neutral-300)]" />
          <p className="text-center text-sm text-[var(--color-neutral-500)]">
            첫 그룹에 참여해보세요
          </p>
          <p className="mt-1 text-center text-xs text-[var(--color-neutral-400)]">
            같은 취향의 사람들과 맛집을 공유할 수 있어요
          </p>
        </div>
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
