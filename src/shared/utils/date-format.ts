// src/shared/utils/date-format.ts

/** 브라우저의 시스템 타임존을 감지 (IANA 형식) */
export function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'Asia/Seoul'
  }
}

/** 대표 타임존 목록 (IANA identifier + 표시 라벨) */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Pacific/Honolulu', label: 'HST (하와이)' },
  { value: 'America/Anchorage', label: 'AKST (알래스카)' },
  { value: 'America/Los_Angeles', label: 'PST (LA)' },
  { value: 'America/Denver', label: 'MST (덴버)' },
  { value: 'America/Chicago', label: 'CST (시카고)' },
  { value: 'America/New_York', label: 'EST (뉴욕)' },
  { value: 'America/Sao_Paulo', label: 'BRT (상파울루)' },
  { value: 'Europe/London', label: 'GMT (런던)' },
  { value: 'Europe/Paris', label: 'CET (파리)' },
  { value: 'Europe/Berlin', label: 'CET (베를린)' },
  { value: 'Europe/Moscow', label: 'MSK (모스크바)' },
  { value: 'Asia/Dubai', label: 'GST (두바이)' },
  { value: 'Asia/Kolkata', label: 'IST (인도)' },
  { value: 'Asia/Bangkok', label: 'ICT (방콕)' },
  { value: 'Asia/Singapore', label: 'SGT (싱가포르)' },
  { value: 'Asia/Shanghai', label: 'CST (중국)' },
  { value: 'Asia/Seoul', label: 'KST (한국)' },
  { value: 'Asia/Tokyo', label: 'JST (일본)' },
  { value: 'Australia/Sydney', label: 'AEST (시드니)' },
  { value: 'Pacific/Auckland', label: 'NZST (뉴질랜드)' },
]

/** 주어진 타임존 기준으로 ISO 문자열을 날짜(YYYY-MM-DD)로 변환 */
export function formatDateInTz(isoString: string, timezone: string): string {
  const date = new Date(isoString)
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const y = parts.find((p) => p.type === 'year')?.value ?? ''
  const m = parts.find((p) => p.type === 'month')?.value ?? ''
  const d = parts.find((p) => p.type === 'day')?.value ?? ''
  return `${y}-${m}-${d}`
}

/** 주어진 타임존 기준으로 ISO 문자열을 시간 포함 문자열로 변환 (YYYY-MM-DD HH:mm) */
export function formatDateTimeInTz(isoString: string, timezone: string): string {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/** 주어진 타임존 기준으로 "오늘" 날짜를 YYYY-MM-DD로 반환 */
export function todayInTz(timezone: string): string {
  return formatDateInTz(new Date().toISOString(), timezone)
}

/** 상대 시간 표시 (방금, N분 전, N시간 전, N일 전, N주 전, N개월 전, N년 전) */
export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return '방금'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  if (days < 365) return `${Math.floor(days / 30)}개월 전`
  return `${Math.floor(days / 365)}년 전`
}

/** 상대 날짜 표시 (오늘, 어제, N일 전, N주 전, N개월 전, N년 전) */
export function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  if (days < 365) return `${Math.floor(days / 30)}개월 전`
  return `${Math.floor(days / 365)}년 전`
}
