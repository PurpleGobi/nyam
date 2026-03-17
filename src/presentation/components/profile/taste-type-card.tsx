"use client"

import { UtensilsCrossed, Wine, CookingPot } from "lucide-react"
import { TasteDnaRadar } from "@/presentation/components/profile/taste-dna-radar"

interface TasteTypeCardProps {
  type: "food" | "wine" | "cooking"
  label: string
  axes: Array<{ label: string; value: number }>
  color: string
}

const typeIcons = {
  food: UtensilsCrossed,
  wine: Wine,
  cooking: CookingPot,
} as const

export function TasteTypeCard({ type, label, axes, color }: TasteTypeCardProps) {
  const Icon = typeIcons[type]

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1a` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <span className="text-sm font-semibold text-neutral-800">{label}</span>
      </div>

      {/* Radar chart */}
      <TasteDnaRadar axes={axes} color={color} size={120} />
    </div>
  )
}
