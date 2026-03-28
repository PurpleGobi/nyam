'use client'

import { SearchDropdown as SearchDropdownBase } from '@/presentation/components/ui/search-dropdown'

interface HomeSearchDropdownProps {
  query: string
  onQueryChange: (query: string) => void
  onClear: () => void
  placeholder?: string
}

export function SearchDropdown({ query, onQueryChange, onClear, placeholder = '식당·와인 이름으로 검색' }: HomeSearchDropdownProps) {
  return (
    <SearchDropdownBase
      query={query}
      onQueryChange={onQueryChange}
      onClear={onClear}
      placeholder={placeholder}
    />
  )
}
