export interface VisitAnalysis {
  id: string
  recordId: string
  rawResponse: unknown
  identifiedRestaurant: IdentifiedRestaurant | null
  extractedMenuItems: ExtractedMenuItem[]
  orderedItems: OrderedItem[]
  receiptData: ReceiptData | null
  companionData: CompanionData | null
  photoClassifications: PhotoClassification[]
  estimatedVisitTime: string | null
  confidenceScore: number
  createdAt: string
}

export interface IdentifiedRestaurant {
  name: string
  matchedPlaceId: string | null
  confidence: number
}

export interface ExtractedMenuItem {
  name: string
  price: number | null
}

export interface OrderedItem {
  name: string
  estimatedPrice: number | null
}

export interface ReceiptData {
  totalCost: number
  perPersonCost: number | null
  itemCount: number | null
}

export interface CompanionData {
  count: number
  occasion: string | null
}

export interface PhotoClassification {
  photoIndex: number
  type: 'signboard' | 'menu' | 'companion' | 'receipt' | 'food' | 'other'
  confidence: number
  description: string | null
}
