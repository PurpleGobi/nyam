/**
 * Format a number with locale-aware separators.
 * Numbers >= 10,000 are abbreviated with "만" suffix.
 *
 * @example formatNumber(1000)  // "1,000"
 * @example formatNumber(12500) // "1.2만"
 * @example formatNumber(50000) // "5만"
 */
export function formatNumber(n: number): string {
  if (n >= 10000) {
    const man = n / 10000;
    const rounded = Math.round(man * 10) / 10;
    const formatted = rounded % 1 === 0
      ? rounded.toFixed(0)
      : rounded.toFixed(1);
    return `${formatted}만`;
  }
  return n.toLocaleString("ko-KR");
}

/**
 * Format a date as a Korean relative time string.
 *
 * @example formatRelativeTime(new Date()) // "방금 전"
 * @example formatRelativeTime("2026-03-12T00:00:00Z") // "3일 전"
 */
export function formatRelativeTime(date: Date | string): string {
  const target = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return "방금 전";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}일 전`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths}개월 전`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears}년 전`;
}

/**
 * Format a number as a percentage string.
 *
 * @example formatPercentage(92)   // "92%"
 * @example formatPercentage(85.5) // "85.5%"
 */
export function formatPercentage(value: number): string {
  return `${value}%`;
}
