'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'
import { recordRepo } from '@/shared/di/container'

export function useRecordDetail(recordId: string) {
  const [record, setRecord] = useState<DiningRecord | null>(null)
  const [photos, setPhotos] = useState<RecordPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function fetch() {
      setIsLoading(true)
      try {
        const [r, p] = await Promise.all([
          recordRepo.findById(recordId),
          recordRepo.findPhotosByRecordId(recordId),
        ])
        setRecord(r)
        setPhotos(p)
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [recordId])

  const deleteRecord = useCallback(async () => {
    setIsDeleting(true)
    try {
      await recordRepo.delete(recordId)
      return true
    } catch {
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [recordId])

  return { record, photos, isLoading, isDeleting, deleteRecord }
}
