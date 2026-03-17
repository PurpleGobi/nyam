export function calculateNyamLevel(points: number): number {
  if (points >= 3600) return 30
  if (points >= 1200) return Math.floor(15 + (points - 1200) * 15 / 2400)
  if (points >= 300) return Math.floor(5 + (points - 300) * 10 / 900)
  return Math.floor(1 + points * 4 / 300)
}

export interface XpBonus {
  reason: string
  points: number
}

export function collectXpBonuses(params: {
  isNewGenre: boolean
  consecutiveDays: number
  photoTypeCount: number
}): XpBonus[] {
  const bonuses: XpBonus[] = []
  if (params.isNewGenre) bonuses.push({ reason: "new_genre", points: 10 })
  if (params.consecutiveDays >= 7) bonuses.push({ reason: "7day_streak", points: 20 })
  if (params.photoTypeCount >= 4) bonuses.push({ reason: "4type_photos", points: 3 })
  return bonuses
}

/**
 * Calculate consecutive recording days from a list of ISO date strings (descending order).
 * Pure function — no external dependencies.
 */
export function calculateConsecutiveDays(dates: string[]): number {
  if (!dates.length) return 0

  const unique = [...new Set(dates.map((d) => d.split("T")[0]))]
    .sort((a, b) => b.localeCompare(a))

  let streak = 1
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1])
    const curr = new Date(unique[i])
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) streak++
    else break
  }
  return streak
}
