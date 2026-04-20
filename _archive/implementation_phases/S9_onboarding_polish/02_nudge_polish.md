# 9.2: 넛지 시스템 정교화

> 온보딩 이후 Week 1~2에 미완성 기록 보충, 사진 감지, 식사 시간 넛지를 통해 첫 기록 완성을 유도한다.

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/12_ONBOARDING.md` | §9 넛지 시스템 (유형, 우선순위, 피로도) |
| `pages/06_HOME.md` | 넛지 스트립 UI (홈 상단) |
| `systems/DATA_MODEL.md` | §5 nudge_history, nudge_fatigue 테이블 |
| `systems/XP_SYSTEM.md` | 기록 XP (checked → rated 전환 시) |

---

## 선행 조건

- S5: 홈 앱 셸 + 넛지 스트립 컴포넌트 (`nudge-strip.tsx`) 기본 구현
- S1: `nudge_history`, `nudge_fatigue` 테이블 생성 완료
- S2: RecordRepository (status 기반 조회)
- 9.1: 온보딩 완료 (checked 기록이 존재할 수 있는 상태)

---

## 구현 범위

### 파일 목록

```
src/domain/entities/nudge.ts
src/domain/services/nudge-priority.ts
src/infrastructure/repositories/supabase-nudge-repository.ts
src/application/hooks/use-nudge.ts
src/presentation/components/home/nudge-strip.tsx              ← S5에서 생성, 여기서 확장
src/shared/di/container.ts                                    ← nudgeRepo 등록 추가
```

### 스코프 외

- 사진 감지용 네이티브 갤러리 접근 (PWA 한계 — v2에서 네이티브 앱 전환 시)
- 위치 기반 식사 후 넛지 (GPS 상시 트래킹 필요 — v2)
- 푸시 알림 발송 인프라 (FCM/APNs — v2)
- 이 태스크에서는 **앱 내 넛지 스트립**만 구현

---

## 상세 구현 지침

### 1. Domain Layer

#### `src/domain/entities/nudge.ts`

```typescript
export type NudgeType =
  | 'unrated'          // 미완성 기록 보충
  | 'photo'            // 사진 감지 (v2 — 현재 stub)
  | 'meal_time'        // 식사 시간
  | 'bubble_invite'    // 버블 초대 리마인드
  | 'weekly_remind';   // 주간 리마인드

export type NudgeStatus = 'sent' | 'opened' | 'acted' | 'dismissed' | 'skipped';

export interface NudgeItem {
  id: string;
  type: NudgeType;
  title: string;       // "평가를 완성해보세요" 등
  body: string;        // "등록만 해둔 3개의 맛집이 있어요" 등
  ctaLabel: string;    // "기록하기" 등
  ctaRoute: string;    // 탭 시 이동할 라우트
  targetId?: string;   // 관련 record_id 등
  priority: number;    // 1(최고) ~ 5(최저)
  createdAt: Date;
}

export interface NudgeFatigue {
  userId: string;
  score: number;          // 현재 피로도 점수
  lastNudgeAt: Date | null;
  pausedUntil: Date | null;
}

/** 넛지 표시 조건 */
export interface NudgeCondition {
  type: NudgeType;
  check: () => Promise<boolean>;
  build: () => Promise<NudgeItem | null>;
  priority: number;
}
```

#### `src/domain/services/nudge-priority.ts`

```typescript
/**
 * 넛지 우선순위 + 피로도 관리 로직
 *
 * 우선순위 (SSOT: 12_ONBOARDING.md §9):
 *   1. 미완성 기록 보충 (unrated) — 앱 진입 시 status='checked' 존재
 *   2. 사진 감지 (photo) — 앱 진입 시 갤러리 음식 사진 (v2 stub)
 *   3. 식사 시간 (meal_time) — 11~13시(점심), 17~19시(저녁)
 *   4. 버블 초대 리마인드 (bubble_invite) — 버블 생성 후 member_count=1
 *   5. 주간 리마인드 (weekly_remind) — 미사용 7일+ (v2 푸시)
 *
 * 표시 규칙:
 *   - 동시 최대 1개 (홈 상단 NudgeStrip)
 *   - 하루 최대 3개 (일일 카운터)
 *   - 닫기(dismiss) 시 4시간 스누즈 (해당 넛지 타입)
 *   - "건너뛰기" 3회 → 해당 넛지 2주 중단
 *
 * 피로도 점수 (SSOT: 12_ONBOARDING.md §9):
 *   - 앱 내 카드 표시: +1
 *   - 무시 (자동 닫힘): +2
 *   - "아니요" (명시적 거절): +1
 *   - 기록 완료: -5 (리셋)
 *   - 매일 -1 자연 감소 (cron 또는 앱 진입 시)
 *   - score > 10 → 48시간 중단
 *   - score > 20 → 1주 중단
 *
 * 시간 제한:
 *   - 23:00~08:00 넛지 없음 (앱 내도 포함)
 */

export function selectNudge(conditions: NudgeCondition[]): NudgeCondition | null {
  // 1. 피로도 체크 → pausedUntil이 현재 시각 이후면 null 반환
  // 2. 시간대 체크 → 23~08시면 null 반환
  // 3. 일일 한도 체크 → 오늘 nudge_history 3개 이상이면 null 반환
  // 4. 우선순위순 정렬 → check() 실행 → 첫 번째 true인 condition의 build() 반환
  return null;
}

export function calculateFatigueUpdate(
  current: NudgeFatigue,
  action: 'shown' | 'ignored' | 'dismissed' | 'acted'
): Partial<NudgeFatigue> {
  // shown: +1, ignored: +2, dismissed: +1, acted: -5
  // score > 10 → pausedUntil = now + 48h
  // score > 20 → pausedUntil = now + 7d
  return {};
}

export function isNudgeQuietHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 8;
}
```

### 2. Infrastructure Layer

#### `src/infrastructure/repositories/supabase-nudge-repository.ts`

```typescript
export class SupabaseNudgeRepository {

  /** 오늘 표시된 넛지 수 조회 */
  async getTodayNudgeCount(userId: string): Promise<number> {
    // SELECT COUNT(*) FROM nudge_history
    // WHERE user_id = :userId
    //   AND created_at >= CURRENT_DATE
    //   AND status IN ('sent', 'opened')
  }

  /** 특정 타입 넛지의 최근 dismiss 시각 조회 (스누즈 체크용) */
  async getLastDismissTime(userId: string, nudgeType: NudgeType): Promise<Date | null> {
    // SELECT created_at FROM nudge_history
    // WHERE user_id = :userId AND nudge_type = :nudgeType AND status = 'dismissed'
    // ORDER BY created_at DESC LIMIT 1
  }

  /** 특정 타입 넛지의 연속 건너뛰기 횟수 조회 */
  async getConsecutiveSkipCount(userId: string, nudgeType: NudgeType): Promise<number> {
    // SELECT COUNT(*) FROM nudge_history
    // WHERE user_id = :userId AND nudge_type = :nudgeType AND status IN ('dismissed', 'skipped')
    //   AND created_at > (
    //     SELECT COALESCE(MAX(created_at), '1970-01-01')
    //     FROM nudge_history
    //     WHERE user_id = :userId AND nudge_type = :nudgeType AND status = 'acted'
    //   )
  }

  /** 넛지 히스토리 INSERT */
  async recordNudge(
    userId: string,
    nudgeType: NudgeType,
    targetId: string | null,
    status: NudgeStatus
  ): Promise<void> {
    // INSERT INTO nudge_history (user_id, nudge_type, target_id, status)
  }

  /** 피로도 조회 */
  async getFatigue(userId: string): Promise<NudgeFatigue | null> {
    // SELECT * FROM nudge_fatigue WHERE user_id = :userId
  }

  /** 피로도 업데이트 */
  async updateFatigue(userId: string, update: Partial<NudgeFatigue>): Promise<void> {
    // UPSERT nudge_fatigue SET score = :score, last_nudge_at = NOW(), paused_until = :pausedUntil
    // WHERE user_id = :userId
  }

  /** 미완성 기록 조회 (status='checked') */
  async getUncheckedRecords(userId: string): Promise<{ id: string; targetName: string }[]> {
    // SELECT r.id, COALESCE(rest.name, w.name) as target_name
    // FROM records r
    // LEFT JOIN restaurants rest ON r.target_id = rest.id AND r.target_type = 'restaurant'
    // LEFT JOIN wines w ON r.target_id = w.id AND r.target_type = 'wine'
    // WHERE r.user_id = :userId AND r.status = 'checked'
    // ORDER BY r.created_at DESC
    // LIMIT 5
  }

  /** 사용자의 1인 버블 조회 (member_count=1) */
  async getLonelyBubbles(userId: string): Promise<{ id: string; name: string }[]> {
    // SELECT b.id, b.name FROM bubbles b
    // JOIN bubble_members bm ON b.id = bm.bubble_id
    // WHERE bm.user_id = :userId AND bm.role = 'owner' AND b.member_count = 1
  }
}
```

### 3. Application Layer

#### `src/application/hooks/use-nudge.ts`

```typescript
/**
 * 넛지 표시 관리 훅
 *
 * 마운트 시:
 * 1. isNudgeQuietHours() → true면 null 반환
 * 2. getFatigue() → pausedUntil 체크
 * 3. getTodayNudgeCount() → 3개 이상이면 null 반환
 * 4. 우선순위순으로 조건 체크:
 *    a. unrated: getUncheckedRecords() → 결과 있으면 넛지 생성
 *    b. photo: (v2 stub — 항상 false)
 *    c. meal_time: 현재 시각이 11~13 or 17~19
 *    d. bubble_invite: getLonelyBubbles() → 결과 있으면 넛지 생성
 *    e. weekly_remind: (v2 푸시 전용 — 앱 내에서는 미표시)
 * 5. 첫 번째 true인 넛지 반환
 *
 * 반환:
 * - currentNudge: NudgeItem | null
 * - dismissNudge(): 닫기 (4시간 스누즈) → 피로도 +1
 * - actOnNudge(): CTA 탭 → 피로도 -5 → 라우트 이동
 * - ignoreNudge(): 5초 auto-dismiss → 피로도 +2
 *
 * 넛지 메시지 (타입별):
 *
 * unrated:
 *   title: "평가를 완성해보세요"
 *   body: "등록만 해둔 N개의 맛집이 있어요"
 *   ctaLabel: "기록하기"
 *   ctaRoute: "/records/{첫 번째 checked record id}/edit" 또는 기록 플로우 진입
 *
 * meal_time (점심):
 *   title: "오늘 점심 뭐 드셨어요?"
 *   body: "기록하면 미식 경험치가 쌓여요"
 *   ctaLabel: "기록하기"
 *   ctaRoute: FAB (+) 트리거
 *
 * meal_time (저녁):
 *   title: "오늘 저녁 뭐 드셨어요?"
 *   body: "기록하면 미식 경험치가 쌓여요"
 *   ctaLabel: "기록하기"
 *   ctaRoute: FAB (+) 트리거
 *
 * bubble_invite:
 *   title: "버블에 친구를 초대해보세요"
 *   body: "{버블명}에 아직 혼자예요"
 *   ctaLabel: "초대하기"
 *   ctaRoute: "/bubbles/{bubbleId}"
 *
 * auto-dismiss:
 *   - NudgeStrip 표시 후 5초 경과 시 자동 사라짐
 *   - 사용자가 스크롤/상호작용 시 타이머 리셋하지 않음
 *   - 자동 사라짐 = ignore 처리 (피로도 +2)
 *
 * 스누즈 규칙:
 *   - dismiss 시 해당 nudge_type의 lastDismissTime 확인
 *   - 4시간 이내면 해당 타입 스킵 → 다음 우선순위로
 *   - 연속 3회 dismiss → 해당 타입 2주 중단 (nudge_history 기반 카운트)
 */
```

### 4. Presentation Layer

#### `src/presentation/components/home/nudge-strip.tsx` (확장)

```typescript
/**
 * 홈 상단 넛지 스트립 (S5에서 기본 구현, 여기서 완성)
 *
 * Props:
 * - nudge: NudgeItem | null
 * - onDismiss: () => void
 * - onAction: () => void
 *
 * 레이아웃:
 * - 위치: 홈 콘텐츠 상단 (탭 바 아래)
 * - max 1개만 표시
 * - height: auto (콘텐츠에 맞춤)
 * - background: var(--accent-food-light) = #F5EDE8
 * - border-radius: 12px
 * - padding: 12px 16px
 * - margin: 8px 16px
 *
 * 구조:
 * ┌──────────────────────────────────┐
 * │ [아이콘] 제목              [×] │
 * │         본문                    │
 * │         [CTA 버튼]             │
 * └──────────────────────────────────┘
 *
 * 아이콘 (넛지 타입별):
 * - unrated: lucide 'clipboard-check', color:var(--accent-food)
 * - meal_time: lucide 'utensils', color:var(--accent-food)
 * - bubble_invite: lucide 'send', color:var(--accent-social)
 * - photo: lucide 'camera', color:var(--accent-food)
 *
 * CTA 버튼:
 * - font-size:13px, font-weight:600
 * - color:var(--accent-food), background:none
 * - padding:4px 0
 *
 * 닫기 [×]:
 * - lucide 'x', 16×16px, color:var(--text-hint)
 * - 탭 → onDismiss()
 *
 * auto-dismiss:
 * - useEffect → 5초 후 자동 사라짐
 * - 사라짐 애니메이션: opacity 0 + height 0 (300ms ease)
 * - nudge가 null이 되면 렌더링하지 않음
 *
 * 넛지가 null이면:
 * - 컴포넌트 자체를 렌더링하지 않음 (높이 0)
 */
```

---

## 넛지 조건 상세 매트릭스

| 넛지 타입 | 우선순위 | 체크 조건 | 빈도 | 앱 내/푸시 | v1 구현 |
|----------|---------|----------|------|-----------|---------|
| `unrated` | 1 | `records WHERE status='checked'` 1개 이상 | 매 앱 진입 | 앱 내 | O |
| `photo` | 2 | 갤러리 음식 사진 감지 | 매 앱 진입 | 앱 내 | X (stub) |
| `meal_time` | 3 | 현재 시각 11~13 or 17~19 | 1일 1회 | 앱 내 | O |
| `bubble_invite` | 4 | 내 버블 중 `member_count=1` 존재 | 1일 1회 | 앱 내 | O |
| `weekly_remind` | 5 | 마지막 기록 7일+ 전 | 주 1회 | 푸시 | X (v2) |

---

## 피로도 점수 흐름 예시

```
초기: score=0

Day 1 AM: unrated 넛지 표시 → score=1
  사용자 dismiss → score=2
  점심 meal_time 넛지 표시 → score=3
  사용자 CTA 탭 → 기록 완료 → score=-2 (3-5, min 0이므로 0)

Day 2 AM: score=0 (자연감소 적용 후에도 0)
  unrated 넛지 → score=1
  사용자 무시 (auto-dismiss 5초) → score=3
  저녁 meal_time → score=4
  사용자 dismiss → score=5

Day 3: score=4 (5 - 1 자연감소)
  ...

score > 10 도달 → paused_until = NOW() + 48h
48h 경과 → 넛지 재개, score는 매일 -1 자연감소로 점진 해소
```

---

## 검증 체크리스트

```
□ 온보딩 완료 후 checked 기록 존재 시 → unrated 넛지 표시
□ 11~13시 앱 진입 시 → meal_time (점심) 넛지 표시
□ 17~19시 앱 진입 시 → meal_time (저녁) 넛지 표시
□ 버블 생성 후 member_count=1이면 → bubble_invite 넛지 표시
□ 23~08시에는 어떤 넛지도 미표시
□ 동시 최대 1개 넛지 표시
□ 하루 최대 3개 넛지 (일일 카운터)
□ dismiss → 4시간 스누즈 (동일 타입)
□ 3회 연속 dismiss → 해당 타입 2주 중단
□ CTA 탭 → 적절한 라우트 이동 + 피로도 -5
□ 5초 auto-dismiss 작동 (피로도 +2)
□ 피로도 > 10 → 48시간 중단
□ 피로도 > 20 → 1주 중단
□ 매일 -1 자연 감소 (앱 진입 시 체크)
□ NudgeStrip 배경: var(--accent-food-light) = #F5EDE8
□ nudge=null이면 스트립 미렌더링
□ R1~R5 위반 없음
□ TypeScript strict
```
