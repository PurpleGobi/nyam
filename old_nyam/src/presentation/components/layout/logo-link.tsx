import Link from "next/link"
import { ROUTES } from "@/shared/constants/routes"

export function LogoLink() {
  return (
    <Link href={ROUTES.HOME} className="font-[family-name:var(--font-logo)] text-xl text-primary-500">
      nyam
    </Link>
  )
}
