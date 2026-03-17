"use client"

import Image from "next/image"
import { Trophy, ImageOff, RotateCcw, ArrowRight } from "lucide-react"

interface ComparisonResultProps {
  winner: {
    id: string
    title: string
    thumbnailUrl: string | null
    overallRating: number
  }
  totalMatchups: number
  onViewRecord: (id: string) => void
  onPlayAgain: () => void
}

export function ComparisonResult({
  winner,
  totalMatchups,
  onViewRecord,
  onPlayAgain,
}: ComparisonResultProps) {
  return (
    <div className="flex flex-col items-center gap-5 py-6">
      {/* Trophy */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
        <Trophy className="h-8 w-8 text-amber-500" />
      </div>

      {/* Title */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-neutral-800">우승</h2>
        <p className="mt-1 text-xs text-neutral-400">
          {totalMatchups}번의 대결을 거쳐 선정되었어요
        </p>
      </div>

      {/* Winner card */}
      <div className="w-full max-w-xs rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
        {winner.thumbnailUrl ? (
          <div className="relative h-40 w-full overflow-hidden rounded-xl">
            <Image
              src={winner.thumbnailUrl}
              alt={winner.title}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-xl bg-neutral-100">
            <ImageOff className="h-8 w-8 text-neutral-300" />
          </div>
        )}
        <h3 className="mt-3 text-center text-base font-semibold text-neutral-800">
          {winner.title}
        </h3>
        <p className="mt-1 text-center text-sm text-neutral-400">
          {winner.overallRating}점
        </p>
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-xs gap-3">
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-neutral-100 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-200"
        >
          <RotateCcw className="h-4 w-4" />
          다시 하기
        </button>
        <button
          type="button"
          onClick={() => onViewRecord(winner.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          기록 보기
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
