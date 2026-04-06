'use client'

import { useCallback } from 'react'
import { uploadBubbleIcon } from '@/shared/di/container'

interface UseBubbleIconUploadReturn {
  upload: (file: File, userId: string) => Promise<string>
}

/**
 * 버블 아이콘 업로드 hook
 * shared/di의 uploadBubbleIcon을 래핑
 */
export function useBubbleIconUpload(): UseBubbleIconUploadReturn {
  const upload = useCallback(async (file: File, userId: string): Promise<string> => {
    return uploadBubbleIcon(file, userId)
  }, [])

  return { upload }
}
