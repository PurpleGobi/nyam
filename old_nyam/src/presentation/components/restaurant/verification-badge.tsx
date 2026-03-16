'use client';

import { Shield, ShieldAlert, ShieldCheck, Star } from 'lucide-react';
import type { VerificationLevel } from '@/domain/entities/verification';
import { cn } from '@/shared/utils/cn';

export interface VerificationBadgeProps {
  /** Verification level determining icon, color, and label */
  level: VerificationLevel;
  /** Number of verifications */
  count: number;
  /** Badge size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { icon: 14, text: 'text-[11px] tracking-[0.08em]', height: 'h-[22px]', gap: 'gap-1' },
  md: { icon: 18, text: 'text-xs', height: 'h-[28px]', gap: 'gap-1.5' },
  lg: { icon: 24, text: 'text-sm', height: 'h-[36px]', gap: 'gap-2' },
} as const;

interface LevelConfig {
  icon: typeof Shield;
  filled: boolean;
  colorClass: string;
  bgClass: string;
  label: (count: number) => string;
}

const levelConfig: Record<VerificationLevel, LevelConfig> = {
  unverified: {
    icon: Shield,
    filled: false,
    colorClass: 'text-[var(--color-neutral-400)]',
    bgClass: 'bg-[var(--color-unverified-bg)]',
    label: () => '미검증',
  },
  partial: {
    icon: ShieldCheck,
    filled: false,
    colorClass: 'text-[var(--color-accent-500)]',
    bgClass: 'bg-[var(--color-partial-bg)]',
    label: (count) => `검증 중 (${count}회)`,
  },
  verified: {
    icon: ShieldCheck,
    filled: true,
    colorClass: 'text-[var(--color-verified)]',
    bgClass: 'bg-[var(--color-verified-bg)]',
    label: () => '검증 완료',
  },
  trusted: {
    icon: ShieldCheck,
    filled: true,
    colorClass: 'text-[var(--color-verified-text)]',
    bgClass: 'bg-[var(--color-verified-bg)]',
    label: () => '신뢰 맛집',
  },
  suspicious: {
    icon: ShieldAlert,
    filled: true,
    colorClass: 'text-[var(--color-suspicious)]',
    bgClass: 'bg-[var(--color-suspicious-bg)]',
    label: () => '검증 주의',
  },
};

/**
 * Verification badge showing the trust level of a restaurant.
 * Replaces traditional star ratings with a shield-based verification system.
 */
export function VerificationBadge({ level, count, size = 'md' }: VerificationBadgeProps) {
  const config = levelConfig[level];
  const sizeConf = sizeConfig[size];
  const IconComponent = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2',
        sizeConf.height,
        sizeConf.gap,
        config.bgClass,
        config.colorClass,
      )}
    >
      <span className="relative inline-flex items-center">
        <IconComponent
          size={sizeConf.icon}
          fill={config.filled ? 'currentColor' : 'none'}
          strokeWidth={1.5}
        />
        {level === 'trusted' && (
          <Star
            size={sizeConf.icon * 0.45}
            fill="currentColor"
            strokeWidth={0}
            className="absolute -right-1 -top-1"
          />
        )}
      </span>
      <span className={cn('font-semibold whitespace-nowrap', sizeConf.text)}>
        {config.label(count)}
      </span>
    </span>
  );
}
