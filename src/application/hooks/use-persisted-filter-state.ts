'use client'

import { useCallback, useEffect, useRef } from 'react'
import { filterStateRepo } from '@/shared/di/container'
import type { HomeTab } from '@/domain/entities/home-state'
import type { FilterChipItem } from '@/domain/entities/condition-chip'
import type { HomeFilterState, TabFilterState } from '@/domain/entities/home-filter-state'

const STORAGE_KEY_PREFIX = 'nyam_filter_state_'

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`
}

function readLocalStorage(userId: string): HomeFilterState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (!raw) return {}
    return JSON.parse(raw) as HomeFilterState
  } catch {
    return {}
  }
}

function writeLocalStorage(userId: string, state: HomeFilterState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state))
  } catch {
    // localStorage full — 무시
  }
}

function pickNewer(local: TabFilterState | undefined, remote: TabFilterState | undefined): TabFilterState | undefined {
  if (!local && !remote) return undefined
  if (!local) return remote
  if (!remote) return local
  return local.updatedAt >= remote.updatedAt ? local : remote
}

const DEBOUNCE_MS = 1500

export function usePersistedFilterState(userId: string | null) {
  const pendingRef = useRef<HomeFilterState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userIdRef = useRef(userId)

  useEffect(() => {
    userIdRef.current = userId
  }, [userId])

  // Supabase에 즉시 저장
  const flushToRemote = useCallback(async () => {
    const uid = userIdRef.current
    if (!uid) return
    const pending = pendingRef.current
    if (!pending) return

    pendingRef.current = null
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    try {
      await filterStateRepo.save(uid, pending)
    } catch {
      // 네트워크 실패 — localStorage에는 이미 저장됨
    }
  }, [])

  // debounce Supabase 저장
  const scheduleRemoteSave = useCallback((state: HomeFilterState) => {
    pendingRef.current = state
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      void flushToRemote()
    }, DEBOUNCE_MS)
  }, [flushToRemote])

  // 탭별 칩 로드 (localStorage + Supabase 비교 → 최신 반환)
  const loadState = useCallback(async (tab: HomeTab): Promise<FilterChipItem[]> => {
    if (!userId) return []

    const localState = readLocalStorage(userId)
    let remoteState: HomeFilterState = {}
    try {
      remoteState = await filterStateRepo.load(userId)
    } catch {
      // 네트워크 실패 → localStorage 우선
    }

    const localTab = localState[tab]
    const remoteTab = remoteState[tab]
    const winner = pickNewer(localTab, remoteTab)

    if (!winner) return []

    // 승자가 remote이면 localStorage 동기화
    if (winner === remoteTab && remoteTab) {
      const merged: HomeFilterState = { ...localState, [tab]: remoteTab }
      writeLocalStorage(userId, merged)
    }

    return winner.chips
  }, [userId])

  // 탭별 칩 저장 (localStorage 즉시 + debounce Supabase)
  const saveState = useCallback((tab: HomeTab, chips: FilterChipItem[]) => {
    if (!userId) return

    const now = new Date().toISOString()
    const tabState: TabFilterState = { chips, updatedAt: now }
    const localState = readLocalStorage(userId)
    const merged: HomeFilterState = { ...localState, [tab]: tabState }
    writeLocalStorage(userId, merged)
    scheduleRemoteSave(merged)
  }, [userId, scheduleRemoteSave])

  // flush 함수 (외부에서 직접 호출 가능)
  const flush = useCallback(() => {
    void flushToRemote()
  }, [flushToRemote])

  // visibilitychange='hidden' 시 flush
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushToRemote()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [flushToRemote])

  // 언마운트 시 flush
  useEffect(() => {
    return () => {
      if (pendingRef.current) {
        void flushToRemote()
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [flushToRemote])

  return { loadState, saveState, flush }
}
