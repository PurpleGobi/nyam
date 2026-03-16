export interface FoodCategory {
  value: string
  label: string
  emoji: string
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  { value: "korean", label: "한식", emoji: "🍚" },
  { value: "japanese", label: "일식", emoji: "🍣" },
  { value: "chinese", label: "중식", emoji: "🥟" },
  { value: "western", label: "양식", emoji: "🍝" },
  { value: "cafe", label: "카페", emoji: "☕" },
  { value: "dessert", label: "디저트", emoji: "🍰" },
  { value: "wine", label: "와인", emoji: "🍷" },
  { value: "homecook", label: "홈쿡", emoji: "🍳" },
  { value: "seafood", label: "해산물", emoji: "🦐" },
  { value: "meat", label: "고기", emoji: "🥩" },
  { value: "vegan", label: "비건", emoji: "🥗" },
  { value: "street", label: "분식", emoji: "🍢" },
] as const

export const SITUATIONS = [
  "혼밥",
  "데이트",
  "비즈니스",
  "가족",
  "친구모임",
  "술자리",
  "브런치",
  "간단점심",
] as const

export type Situation = (typeof SITUATIONS)[number]

export const FLAVOR_TAGS = [
  "매운",
  "달콤한",
  "짭짤한",
  "시큼한",
  "감칠맛",
  "담백한",
  "기름진",
  "고소한",
  "향긋한",
  "깔끔한",
] as const

export type FlavorTag = (typeof FLAVOR_TAGS)[number]

export const TEXTURE_TAGS = [
  "바삭한",
  "부드러운",
  "쫄깃한",
  "크리미한",
  "아삭한",
  "촉촉한",
] as const

export type TextureTag = (typeof TEXTURE_TAGS)[number]

export const ATMOSPHERE_TAGS = [
  "조용한",
  "활기찬",
  "캐주얼",
  "포멀",
  "아늑한",
  "개방적",
  "감성적",
  "모던한",
] as const

export type AtmosphereTag = (typeof ATMOSPHERE_TAGS)[number]
