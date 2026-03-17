import { cn } from "@/shared/utils/cn"

interface LevelBadgeProps {
  level: number
  points: number
  className?: string
}

export function LevelBadge({ level, points, className }: LevelBadgeProps) {
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1", className)}>
      <span className="text-xs font-bold text-primary-500">Lv.{level}</span>
      <span className="text-[10px] text-neutral-400">{points} XP</span>
    </div>
  )
}
