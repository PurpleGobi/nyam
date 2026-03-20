import { cn } from "@/shared/utils/cn"

interface RatingBarItem {
  label: string
  value: number | null
}

interface RatingBarsProps {
  items: RatingBarItem[]
}

export function RatingBars({ items }: RatingBarsProps) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-14 text-xs text-neutral-500 shrink-0">{item.label}</span>
          <div className="flex-1 h-2 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                item.value != null ? "bg-primary-500" : "bg-neutral-200",
              )}
              style={{ width: `${item.value ?? 0}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs tabular-nums text-neutral-600">
            {item.value != null ? Math.round(item.value) : "-"}
          </span>
        </div>
      ))}
    </div>
  )
}
