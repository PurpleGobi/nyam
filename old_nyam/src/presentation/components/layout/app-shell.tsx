'use client'

import { usePathname } from 'next/navigation'
import { LogoLink } from './logo-link'
import { BottomNav } from './bottom-nav'
import { HeaderActions } from './header-actions'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname.startsWith('/auth')

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-5">
          <LogoLink />
          <HeaderActions />
        </div>
      </header>
      <main className="mx-auto max-w-lg pb-20">{children}</main>
      <BottomNav />
    </>
  )
}
