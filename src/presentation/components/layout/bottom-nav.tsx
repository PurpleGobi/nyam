"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Compass, Plus, Users, User } from "lucide-react"
import { cn } from "@/shared/utils/cn"
import { ROUTES } from "@/shared/constants/routes"

const NAV_ITEMS = [
  { href: ROUTES.HOME, icon: Home, label: "홈", isFab: false },
  { href: ROUTES.DISCOVER, icon: Compass, label: "발견", isFab: false },
  { href: ROUTES.RECORD, icon: Plus, label: "기록", isFab: true },
  { href: ROUTES.GROUPS, icon: Users, label: "버블", isFab: false },
  { href: ROUTES.PROFILE, icon: User, label: "프로필", isFab: false },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-100 bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          if (item.isFab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg active:scale-95 transition-transform"
              >
                <item.icon className="h-6 w-6" />
              </Link>
            )
          }

          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1",
                isActive ? "text-primary-500" : "text-neutral-400",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
