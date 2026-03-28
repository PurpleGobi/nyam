// src/domain/entities/settings.ts
// R1: 외부 의존 0

/** 프라이버시 가시성 설정 (JSONB) */
export interface VisibilityConfig {
  score: boolean
  comment: boolean
  photos: boolean
  level: boolean
  quadrant: boolean
  bubbles: boolean
  price: boolean
}

/** 프라이버시 프로필 공개 범위 */
export type PrivacyProfile = 'public' | 'bubble_only' | 'private'

/** 기록 공개 범위 */
export type PrivacyRecords = 'all' | 'shared_only'

/** 계정 삭제 모드 */
export type DeleteMode = 'anonymize' | 'hard_delete'

/** 사용자 설정 (users 테이블에서 추출) */
export interface UserSettings {
  // 계정
  nickname: string
  bio: string | null
  avatarUrl: string | null

  // 프라이버시
  privacyProfile: PrivacyProfile
  privacyRecords: PrivacyRecords
  visibilityPublic: VisibilityConfig
  visibilityBubble: VisibilityConfig

  // 알림
  notifyPush: boolean
  notifyLevelUp: boolean
  notifyBubbleJoin: boolean
  notifyFollow: boolean
  dndStart: string | null
  dndEnd: string | null

  // 화면 디폴트
  prefLanding: string
  prefHomeTab: string
  prefRestaurantSub: string
  prefWineSub: string
  prefBubbleTab: string
  prefViewMode: string

  // 기능 디폴트
  prefDefaultSort: string
  prefRecordInput: string
  prefBubbleShare: string
  prefTempUnit: string

  // 계정 삭제
  deletedAt: string | null
  deleteMode: DeleteMode | null
  deleteScheduledAt: string | null
}

/** 버블별 프라이버시 오버라이드 */
export interface BubblePrivacyOverride {
  bubbleId: string
  bubbleName: string
  bubbleAvatarColor: string | null
  useDefault: boolean
  visibilityOverride: VisibilityConfig | null
}

/** NyamSelect 옵션 */
export interface SelectOption {
  value: string
  label: string
}
