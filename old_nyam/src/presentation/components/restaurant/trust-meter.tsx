'use client';

import { motion } from 'framer-motion';
import { cn } from '@/shared/utils/cn';

export interface TrustMeterProps {
  /** Taste score (0-100) */
  taste: number;
  /** Value-for-money score (0-100) */
  value: number;
  /** Service score (0-100) */
  service: number;
  /** Ambiance score (0-100) */
  ambiance: number;
  /** Whether to animate bar fill on mount */
  animated?: boolean;
}

interface BarItem {
  label: string;
  score: number;
}

/**
 * Multi-dimensional bar chart replacing star ratings.
 * Displays taste, value, service, and ambiance as horizontal bars.
 */
export function TrustMeter({ taste, value, service, ambiance, animated = true }: TrustMeterProps) {
  const bars: BarItem[] = [
    { label: '맛', score: taste },
    { label: '가성비', score: value },
    { label: '서비스', score: service },
    { label: '분위기', score: ambiance },
  ];

  return (
    <div className="flex w-full flex-col gap-2">
      {bars.map((bar) => (
        <div key={bar.label} className="flex items-center gap-2">
          <span className="w-10 shrink-0 text-xs text-[var(--color-neutral-600)]">
            {bar.label}
          </span>
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-neutral-200)]">
            {animated ? (
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary-500)]"
                initial={{ width: 0 }}
                animate={{ width: `${bar.score}%` }}
                transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
              />
            ) : (
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary-500)]"
                style={{ width: `${bar.score}%` }}
              />
            )}
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-semibold text-[var(--color-neutral-700)]">
            {bar.score}%
          </span>
        </div>
      ))}
    </div>
  );
}
