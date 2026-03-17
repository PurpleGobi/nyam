"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Search, Plus, Users, User } from "lucide-react"
import { ROUTES } from "@/shared/constants/routes"
import { cn } from "@/shared/utils/cn"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isFab?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: ROUTES.HOME, label: "홈", icon: Home },
  { href: ROUTES.DISCOVER, label: "발견", icon: Search },
  { href: ROUTES.RECORD, label: "기록", icon: Plus, isFab: true },
  { href: ROUTES.GROUPS, label: "버블", icon: Users },
  { href: ROUTES.PROFILE, label: "프로필", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-[var(--color-neutral-200)] bg-white pb-[env(safe-area-inset-bottom)] shadow-lg">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          if (item.isFab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6038] shadow-lg transition-transform active:scale-95"
              >
                <Icon className="h-6 w-6 text-white" />
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors",
                isActive
                  ? "text-[#FF6038]"
                  : "text-[var(--color-neutral-400)]"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
