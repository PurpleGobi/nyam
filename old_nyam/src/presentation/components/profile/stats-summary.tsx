import type { UserStats } from "@/domain/entities/user"

interface StatsSummaryProps {
  stats: UserStats | null
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  const items = [
    { label: "총 기록", value: stats?.totalRecords ?? 0 },
    { label: "연속 기록", value: `${stats?.currentStreakDays ?? 0}일` },
    { label: "최장 연속", value: `${stats?.longestStreakDays ?? 0}일` },
  ]

  return (
    <div className="flex gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex-1 rounded-xl bg-neutral-50 p-3 text-center"
        >
          <p className="text-lg font-bold text-neutral-800">{item.value}</p>
          <p className="text-[10px] text-neutral-400">{item.label}</p>
        </div>
      ))}
    </div>
  )
}
