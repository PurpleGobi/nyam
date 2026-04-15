// src/domain/services/exif-validator.ts
// R1: 외부 의존 0

import { haversineDistanceMeters } from './distance'

export interface ExifValidationResult {
  hasGps: boolean
  isWithinRadius: boolean
  daysSinceCaptured: number | null
  isOldPhoto: boolean
  warningMessage: string | null
}

/**
 * EXIF GPS 검증
 * @param photoGps 사진 EXIF GPS
 * @param targetLat 식당 위도
 * @param targetLng 식당 경도
 * @param capturedAt EXIF 촬영 시각 (ISO string)
 * @param radiusMeters 허용 반경 (기본 200m)
 */
export function validateExifGps(
  photoGps: { latitude: number; longitude: number } | null,
  targetLat: number | null,
  targetLng: number | null,
  capturedAt: string | null,
  radiusMeters: number = 200,
): ExifValidationResult {
  if (!photoGps) {
    return {
      hasGps: false,
      isWithinRadius: false,
      daysSinceCaptured: null,
      isOldPhoto: false,
      warningMessage: null,
    }
  }

  const isWithinRadius =
    targetLat !== null && targetLng !== null
      ? haversineDistanceMeters(photoGps.latitude, photoGps.longitude, targetLat, targetLng) <= radiusMeters
      : false

  let daysSinceCaptured: number | null = null
  let isOldPhoto = false
  let warningMessage: string | null = null

  if (capturedAt) {
    const capturedDate = new Date(capturedAt)
    const now = new Date()
    daysSinceCaptured = Math.floor((now.getTime() - capturedDate.getTime()) / (1000 * 60 * 60 * 24))
    isOldPhoto = daysSinceCaptured >= 30

    if (daysSinceCaptured >= 30) {
      const months = Math.floor(daysSinceCaptured / 30)
      warningMessage = `${months}개월 전 사진이네요`
    } else if (daysSinceCaptured >= 7) {
      warningMessage = `${daysSinceCaptured}일 전 사진이네요`
    }
  }

  return {
    hasGps: true,
    isWithinRadius,
    daysSinceCaptured,
    isOldPhoto,
    warningMessage,
  }
}
