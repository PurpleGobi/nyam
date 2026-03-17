import Link from "next/link"
import { Users, Lock, Globe } from "lucide-react"
import { ROUTES } from "@/shared/constants/routes"
import type { GroupWithStats } from "@/domain/entities/group"

interface GroupCardProps {
  group: GroupWithStats
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link href={ROUTES.groupDetail(group.id)} className="block">
      <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {group.accessType === "private" ? (
              <Lock className="h-4 w-4 text-neutral-400" />
            ) : (
              <Globe className="h-4 w-4 text-neutral-400" />
            )}
            <h3 className="text-sm font-semibold text-neutral-800">{group.name}</h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <Users className="h-3.5 w-3.5" />
            <span>{group.memberCount}</span>
          </div>
        </div>
        {group.description && (
          <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{group.description}</p>
        )}
        <div className="mt-2 flex gap-2 text-[10px] text-neutral-400">
          <span>{group.stats?.recordCount ?? 0}개 기록</span>
          <span>·</span>
          <span>{group.accessType === "private" ? "비공개" : "공개"}</span>
        </div>
      </div>
    </Link>
  )
}
