'use client'

import { cn } from '@/shared/utils/cn'

interface TasteTypeCardProps {
  code: string
  name: string
  className?: string
}

const LETTER_PAIRS: Array<{
  index: number
  options: [{ letter: string; label: string }, { letter: string; label: string }]
}> = [
  {
    index: 0,
    options: [
      { letter: 'A', label: '모험형' },
      { letter: 'S', label: '안정형' },
    ],
  },
  {
    index: 1,
    options: [
      { letter: 'E', label: '미식형' },
      { letter: 'P', label: '실속형' },
    ],
  },
  {
    index: 2,
    options: [
      { letter: 'S', label: '소셜형' },
      { letter: 'I', label: '솔로형' },
    ],
  },
  {
    index: 3,
    options: [
      { letter: 'F', label: '자주형' },
      { letter: 'R', label: '가끔형' },
    ],
  },
]

export function TasteTypeCard({ code, name, className }: TasteTypeCardProps) {
  const upperCode = code.toUpperCase()

  return (
    <div
      className={cn(
        'rounded-xl border border-neutral-100 bg-gradient-to-br from-[#FF6038]/5 to-[#E9B949]/5 p-4',
        className,
      )}
    >
      <p className="text-2xl font-bold tracking-wider text-[#334E68]">
        {upperCode}
      </p>
      <p className="mt-0.5 text-sm text-neutral-500">{name}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {LETTER_PAIRS.map((pair) => {
          const activeLetter = upperCode[pair.index]
          return (
            <div key={pair.index} className="flex items-center gap-1.5 text-xs">
              {pair.options.map((opt) => {
                const isActive =
                  activeLetter === opt.letter.toUpperCase()
                return (
                  <span
                    key={opt.letter}
                    className={cn(
                      'font-medium',
                      isActive ? 'text-[#FF6038]' : 'text-neutral-300',
                    )}
                  >
                    {opt.letter}
                    <span className="ml-0.5 font-normal">{opt.label}</span>
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
