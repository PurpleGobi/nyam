'use client'

import { useState, useCallback } from 'react'
import { bookmarkRepo, restaurantRepo } from '@/shared/di/container'

export interface NaverPlace {
  name: string
  address: string
  lng: number
  lat: number
  naverPlaceId: string
  category: string
}

export type ImportStatus = 'idle' | 'fetching' | 'previewing' | 'importing' | 'done' | 'error'

export interface ImportResult {
  total: number
  created: number
  existing: number
  bookmarked: number
  failed: number
}

/** 네이버 지도 공유 URL에서 shareId 추출 */
function extractShareId(input: string): string | null {
  const trimmed = input.trim()

  // naver.me 단축 URL → 리다이렉트 후의 shareId를 서버에서 처리
  // 직접 shareId만 입력한 경우
  if (/^[a-f0-9]{32}$/.test(trimmed)) return trimmed

  // full URL: .../folder/{shareId} or .../sharedPlace/folder/{shareId}
  const match = trimmed.match(/folder\/([a-f0-9]{32})/)
  if (match) return match[1]

  return null
}

export function useNaverImport(userId: string | null) {
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [folderName, setFolderName] = useState('')
  const [places, setPlaces] = useState<NaverPlace[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const fetchPlaces = useCallback(async (urlOrId: string) => {
    const trimmed = urlOrId.trim()
    if (!trimmed) {
      setErrorMessage('링크를 입력해주세요')
      setStatus('error')
      return
    }

    setStatus('fetching')
    setErrorMessage('')

    // shareId를 클라이언트에서 추출 가능하면 shareId로, 아니면 url로 전달
    const shareId = extractShareId(trimmed)
    const payload = shareId ? { shareId } : { url: trimmed }

    try {
      const res = await fetch('/api/import/naver-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'UNKNOWN' }))
        setErrorMessage(
          err.error === 'INVALID_SHARE_LINK'
            ? '공유 링크가 만료되었거나 비공개 폴더입니다'
            : '네이버 지도에서 데이터를 가져올 수 없습니다',
        )
        setStatus('error')
        return
      }

      const data = await res.json()
      setFolderName(data.folderName)
      setPlaces(data.places)
      setStatus('previewing')
    } catch {
      setErrorMessage('네트워크 오류가 발생했습니다')
      setStatus('error')
    }
  }, [])

  const importPlaces = useCallback(async () => {
    if (!userId || places.length === 0) return

    setStatus('importing')
    const importResult: ImportResult = { total: places.length, created: 0, existing: 0, bookmarked: 0, failed: 0 }

    for (const place of places) {
      try {
        // 1) 식당 등록 또는 기존 매칭 (API route 사용)
        const res = await fetch('/api/restaurants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: place.name,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
            externalIds: { naver: place.naverPlaceId },
          }),
        })

        if (!res.ok) {
          importResult.failed++
          continue
        }

        const restaurant = await res.json()
        if (restaurant.isExisting) {
          importResult.existing++
        } else {
          importResult.created++
        }

        // 2) 찜 등록 (이미 찜한 경우 스킵)
        const alreadyBookmarked = await bookmarkRepo.isBookmarked(userId, restaurant.id, 'restaurant')
        if (!alreadyBookmarked) {
          await bookmarkRepo.toggle(userId, restaurant.id, 'restaurant', 'bookmark')
          importResult.bookmarked++
        }
      } catch {
        importResult.failed++
      }
    }

    setResult(importResult)
    setStatus('done')
  }, [userId, places])

  const reset = useCallback(() => {
    setStatus('idle')
    setFolderName('')
    setPlaces([])
    setResult(null)
    setErrorMessage('')
  }, [])

  return {
    status,
    folderName,
    places,
    result,
    errorMessage,
    fetchPlaces,
    importPlaces,
    reset,
  }
}
