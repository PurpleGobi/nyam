import { LogoLink } from "./logo-link"
import { HeaderActions } from "./header-actions"
import { BottomNav } from "./bottom-nav"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-neutral-50 dark:bg-background">
      <header className="sticky top-0 z-50 bg-white/40 dark:bg-neutral-100/40 backdrop-blur-xl border-b border-white/30 dark:border-neutral-200/30">
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
