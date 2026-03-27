// src/domain/entities/scene.ts
// R1: 외부 의존 0

/** 식당 상황 태그 6종 — RATING_ENGINE.md §7 */
export type SceneTag = 'solo' | 'romantic' | 'friends' | 'family' | 'business' | 'drinks'

export interface SceneTagMeta {
  value: SceneTag
  label: string
  colorVar: string
  hex: string
}

export const SCENE_TAGS: readonly SceneTagMeta[] = [
  { value: 'solo', label: '혼밥', colorVar: '--scene-solo', hex: '#7A9BAE' },
  { value: 'romantic', label: '데이트', colorVar: '--scene-romantic', hex: '#B8879B' },
  { value: 'friends', label: '친구', colorVar: '--scene-friends', hex: '#7EAE8B' },
  { value: 'family', label: '가족', colorVar: '--scene-family', hex: '#C9A96E' },
  { value: 'business', label: '비즈니스', colorVar: '--scene-business', hex: '#8B7396' },
  { value: 'drinks', label: '술자리', colorVar: '--scene-drinks', hex: '#B87272' },
] as const
