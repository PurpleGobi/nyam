'use client';

import { usePathname } from 'next/navigation';
import { BottomNav } from './bottom-nav';

export function BottomNavWrapper() {
  const pathname = usePathname();
  return <BottomNav currentPath={pathname} />;
}
