// src/domain/entities/scene.ts
// R1: 외부 의존 0

/** 식당 상황 태그 6종 — RATING_ENGINE.md §7 */
export type RestaurantScene = 'solo' | 'romantic' | 'friends' | 'family' | 'business' | 'drinks'

/** 와인 상황 태그 7종 — RATING_ENGINE.md §7 */
export type WineScene = 'solo' | 'romantic' | 'gathering' | 'pairing' | 'gift' | 'tasting' | 'decanting'

export interface SceneTagMeta<T extends string = string> {
  value: T
  label: string
  colorVar: string
  hex: string
}

export const SCENE_TAGS: readonly SceneTagMeta<RestaurantScene>[] = [
  { value: 'solo', label: '혼밥', colorVar: '--scene-solo', hex: '#7A9BAE' },
  { value: 'romantic', label: '데이트', colorVar: '--scene-romantic', hex: '#B8879B' },
  { value: 'friends', label: '친구', colorVar: '--scene-friends', hex: '#7EAE8B' },
  { value: 'family', label: '가족', colorVar: '--scene-family', hex: '#C9A96E' },
  { value: 'business', label: '회식', colorVar: '--scene-business', hex: '#8B7396' },
  { value: 'drinks', label: '술자리', colorVar: '--scene-drinks', hex: '#B87272' },
] as const

export const WINE_SCENES: readonly SceneTagMeta<WineScene>[] = [
  { value: 'solo', label: '혼술', colorVar: '--scene-solo', hex: '#7A9BAE' },
  { value: 'romantic', label: '데이트', colorVar: '--scene-romantic', hex: '#B8879B' },
  { value: 'gathering', label: '모임', colorVar: '--scene-friends', hex: '#7EAE8B' },
  { value: 'pairing', label: '페어링', colorVar: '--scene-family', hex: '#C9A96E' },
  { value: 'gift', label: '선물', colorVar: '--scene-business', hex: '#8B7396' },
  { value: 'tasting', label: '테이스팅', colorVar: '--scene-drinks', hex: '#B87272' },
  { value: 'decanting', label: '디캔팅', colorVar: '--scene-solo', hex: '#7A9BAE' },
] as const
