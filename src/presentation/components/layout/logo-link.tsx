'use client'

import Link from 'next/link'
import { useFilterContext } from '@/application/contexts/filter-context'

export function LogoLink() {
  const { resetFilters } = useFilterContext()

  return (
    <Link href="/" onClick={() => resetFilters()}>
      <h1
        className="text-2xl tracking-tight text-orange-500"
        style={{ fontFamily: 'var(--font-logo)' }}
      >
        nyam
      </h1>
    </Link>
  )
}
