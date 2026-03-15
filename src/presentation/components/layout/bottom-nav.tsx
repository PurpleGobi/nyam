'use client';

import Link from 'next/link';
import { Home, Search, Sparkles, Trophy, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ROUTES } from '@/shared/constants/routes';
import { cn } from '@/shared/utils/cn';

export interface BottomNavProps {
  /** Current route path to determine active tab */
  currentPath: string;
}

interface NavTab {
  path: string;
  label: string;
  icon: LucideIcon;
}

const tabs: NavTab[] = [
  { path: ROUTES.HOME, label: '홈', icon: Home },
  { path: ROUTES.EXPLORE, label: '탐색', icon: Search },
  { path: ROUTES.PROMPTS, label: '프롬프트', icon: Sparkles },
  { path: ROUTES.ACTIVITY, label: '활동', icon: Trophy },
  { path: ROUTES.PROFILE, label: '프로필', icon: User },
];

/**
 * 5-tab bottom navigation bar.
 * Active tab shows primary-500 filled icons; inactive shows neutral-400 outline icons.
 * Height: 56px + safe area inset.
 */
export function BottomNav({ currentPath }: BottomNavProps) {
  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50',
        'bg-[var(--color-neutral-0)]',
        'shadow-[0_-4px_12px_rgba(16,42,67,0.08)]',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="flex h-14 items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentPath === tab.path
            || (tab.path !== '/' && currentPath.startsWith(tab.path));
          const IconComponent = tab.icon;

          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1',
                'min-w-[44px] min-h-[44px] px-2',
                'transition-colors duration-150',
                isActive
                  ? 'text-[var(--color-primary-500)]'
                  : 'text-[var(--color-neutral-400)]',
              )}
            >
              <IconComponent
                size={24}
                strokeWidth={1.5}
                fill={isActive ? 'currentColor' : 'none'}
              />
              <span className="text-[10px] font-medium leading-none tracking-[0.08em]">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
