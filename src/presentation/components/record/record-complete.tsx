'use client'

import { Check, Star } from 'lucide-react'

interface RecordCompleteProps {
  menuName: string
  category: string
  ratingOverall: number
  onGoHome: () => void
  onAddAnother: () => void
}

export function RecordComplete({
  menuName,
  category,
  ratingOverall,
  onGoHome,
  onAddAnother,
}: RecordCompleteProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12 px-4">
      <div className="size-20 rounded-full bg-[#FF6038]/10 flex items-center justify-center">
        <Check className="size-10 text-[#FF6038]" strokeWidth={2.5} />
      </div>

      <div className="flex flex-col items-center gap-2">
        <h2 className="text-xl font-bold text-neutral-800">
          기록 완료!
        </h2>
        <p className="text-sm text-neutral-500">
          {category} / {menuName}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="size-5 fill-[#E9B949] text-[#E9B949]" />
          <span className="text-lg font-semibold text-neutral-800">
            {Math.round(ratingOverall)}
          </span>
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <button
          type="button"
          onClick={onGoHome}
          className="flex-1 py-2.5 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          홈으로
        </button>
        <button
          type="button"
          onClick={onAddAnother}
          className="flex-1 py-2.5 rounded-lg bg-[#FF6038] text-sm font-medium text-white hover:bg-[#FF6038]/90 transition-colors"
        >
          하나 더 기록
        </button>
      </div>
    </div>
  )
}
