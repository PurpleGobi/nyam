'use client'

import { useState, useCallback } from 'react'
import type {
  IdentifyRequest,
  IdentifyResponse,
  AIRecognitionResult,
} from '@/domain/entities/camera'
import type { CameraMode } from '@/domain/entities/record'

interface UseCameraCaptureReturn {
  isRecognizing: boolean
  result: AIRecognitionResult | null
  error: string | null
  capturedImage: string | null
  identify: (params: {
    imageBase64: string
    targetType: 'restaurant' | 'wine'
    cameraMode?: CameraMode
    latitude?: number
    longitude?: number
    capturedAt?: string
  }) => Promise<AIRecognitionResult | null>
  reset: () => void
}

export function useCameraCapture(): UseCameraCaptureReturn {
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [result, setResult] = useState<AIRecognitionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const identify = useCallback(
    async (params: {
      imageBase64: string
      targetType: 'restaurant' | 'wine'
      cameraMode?: CameraMode
      latitude?: number
      longitude?: number
      capturedAt?: string
    }): Promise<AIRecognitionResult | null> => {
      setIsRecognizing(true)
      setError(null)
      setCapturedImage(params.imageBase64)

      try {
        const body: IdentifyRequest = {
          imageBase64: params.imageBase64,
          targetType: params.targetType,
          cameraMode: params.cameraMode,
          latitude: params.latitude,
          longitude: params.longitude,
          capturedAt: params.capturedAt,
        }

        const response = await fetch('/api/records/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        const data: IdentifyResponse = await response.json()

        if (!data.success || !data.result) {
          const errorMap: Record<string, string> = {
            NOT_FOOD: '음식 사진을 선택해주세요',
            NOT_WINE_LABEL: '와인 라벨을 찾지 못했어요',
            UNAUTHORIZED: '로그인이 필요합니다',
          }
          setError(errorMap[data.error ?? ''] ?? '인식에 실패했습니다. 다시 시도해주세요.')
          return null
        }

        setResult(data.result)
        return data.result
      } catch {
        setError('네트워크 오류가 발생했습니다')
        return null
      } finally {
        setIsRecognizing(false)
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setCapturedImage(null)
    setIsRecognizing(false)
  }, [])

  return { isRecognizing, result, error, capturedImage, identify, reset }
}
