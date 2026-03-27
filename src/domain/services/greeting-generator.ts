// src/domain/services/greeting-generator.ts
// R1: 외부 의존 0

/**
 * 시간대 + 닉네임 + 주간 기록 수 기반 인사 메시지 생성
 * 아침(6-11) / 점심(11-14) / 저녁(17-21) / 밤(21-6) / 기본(14-17)
 */
export function generateGreeting(
  hour: number,
  nickname: string,
  weeklyCount: number,
): string {
  let base: string

  if (hour >= 6 && hour < 11) {
    base = `좋은 아침이에요, ${nickname}님`
  } else if (hour >= 11 && hour < 14) {
    base = '오늘 점심은 어디서?'
  } else if (hour >= 17 && hour < 21) {
    base = '맛있는 저녁 되세요'
  } else if (hour >= 21 || hour < 6) {
    base = '오늘도 수고했어요'
  } else {
    base = `${nickname}님, 반가워요`
  }

  if (weeklyCount > 0) {
    base += ` · 이번 주 ${weeklyCount}건 기록`
  }

  return base
}
