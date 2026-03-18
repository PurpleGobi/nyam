export interface Restaurant {
  id: string
  name: string
  address: string | null
  region: string | null
  genre: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  hours: Record<string, unknown> | null
  source: string | null
  externalId: string | null
  externalUrl: string | null
  menuItems: Record<string, unknown> | null
  syncedAt: string | null
  isClosed: boolean
  closedAt: string | null
  createdAt: string
}

export interface RestaurantStats {
  restaurantId: string
  recordCount: number
  uniqueUsers: number
  avgTaste: number | null
  avgValue: number | null
  avgService: number | null
  avgAtmosphere: number | null
  avgCleanliness: number | null
  avgPortion: number | null
  avgOverall: number | null
  latestRecordAt: string | null
  updatedAt: string
}
