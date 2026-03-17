"use client"

import { cn } from "@/shared/utils/cn"
import type { RecordType } from "@/infrastructure/supabase/types"

interface RecordTypeSelectorProps {
  value: RecordType
  onChange: (type: RecordType) => void
}

const TYPES: Array<{ value: RecordType; label: string }> = [
  { value: "restaurant", label: "식당" },
  { value: "wine", label: "와인" },
  { value: "cooking", label: "요리" },
]

export function RecordTypeSelector({ value, onChange }: RecordTypeSelectorProps) {
  return (
    <div className="flex gap-2">
      {TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className={cn(
            "flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors",
            value === type.value
              ? "bg-primary-500 text-white"
              : "bg-neutral-100 text-neutral-500",
          )}
        >
          {type.label}
        </button>
      ))}
    </div>
  )
}
