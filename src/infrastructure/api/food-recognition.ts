export interface FoodRecognitionResult {
  available: boolean
  menuName?: string
  category?: string
  recordType?: 'restaurant' | 'wine' | 'cooking'
  flavorTags?: string[]
  textureTags?: string[]
  confidence?: number
}

export async function recognizeFood(
  imageBase64: string,
): Promise<FoodRecognitionResult> {
  const res = await fetch('/api/recognize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  })

  if (!res.ok) return { available: false }

  const data: FoodRecognitionResult = await res.json()
  return data
}
