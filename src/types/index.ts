export interface FilterState {
  areas: string[]
  partySize: string
  cuisines: string[]
  occasions: string[]
  priceRange: string[]
  moods: string[]
  options: {
    parking: boolean
    reservation: boolean
    noWaiting: boolean
  }
}

export interface Restaurant {
  id: string
  name: string
  address: string
  shortAddress: string
  phone: string
  cuisine: string
  priceRange: string
  hours: string
  rating: {
    naver: number | null
    kakao: number | null
    google: number | null
    average: number
  }
  representativeMenus: { name: string; price: number }[]
  menu: { name: string; price: number; description?: string }[]
  mood: string[]
  region: string
  verificationStatus: "verified" | "unverified" | "closed"
  verifiedAt: string | null
  recentReviews: {
    source: string
    author: string
    content: string
    date: string
    rating: number
  }[]
  naverMapUrl: string
  kakaoMapUrl: string
  imageUrl: string
}

export interface RecommendationHistory {
  id: string
  filters: FilterState
  results: Restaurant[]
  createdAt: string
  favorites: string[]
  visited: string[]
}
