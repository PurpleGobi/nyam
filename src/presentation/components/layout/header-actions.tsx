import Link from "next/link"
import { Bell, Search } from "lucide-react"
import { ROUTES } from "@/shared/constants/routes"

export function HeaderActions() {
  return (
    <div className="flex items-center gap-1">
      <Link
        href={ROUTES.DISCOVER}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
      >
        <Search className="h-5 w-5" />
      </Link>
      <Link
        href={ROUTES.NOTIFICATIONS}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
      >
        <Bell className="h-5 w-5" />
      </Link>
    </div>
  )
}
