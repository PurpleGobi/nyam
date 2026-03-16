'use client'

import { cn } from '@/shared/utils/cn'

interface EntryRequirementsData {
  minLevel?: number | null
  minRecords?: number | null
  minCategory?: { category: string; count: number } | null
  minRegion?: { region: string; count: number } | null
  minFrequency?: number | null
  requiresApproval?: boolean
}

interface EntryRequirementsProps {
  requirements: EntryRequirementsData
  className?: string
}

export function EntryRequirements({
  requirements,
  className,
}: EntryRequirementsProps) {
  const items: { icon: string; label: string }[] = []

  if (requirements.minLevel != null) {
    items.push({ icon: '\u2B50', label: `냠 Lv.${requirements.minLevel}+` })
  }
  if (requirements.minRecords != null) {
    items.push({ icon: '\uD83D\uDCDD', label: `기록 ${requirements.minRecords}개+` })
  }
  if (requirements.minCategory != null) {
    items.push({
      icon: '\uD83C\uDF74',
      label: `${requirements.minCategory.category} ${requirements.minCategory.count}개+`,
    })
  }
  if (requirements.minRegion != null) {
    items.push({
      icon: '\uD83D\uDCCD',
      label: `${requirements.minRegion.region} ${requirements.minRegion.count}개+`,
    })
  }
  if (requirements.minFrequency != null) {
    items.push({ icon: '\uD83D\uDCC5', label: `주 ${requirements.minFrequency}회+` })
  }
  if (requirements.requiresApproval) {
    items.push({ icon: '\u270B', label: '승인 필요' })
  }

  if (items.length === 0) return null

  return (
    <div className={cn('bg-neutral-50 rounded-lg p-3 flex flex-col gap-2', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm text-[#334E68]">
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
