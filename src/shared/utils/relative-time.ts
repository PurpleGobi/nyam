/**
 * Converts an ISO date string to a Korean relative time expression.
 * e.g., "방금", "5분 전", "3시간 전", "2일 전", "2026. 3. 10."
 */
export function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMin = Math.floor((now - then) / 60000)

  if (diffMin < 1) return '방금'
  if (diffMin < 60) return `${diffMin}분 전`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}일 전`

  return new Date(dateStr).toLocaleDateString('ko-KR')
}
