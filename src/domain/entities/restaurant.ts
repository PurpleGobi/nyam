export interface RestaurantLocation {
  lat: number
  lng: number
}

export interface MenuItem {
  name: string
  price: number | null
  description: string | null
}

export interface Restaurant {
  id: string
  name: string
  address: string
  region: string
  category: string
  location: RestaurantLocation
  phone: string | null
  hours: Record<string, string>
  source: string
  externalId: string | null
  externalUrl: string | null
  menuItems: MenuItem[]
  syncedAt: string
}
