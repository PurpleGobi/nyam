"use client"

import { useCallback, useState } from "react"
import { getRecordRepository } from "@/di/repositories"
import type { CreateRecordInput } from "@/domain/repositories/record-repository"

export function useEditRecord() {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateRecord = useCallback(async (id: string, data: Partial<CreateRecordInput>) => {
    setIsUpdating(true)
    try {
      return await getRecordRepository().update(id, data)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  const deleteRecord = useCallback(async (id: string) => {
    setIsUpdating(true)
    try {
      await getRecordRepository().delete(id)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateRecord, deleteRecord, isUpdating }
}
