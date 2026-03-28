// src/domain/services/greeting-generator.ts
// R1: 외부 의존 0

/** GreetingGenerator 입력 컨텍스트 */
export interface GreetingContext {
  currentHour: number
  recentRecords: {
    restaurantName: string
    restaurantId: string
    satisfaction: number
    visitDate: string
    area: string
    scene: string | null
  }[]
  weeklyRecordCount: number
  frequentArea: string | null
}

/** GreetingGenerator 출력 */
export interface GreetingResult {
  message: string
  restaurantId: string | null
}

/**
 * 시간대 + 사용자 기록 기반 인사말 생성
 * Phase 1: 로컬 템플릿 기반
 *
 * 시간대: 아침(6~11) / 점심(11~15) / 저녁(15~21) / 밤(21~6)
 * recentRecords.length === 0 → 기본 환영 메시지
 * recentRecords.length > 0 → 시간대별 템플릿에 데이터 바인딩
 */
export function generateGreeting(context: GreetingContext): GreetingResult {
  const { currentHour, recentRecords, weeklyRecordCount, frequentArea } = context

  // 기록이 없으면 기본 환영 메시지
  if (recentRecords.length === 0) {
    return { message: '오늘도 맛있는 하루 보내세요!', restaurantId: null }
  }

  const latest = recentRecords[0]

  // 아침 (6~11): 최근 기록 리뷰
  if (currentHour >= 6 && currentHour < 11) {
    return {
      message: `어제 ${latest.restaurantName}은 어떠셨어요?`,
      restaurantId: latest.restaurantId,
    }
  }

  // 점심 (11~15): 지역 패턴
  if (currentHour >= 11 && currentHour < 15) {
    if (frequentArea) {
      return {
        message: `이번 주 ${frequentArea} 쪽을 자주 가셨네요 — 오늘은 새로운 데 어때요?`,
        restaurantId: null,
      }
    }
    return {
      message: '점심 메뉴 고민 중이세요? 기록을 참고해보세요.',
      restaurantId: null,
    }
  }

  // 저녁 (15~21): 상황 제안
  if (currentHour >= 15 && currentHour < 21) {
    if (latest.scene && latest.satisfaction >= 70) {
      return {
        message: `${latest.scene}라면 ${latest.restaurantName} 다시 가셔도`,
        restaurantId: latest.restaurantId,
      }
    }
    return {
      message: '맛있는 저녁 되세요',
      restaurantId: null,
    }
  }

  // 밤 (21~6): 기록 요약
  return {
    message: `이번 주 기록 ${weeklyRecordCount}건 — 꾸준히 잘 하고 계세요`,
    restaurantId: null,
  }
}
