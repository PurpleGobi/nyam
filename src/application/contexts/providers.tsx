'use client'

import type { ReactNode } from 'react'
import { FilterProvider } from './filter-context'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <FilterProvider>
      {children}
    </FilterProvider>
  )
}
