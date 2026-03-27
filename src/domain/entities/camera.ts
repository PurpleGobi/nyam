// src/domain/entities/camera.ts
// R1: React, Supabase, Next.js import 금지

import type { CameraMode } from '@/domain/entities/record'

// ─── OCR 데이터 구조 (DATA_MODEL.md records.ocr_data) ───

export interface IndividualOcrData {
  wine_name: string
  vintage: string | null
  producer: string | null
}

export interface ShelfOcrData {
  wines: Array<{ name: string; price: number | null }>
}

export interface ReceiptOcrData {
  items: Array<{ name: string; price: number | null; qty: number }>
  total: number | null
}

export type OcrData = IndividualOcrData | ShelfOcrData | ReceiptOcrData

// ─── AI 인식 결과 ───

export interface RestaurantAIResult {
  targetType: 'restaurant'
  detectedGenre: string | null
  detectedName: string | null
  candidates: RestaurantCandidate[]
  isConfidentMatch: boolean
}

export interface RestaurantCandidate {
  restaurantId: string
  name: string
  genre: string | null
  area: string | null
  distance: number | null
  matchScore: number
}

export interface WineAIResult {
  targetType: 'wine'
  ocrData: IndividualOcrData
  candidates: WineCandidate[]
  isConfidentMatch: boolean
  cameraMode: CameraMode
}

export interface WineCandidate {
  wineId: string
  name: string
  producer: string | null
  vintage: number | null
  wineType: string
  region: string | null
  country: string | null
  matchScore: number
}

export type AIRecognitionResult = RestaurantAIResult | WineAIResult

// ─── API 요청/응답 ───

export interface IdentifyRequest {
  imageBase64: string
  targetType: 'restaurant' | 'wine'
  cameraMode?: CameraMode
  latitude?: number
  longitude?: number
  capturedAt?: string
}

export interface IdentifyResponse {
  success: boolean
  result: AIRecognitionResult | null
  error?: string
}
