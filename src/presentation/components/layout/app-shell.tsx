'use client'

import { usePathname } from 'next/navigation'
import { LogoLink } from './logo-link'
import { BottomNav } from './bottom-nav'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname.startsWith('/auth')

  const isHomePage = pathname === '/'

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <>
      {!isHomePage && (
        <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background/95 px-5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <LogoLink />
        </header>
      )}
      <main className="pb-20">{children}</main>
      <BottomNav />
    </>
  )
}
