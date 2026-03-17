import { LogoLink } from "./logo-link"
import { HeaderActions } from "./header-actions"
import { BottomNav } from "./bottom-nav"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-neutral-50">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-100">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-5">
          <LogoLink />
          <HeaderActions />
        </div>
      </header>

      <main className="mx-auto max-w-lg pb-20">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
