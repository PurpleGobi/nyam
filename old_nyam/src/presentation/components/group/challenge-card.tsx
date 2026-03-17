import { Check, Zap, MapPin, Grid3x3, Target } from 'lucide-react'
import type { ChallengeWithProgress } from '@/domain/entities/challenge'

const ICON_MAP: Record<string, typeof Target> = {
  Zap,
  MapPin,
  Grid3x3,
}

interface ChallengeCardProps {
  challenge: ChallengeWithProgress
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const { progress } = challenge
  const percentage = Math.round((progress.current / progress.target) * 100)
  const Icon = ICON_MAP[challenge.icon] ?? Target

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-neutral-200)] bg-white p-4">
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            backgroundColor: progress.completed
              ? 'rgba(34, 197, 94, 0.1)'
              : 'rgba(255, 96, 56, 0.1)',
          }}
        >
          {progress.completed ? (
            <Check className="h-4 w-4" style={{ color: '#22C55E' }} />
          ) : (
            <Icon className="h-4 w-4" style={{ color: '#FF6038' }} />
          )}
        </div>
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-semibold text-[var(--color-neutral-800)]">
            {challenge.title}
          </span>
          <span className="text-xs text-[var(--color-neutral-500)]">
            {challenge.description}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-neutral-100)]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percentage}%`,
              backgroundColor: progress.completed ? '#22C55E' : '#FF6038',
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--color-neutral-400)]">
            {progress.current} / {progress.target}
          </span>
          {progress.completed && (
            <span className="text-xs font-medium" style={{ color: '#22C55E' }}>
              완료!
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
