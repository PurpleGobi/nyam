"use client"

import Image from "next/image"
import { Swords, ImageOff } from "lucide-react"

interface MatchupRecord {
  id: string
  title: string
  thumbnailUrl: string | null
  overallRating: number
}

interface MatchupCardProps {
  record1: MatchupRecord
  record2: MatchupRecord
  onSelect: (winnerId: string) => void
  round: number
  totalRounds: number
}

function RecordSide({
  record,
  onSelect,
}: {
  record: MatchupRecord
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-1 flex-col items-center gap-2 rounded-2xl bg-white p-3 shadow-[var(--shadow-sm)] transition-all active:scale-[0.97] hover:ring-2 hover:ring-primary-500"
    >
      {record.thumbnailUrl ? (
        <div className="relative h-28 w-full overflow-hidden rounded-xl">
          <Image
            src={record.thumbnailUrl}
            alt={record.title}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-xl bg-neutral-100">
          <ImageOff className="h-6 w-6 text-neutral-300" />
        </div>
      )}
      <span className="line-clamp-2 text-center text-sm font-medium text-neutral-800">
        {record.title}
      </span>
      <span className="text-xs text-neutral-400">
        {record.overallRating}점
      </span>
    </button>
  )
}

export function MatchupCard({
  record1,
  record2,
  onSelect,
  round,
  totalRounds,
}: MatchupCardProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Round indicator */}
      <span className="text-xs font-medium text-neutral-400">
        Round {round} / {totalRounds}
      </span>

      {/* VS layout */}
      <div className="flex w-full items-center gap-3">
        <RecordSide record={record1} onSelect={() => onSelect(record1.id)} />

        <div className="flex flex-col items-center gap-1">
          <Swords className="h-5 w-5 text-neutral-300" />
          <span className="text-xs font-bold text-neutral-300">VS</span>
        </div>

        <RecordSide record={record2} onSelect={() => onSelect(record2.id)} />
      </div>
    </div>
  )
}
