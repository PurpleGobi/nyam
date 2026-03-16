import { Award } from 'lucide-react';
import type { Badge } from '@/domain/entities/badge';
import { cn } from '@/shared/utils/cn';

export interface BadgeCardProps {
  readonly badge: Badge;
  readonly earned: boolean;
  readonly earnedAt: Date | null;
}

const tierColors: Record<string, string> = {
  bronze: 'from-amber-600 to-amber-800',
  silver: 'from-gray-300 to-gray-500',
  gold: 'from-yellow-400 to-amber-500',
  master: 'from-purple-500 to-indigo-600',
};

export function BadgeCard({ badge, earned, earnedAt }: BadgeCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-[var(--radius-lg)] p-4',
        'transition-all duration-200',
        earned
          ? 'bg-[var(--color-neutral-0)] shadow-[var(--shadow-sm)]'
          : 'bg-[var(--color-neutral-50)] opacity-50',
      )}
    >
      <div
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full',
          earned && badge.tier
            ? `bg-gradient-to-br ${tierColors[badge.tier] ?? tierColors.bronze}`
            : 'bg-[var(--color-neutral-200)]',
        )}
      >
        <Award
          size={28}
          strokeWidth={1.5}
          className={earned ? 'text-white' : 'text-[var(--color-neutral-400)]'}
        />
      </div>
      <span className="text-center text-sm font-medium text-[var(--color-neutral-800)]">
        {badge.name}
      </span>
      <span className="text-center text-xs text-[var(--color-neutral-500)]">
        {badge.description}
      </span>
      {earned && earnedAt && (
        <span className="text-[10px] text-[var(--color-neutral-400)]">
          {earnedAt.toLocaleDateString('ko-KR')}
        </span>
      )}
    </div>
  );
}
