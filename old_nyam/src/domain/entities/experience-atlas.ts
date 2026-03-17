export interface AtlasScores {
  volumeScore: number
  diversityScore: number
  recencyScore: number
  consistencyScore: number
}

export interface AtlasProgression {
  level: number
  xp: number
  xpToNext: number
}

export interface ExperienceAtlasRegion {
  userId: string
  region: string
  recordCount: number
  uniqueRestaurants: number
  subRegionCount: number
  level: number
  xp: number
  xpToNext: number
  volumeScore: number
  diversityScore: number
  recencyScore: number
  consistencyScore: number
  firstRecordAt: string
  lastRecordAt: string
}

export interface ExperienceAtlasGenre {
  userId: string
  category: string
  recordCount: number
  subCategoryCount: number
  subCategories: string[]
  avgRating: number
  percentage: number
  level: number
  xp: number
  xpToNext: number
  volumeScore: number
  diversityScore: number
  recencyScore: number
  consistencyScore: number
  firstRecordAt: string
  lastRecordAt: string
}

export interface ExperienceAtlasScene {
  userId: string
  scene: string
  recordCount: number
  uniqueRestaurants: number
  categoryDiversity: number
  level: number
  xp: number
  xpToNext: number
  volumeScore: number
  diversityScore: number
  recencyScore: number
  consistencyScore: number
  firstRecordAt: string
  lastRecordAt: string
}
