export const FLAVOR_TAGS = [
  "매운", "달콤한", "짭짤한", "시큼한", "감칠맛",
  "담백한", "기름진", "고소한", "향긋한", "깔끔한",
] as const

export type FlavorTag = (typeof FLAVOR_TAGS)[number]

export const TEXTURE_TAGS = [
  "바삭한", "부드러운", "쫄깃한", "크리미한", "아삭한", "촉촉한",
] as const

export type TextureTag = (typeof TEXTURE_TAGS)[number]

export const ATMOSPHERE_TAGS = [
  "조용한", "활기찬", "캐주얼", "포멀", "아늑한", "개방적", "감성적", "모던한",
] as const

export type AtmosphereTag = (typeof ATMOSPHERE_TAGS)[number]
