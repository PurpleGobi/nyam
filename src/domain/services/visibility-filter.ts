// src/domain/services/visibility-filter.ts
// R1: 외부 의존 0

import type { VisibilityConfig } from '@/domain/entities/user'

/**
 * 타인의 기록을 뷰어에게 보여줄 때 비공개 필드를 제거한다.
 * - companions, privateNote는 무조건 비공개
 * - visibility 설정에 따라 7개 토글 필드를 선택적으로 숨김
 *
 * @param record - 원본 기록 (optional fields를 가진 객체)
 * @param isOwner - 뷰어가 기록 작성자인지
 * @param visibility - 적용할 가시성 설정 (null이면 모든 필드 숨김)
 */
export function applyVisibility<T extends Record<string, unknown>>(
  record: T,
  isOwner: boolean,
  visibility: VisibilityConfig | null,
): T {
  if (isOwner) return record

  const filtered: Record<string, unknown> = { ...record }

  // 무조건 비공개 필드
  filtered.companions = null
  filtered.privateNote = null

  if (!visibility) {
    // visibility가 null이면 최소 정보만
    filtered.comment = null
    filtered.totalPrice = null
    filtered.purchasePrice = null
    return filtered as T
  }

  // 토글 기반 필터링
  if (!visibility.score) {
    filtered.satisfaction = null
    filtered.axisX = null
    filtered.axisY = null
  }
  if (!visibility.comment) {
    filtered.comment = null
  }
  if (!visibility.photos) {
    filtered.photos = null
  }
  if (!visibility.quadrant) {
    filtered.axisX = null
    filtered.axisY = null
  }
  if (!visibility.price) {
    filtered.totalPrice = null
    filtered.purchasePrice = null
  }

  return filtered as T
}
