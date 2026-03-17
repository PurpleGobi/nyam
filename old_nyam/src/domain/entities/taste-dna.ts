export interface TasteDna {
  userId: string

  flavorSpicy: number
  flavorSweet: number
  flavorSalty: number
  flavorSour: number
  flavorUmami: number
  flavorRich: number

  textureCrispy: number
  textureTender: number
  textureChewy: number

  atmosphereNoise: number
  atmosphereFormality: number
  atmosphereSpace: number

  priceSensitivity: number
  priceAvg: number
  priceRange: [number, number]

  categoryPreferences: Record<string, number>

  peakDay: string
  peakHour: number

  adventurousness: number

  tasteTypeCode: string
  tasteTypeName: string

  sampleCount: number
}

export interface TasteDnaWine {
  userId: string

  prefBody: number
  prefAcidity: number
  prefTannin: number
  prefSweetness: number

  aromaFruit: number
  aromaFloral: number
  aromaSpice: number
  aromaOak: number
  aromaMineral: number
  aromaHerbal: number

  preferredVarieties: string[]
  preferredOrigins: string[]

  priceRange: [number, number]

  sampleCount: number
}

export interface TasteDnaCooking {
  userId: string

  prefDifficulty: number
  prefTimeInvestment: number

  methodPreferences: Record<string, number>
  preferredCuisines: string[]

  sampleCount: number
}
