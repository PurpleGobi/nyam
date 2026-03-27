'use client'

import { useState, useCallback } from 'react'
import type { HomeTab, ViewMode } from '@/domain/entities/home-state'
import { VIEW_MODE_CYCLE } from '@/domain/entities/home-state'

export function useHomeState() {
  const [activeTab, setActiveTab] = useState<HomeTab>('restaurant')
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const [activeChipId, setActiveChipId] = useState<string | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)

  const cycleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const idx = VIEW_MODE_CYCLE.indexOf(prev)
      return VIEW_MODE_CYCLE[(idx + 1) % VIEW_MODE_CYCLE.length]
    })
  }, [])

  const toggleFilter = useCallback(() => {
    setIsFilterOpen((prev) => !prev)
    setIsSortOpen(false)
  }, [])

  const toggleSort = useCallback(() => {
    setIsSortOpen((prev) => !prev)
    setIsFilterOpen(false)
  }, [])

  return {
    activeTab, setActiveTab, viewMode, cycleViewMode,
    activeChipId, setActiveChipId,
    isFilterOpen, toggleFilter, isSortOpen, toggleSort,
  }
}
