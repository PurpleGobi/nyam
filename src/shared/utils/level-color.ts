/**
 * 사용자 레벨(1~10)을 색상으로 변환한다.
 * DESIGN_SYSTEM.md §9 레벨 색상.
 */

interface LevelColorConfig {
  minLevel: number
  maxLevel: number
  color: string
  cssVar: string
  tailwind: string
}

const LEVEL_COLORS: LevelColorConfig[] = [
  { minLevel: 1, maxLevel: 3, color: '#7EAE8B', cssVar: '--positive', tailwind: 'positive' },
  { minLevel: 4, maxLevel: 5, color: '#7A9BAE', cssVar: '--accent-social', tailwind: 'accent-social' },
  { minLevel: 6, maxLevel: 7, color: '#8B7396', cssVar: '--accent-wine', tailwind: 'accent-wine' },
  { minLevel: 8, maxLevel: 9, color: '#C17B5E', cssVar: '--accent-food', tailwind: 'accent-food' },
  { minLevel: 10, maxLevel: 10, color: '#C9A96E', cssVar: '--caution', tailwind: 'caution' },
]

export function getLevelColor(level: number): string {
  const config = LEVEL_COLORS.find((c) => level >= c.minLevel && level <= c.maxLevel)
  return config ? config.color : LEVEL_COLORS[0].color
}

export function getLevelCssVar(level: number): string {
  const config = LEVEL_COLORS.find((c) => level >= c.minLevel && level <= c.maxLevel)
  return config ? config.cssVar : LEVEL_COLORS[0].cssVar
}

export function getLevelTailwindClass(level: number): string {
  const config = LEVEL_COLORS.find((c) => level >= c.minLevel && level <= c.maxLevel)
  return config ? config.tailwind : LEVEL_COLORS[0].tailwind
}
