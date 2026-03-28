// src/domain/services/bubble-join-service.ts
// R1: 외부 의존 0

import type { Bubble, BubbleJoinPolicy } from '@/domain/entities/bubble'

/** 가입 조건 검증 결과 */
export interface JoinEligibility {
  eligible: boolean
  reasons: string[]
}

/** 사용자 프로필 (검증에 필요한 최소 정보) */
export interface JoinApplicantProfile {
  totalXp: number
  activeXp: number
  activeVerified: number        // 최근 6개월 검증 기록 수
  recordCount: number
  level: number                 // users.total_xp 기반 전체 레벨
}

/**
 * 가입 조건 검증 (순수 함수, 외부 의존 없음)
 * - invite_only: 초대 코드 필수
 * - closed: 가입 불가 (팔로우만)
 * - manual_approve: 항상 eligible (승인 대기)
 * - auto_approve: min_records + min_level 조건 AND 검증
 * - open: 항상 eligible
 */
export function checkJoinEligibility(
  bubble: Bubble,
  applicant: JoinApplicantProfile,
  hasInviteCode: boolean,
): JoinEligibility {
  // invite_only: 초대 코드 없으면 불가
  if (bubble.joinPolicy === 'invite_only') {
    if (!hasInviteCode) {
      return { eligible: false, reasons: ['초대 코드가 필요합니다'] }
    }
    return { eligible: true, reasons: [] }
  }

  // closed: 팔로우만 가능 (가입 불가)
  if (bubble.joinPolicy === 'closed') {
    return { eligible: false, reasons: ['이 버블은 팔로우만 가능합니다'] }
  }

  // max_members 체크 (공통)
  if (bubble.maxMembers !== null && bubble.memberCount >= bubble.maxMembers) {
    return { eligible: false, reasons: ['최대 인원에 도달했습니다'] }
  }

  // open: 무조건 가입
  if (bubble.joinPolicy === 'open') {
    return { eligible: true, reasons: [] }
  }

  // manual_approve / auto_approve: 조건 체크
  const reasons: string[] = []

  if (bubble.minRecords > 0 && applicant.recordCount < bubble.minRecords) {
    reasons.push(`최소 기록 ${bubble.minRecords}개 필요 (현재 ${applicant.recordCount}개)`)
  }
  if (bubble.minLevel > 0 && applicant.level < bubble.minLevel) {
    reasons.push(`최소 Lv.${bubble.minLevel} 필요 (현재 Lv.${applicant.level})`)
  }

  if (bubble.joinPolicy === 'manual_approve') {
    // manual_approve는 조건 미충족이어도 신청 자체는 가능 (owner가 판단)
    return { eligible: true, reasons }
  }

  // auto_approve: 조건 모두 충족 시에만 가입
  if (reasons.length > 0) {
    return { eligible: false, reasons }
  }
  return { eligible: true, reasons: [] }
}

/**
 * 역할이 특정 작업을 할 수 있는지 확인
 */
export function canJoinAsMember(joinPolicy: BubbleJoinPolicy): boolean {
  return joinPolicy !== 'closed' && joinPolicy !== 'invite_only'
}
