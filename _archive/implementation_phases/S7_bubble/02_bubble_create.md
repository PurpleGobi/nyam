# S7-T2: 버블 생성/가입/초대

> 버블 생성 폼, 5종 가입 정책 UI, 초대 링크 생성, 가입 플로우 전체 구현.

---

## SSOT 출처

| 문서 | 참조 범위 |
|------|----------|
| `pages/08_BUBBLE.md` §3 | 버블 생성 플로우 (이름/설명/공개설정/초대만료/가입정책) |
| `pages/08_BUBBLE.md` §4-2 | 가입 정책 5종 + auto_approve 조건 |
| `pages/08_BUBBLE.md` §4-3 | 양방향 프리뷰 (가입 신청 시) |
| `pages/08_BUBBLE.md` §11-4, §11-5 | 버블 탐색 시트, 발견 팝업 |
| `systems/AUTH.md` §2-3 | 가입 정책 상세 |
| `systems/XP_SYSTEM.md` §4-3 | 소셜 XP (버블 생성 +5, 첫 공유 +3) |
| `prototype/04_bubbles.html` | 버블 목록 + FAB + 생성 폼 목업 |
| `prototype/04_bubbles_detail.html` | 버블 설정 (가입 조건 그룹) |

---

## 선행 조건

- T7.1 완료: Bubble, BubbleMember 엔티티, BubbleRepository, DI 등록

---

## 구현 범위

### 파일 목록

| 레이어 | 파일 | 설명 |
|--------|------|------|
| domain | `src/domain/services/bubble-join-service.ts` | 가입 조건 검증 순수 함수 |
| domain | `src/domain/services/bubble-share-sync.ts` | 자동 공유 규칙 평가 + diff 계산 |
| application | `src/application/hooks/use-bubble-create.ts` | 버블 생성 로직 |
| application | `src/application/hooks/use-bubble-join.ts` | 가입 신청/승인/거절 로직 |
| application | `src/application/hooks/use-invite-link.ts` | 초대 링크 생성/검증 |
| application | `src/application/hooks/use-bubble-auto-sync.ts` | 자동 공유 규칙 동기화 |
| application | `src/application/hooks/use-share-record.ts` | 기록 공유/해제 |
| presentation | `src/presentation/components/bubble/bubble-create-form.tsx` | 생성 폼 UI |
| presentation | `src/presentation/components/bubble/join-policy-selector.tsx` | 가입 정책 4종 카드 선택 |
| presentation | `src/presentation/components/bubble/invite-link-generator.tsx` | 초대 링크 생성 UI |
| presentation | `src/presentation/components/bubble/join-flow.tsx` | 가입 신청 + 양방향 프리뷰 |
| presentation | `src/presentation/components/bubble/bubble-discover-sheet.tsx` | 버블 탐색 바텀 시트 |
| presentation | `src/presentation/components/bubble/bubble-preview-popup.tsx` | 발견 팝업 (미리보기) |
| presentation | `src/presentation/components/bubble/share-rule-editor.tsx` | 자동 공유 규칙 편집기 |
| presentation | `src/presentation/containers/bubble-create-container.tsx` | 생성 폼 컨테이너 |
| presentation | `src/presentation/containers/bubble-join-container.tsx` | 가입 플로우 컨테이너 |
| app | `src/app/(main)/bubbles/create/page.tsx` | 생성 폼 라우트 |

### 스코프 외

- 버블 목록 페이지 전체 레이아웃 (→ 03_bubble_detail.md에서 라우트 포함)
- 버블 설정 페이지 (→ 05_roles.md)
- 버블 탐색의 추천 알고리즘 (목 데이터로 구현, RECOMMENDATION.md 연동은 S8)

---

## 상세 구현 지침

### 1. Domain 서비스: 가입 조건 검증

#### `src/domain/services/bubble-join-service.ts`

```typescript
import type { Bubble, BubbleMemberRole } from '@/domain/entities/bubble';

/** 가입 조건 검증 결과 */
export interface JoinEligibility {
  eligible: boolean;
  reasons: string[];             // 미충족 사유 목록
}

/** 사용자 프로필 (검증에 필요한 최소 정보) */
export interface JoinApplicantProfile {
  totalXp: number;
  activeXp: number;
  activeVerified: number;        // 최근 6개월 검증 기록 수
  recordCount: number;
  level: number;                 // users.total_xp 기반 전체 레벨
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
  hasInviteCode: boolean
): JoinEligibility {
  const reasons: string[] = [];

  // invite_only: 초대 코드 없으면 불가
  if (bubble.joinPolicy === 'invite_only') {
    if (!hasInviteCode) {
      return { eligible: false, reasons: ['초대 코드가 필요합니다'] };
    }
    return { eligible: true, reasons: [] };
  }

  // closed: 팔로우만 가능 (가입 불가)
  if (bubble.joinPolicy === 'closed') {
    return { eligible: false, reasons: ['이 버블은 팔로우만 가능합니다'] };
  }

  // max_members 체크 (공통)
  if (bubble.maxMembers !== null && bubble.memberCount >= bubble.maxMembers) {
    return { eligible: false, reasons: ['최대 인원에 도달했습니다'] };
  }

  // open: 무조건 가입
  if (bubble.joinPolicy === 'open') {
    return { eligible: true, reasons: [] };
  }

  // manual_approve: 조건 체크 후 pending
  // auto_approve: 조건 체크 후 즉시 active 또는 거부
  if (bubble.minRecords > 0 && applicant.recordCount < bubble.minRecords) {
    reasons.push(`최소 기록 ${bubble.minRecords}개 필요 (현재 ${applicant.recordCount}개)`);
  }
  if (bubble.minLevel > 0 && applicant.level < bubble.minLevel) {
    reasons.push(`최소 Lv.${bubble.minLevel} 필요 (현재 Lv.${applicant.level})`);
  }

  if (bubble.joinPolicy === 'manual_approve') {
    // manual_approve는 조건 미충족이어도 신청 자체는 가능 (owner가 판단)
    return { eligible: true, reasons };
  }

  // auto_approve: 조건 모두 충족 시에만 가입
  if (reasons.length > 0) {
    return { eligible: false, reasons };
  }
  return { eligible: true, reasons: [] };
}

/**
 * 역할이 특정 작업을 할 수 있는지 확인 (→ 05_roles.md에서 확장)
 */
export function canJoinAsMember(joinPolicy: string): boolean {
  return joinPolicy !== 'closed' && joinPolicy !== 'invite_only';
}
```

### 2. Application Hooks

#### `src/application/hooks/use-bubble-create.ts`

```typescript
// 의존: bubbleRepo (DI), useAuth (현재 사용자)
// 플로우:
//   1. validateInput(name, description)
//   2. bubbleRepo.create({...})
//   3. 자동으로 owner가 bubble_members에 등록 (repo 내부)
//   4. XP 적립: bonus_first_bubble (+5, 첫 버블 생성 시만)
//   5. return { bubble, inviteCode }

interface CreateBubbleInput {
  name: string;                    // 1~20자
  description?: string;            // 0~100자
  visibility: 'private' | 'public';
  joinPolicy?: BubbleJoinPolicy;   // public일 때만 (private → 자동 invite_only)
  icon?: string;                   // lucide 아이콘명
  iconBgColor?: string;            // hex
  focusType?: BubbleFocusType;     // 기본 'all' (생성 시 선택 안 함, 설정에서 변경)
  inviteExpiry?: '1d' | '7d' | '30d' | 'unlimited';  // 기본 '30d'
}

// 반환:
interface CreateBubbleResult {
  bubble: Bubble;
  inviteCode: string;
}
```

**검증 규칙**:
- name: 1~20자, 빈 문자열 불가
- description: 0~100자
- visibility='private' → joinPolicy 자동 'invite_only'
- visibility='public' → joinPolicy 필수 (closed/manual_approve/auto_approve/open)

#### `src/application/hooks/use-bubble-join.ts`

```typescript
// 의존: bubbleRepo, userRepo (프로필 조회), checkJoinEligibility (domain service)
// 플로우:
//   1. bubble 조회 + 현재 사용자 프로필 조회
//   2. checkJoinEligibility() 실행
//   3. eligible=true:
//      - open/auto_approve → addMember(status='active') + XP 적립
//      - manual_approve → addMember(status='pending') + 알림 생성 (bubble_join_request)
//   4. eligible=false → 에러 메시지 표시

interface JoinBubbleInput {
  bubbleId: string;
  inviteCode?: string;    // invite_only 버블용
}

// 추가 기능:
// - follow(bubbleId): closed 정책 버블 팔로우 (role='follower', status='active')
// - approveJoin(bubbleId, userId): owner/admin이 pending 멤버 승인
// - rejectJoin(bubbleId, userId): owner/admin이 pending 멤버 거절
// - cancelJoin(bubbleId): 본인이 가입 신청 취소

// 승인 시:
//   - updateMember(bubbleId, userId, 'active')
//   - 알림 생성: bubble_join_approved → 신청자
//   - bubbles.member_count++ (트리거)

// 거절 시:
//   - updateMember(bubbleId, userId, 'rejected')
//   - 알림: 없음 (거절은 조용히)
```

#### `src/application/hooks/use-invite-link.ts`

```typescript
// 의존: bubbleRepo
// 기능:
//   1. generateLink(bubbleId, expiry): 초대 링크 생성
//   2. validateLink(code): 초대 코드 유효성 검증
//   3. copyToClipboard(link): 클립보드 복사

// 만료 옵션 → Date 변환:
//   '1d'  → new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)
//   '7d'  → new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
//   '30d' → new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
//   'unlimited' → null

// 초대 링크 형식: https://[domain]/bubbles/invite/[code]
```

### 3. Presentation 컴포넌트

#### `bubble-create-form.tsx`

**목업 참조**: `04_bubbles.html` (screen-bubble-create)

**레이아웃** (위→아래):

```
┌─────────────────────────────────┐
│ ← 버블 만들기          (헤더)    │
├─────────────────────────────────┤
│                                 │
│  [아이콘 선택]  (44×44, 둥근)    │ ← 기본 utensils-crossed, 탭하면 아이콘 피커 시트
│                                 │
│  버블 이름 *                    │ ← Input (20자 제한, 카운터 표시)
│  [                         ]    │
│                                 │
│  설명                           │ ← TextArea (100자, 선택)
│  [                         ]    │
│                                 │
│  ── 공개 설정 ──                │
│  ○ 비공개 (lock)               │ ← "초대받은 사람만 접근"
│  ● 공개 (globe)                │ ← "누구나 검색 팔로우 가능"
│                                 │
│  ── 가입 정책 ── (공개 시만)    │
│  [join-policy-selector 4종]     │ ← 아래 별도 컴포넌트
│                                 │
│  ── 초대 링크 ──                │
│  만료: [1일] [7일] [30일●] [무제한] │
│                                 │
│  [버블 만들기] (CTA, filled)     │
└─────────────────────────────────┘
```

**Props**:

```typescript
interface BubbleCreateFormProps {
  onSubmit: (input: CreateBubbleInput) => void;
  isLoading: boolean;
}
```

**아이콘 피커**: lucide 아이콘 중 추천 목록 (utensils-crossed, wine, coffee, home, map-pin, flame, heart, star, users, book-open, music, camera) + 색상 팔레트 (8색)

#### `join-policy-selector.tsx`

**목업 참조**: `04_bubbles.html` (screen-bubble-create 내 가입 정책 카드)

**4종 카드** (2×2 그리드):

| 정책 | 아이콘 | 레이블 | 설명 |
|------|--------|--------|------|
| `closed` | eye | 팔로우만 | 가입 안 받음. 팔로워는 이름+점수만 열람 |
| `manual_approve` | shield-check | 승인 가입 | 가입 신청 → 프로필 보고 승인/거절 (기본) |
| `auto_approve` | zap | 자동 승인 | 검증 기록 N개 이상이면 자동 가입 |
| `open` | door-open | 자유 가입 | 누구나 바로 가입 가능 |

**선택 시 스타일**:
- 미선택: `border border-line bg-surface`
- 선택: `border-2 border-primary bg-primary/5`
- 아이콘: 24×24, `text-text-sub` (미선택) / `text-primary` (선택)

**auto_approve 선택 시**: 하단에 조건 입력 슬라이더 표시
- 최소 기록 수: 숫자 입력 (기본 5)
- 최소 레벨: 숫자 입력 (기본 3)

```typescript
interface JoinPolicySelectorProps {
  value: BubbleJoinPolicy;
  onChange: (policy: BubbleJoinPolicy) => void;
  minRecords: number;
  onMinRecordsChange: (n: number) => void;
  minLevel: number;
  onMinLevelChange: (n: number) => void;
}
```

#### `invite-link-generator.tsx`

**레이아웃**:

```
┌─────────────────────────────────┐
│ 초대 링크                        │
│ [https://nyam.app/invite/a8f3c] │ ← 읽기 전용 Input
│ [복사] [공유] [새로 만들기]       │ ← 3 버튼 행
│                                 │
│ 만료: 30일 후 (2026-04-26)       │ ← 회색 텍스트
└─────────────────────────────────┘
```

```typescript
interface InviteLinkGeneratorProps {
  bubbleId: string;
  inviteCode: string | null;
  inviteExpiresAt: string | null;
  onGenerate: (expiry: '1d' | '7d' | '30d' | 'unlimited') => void;
}
```

#### `join-flow.tsx`

가입 신청 시 양방향 프리뷰 바텀 시트.

**가입 희망자가 보는 버블 정보** (BUBBLE.md §4-3):

```
┌─────────────────────────────────┐
│ 직장 맛집에 가입하시겠어요?       │
├─────────────────────────────────┤
│ 멤버 수        12명             │
│ 총 기록        234개            │
│ 주요 지역      을지로, 광화문     │
│ 평균 점수      87               │
│ 나와 겹치는 곳  5개             │
│ 취향 유사도    78%              │
├─────────────────────────────────┤
│ 가입 조건                       │
│ ✓ 관리자 승인 필요               │
│ ✓ 최소 기록 5개 이상             │
│ ✓ 최소 Lv.3 이상                │
│ ✓ 현재 12/20명 (여유 8자리)      │
├─────────────────────────────────┤
│ [취소]        [가입 신청]        │
└─────────────────────────────────┘
```

**Owner가 보는 신청자 정보** (알림 또는 설정 > 멤버 관리):

```
┌─────────────────────────────────┐
│ 👤 김영수  Lv.5                 │
│ 검증 기록 (EXIF)  28개          │
│ 단순 등록         5개           │
│ 주요 지역        을지로, 성수     │
│ 취향 유사도      78%            │
│ 최근 활동        3일 전          │
│                                 │
│ [거절 ✕]        [승인 ✓]        │
└─────────────────────────────────┘
```

```typescript
interface JoinFlowProps {
  bubble: Bubble;
  applicantProfile: JoinApplicantProfile;
  tasteMatch: { pct: number; commonCount: number } | null;
  onJoin: () => void;
  onFollow: () => void;   // closed 정책용
  onCancel: () => void;
  isLoading: boolean;
}
```

#### `bubble-discover-sheet.tsx`

**목업 참조**: `04_bubbles.html` (screen-bubble-discover)

바텀 시트 (80% 높이). 탐색 칩 4종:

| 탭 | 아이콘 | 설명 |
|----|--------|------|
| 추천 | sparkles | 취향 유사도 기반 |
| 근처 | map-pin | 지역 기반 |
| 인기 | trending-up | 활동량 순 |
| 새로운 | zap | 최신 생성 |

발견 카드: 아이콘(44×44) + 이름 + "멤버 N명 . 기록 N개 . 취향 N%" + 라벨

```typescript
interface BubbleDiscoverSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onBubbleClick: (bubbleId: string) => void;
}
```

#### `bubble-preview-popup.tsx`

**목업 참조**: `04_bubbles.html` (screen-bubble-preview)

발견 카드 클릭 시 바텀 시트 (75% 높이). BUBBLE.md §11-5 구성:
- 헤더: 아이콘(50x50) + 이름 + 설명 + 뱃지(공개/양방향)
- 통계 그리드 (2x2): 시작일/가입자 수/활성도/만족도
- 세부 축 레벨: 멤버 세부 축별 진행 바
- 취향 일치: heart + "취향 N% 일치" + "겹치는 맛집 N곳 . 와인 N종"
- 가입 조건: 체크마크 리스트
- 가입 시 공개 범위: 잠금/잠금해제 아이콘 리스트
- 액션: [팔로우] + [가입 신청]

---

## 목업 매핑

| 목업 화면 | 컴포넌트 | 프로토타입 참조 |
|----------|---------|---------------|
| FAB 클릭 → 생성 폼 | `bubble-create-form.tsx` | `04_bubbles.html` screen-bubble-create |
| 가입 정책 4종 카드 | `join-policy-selector.tsx` | `04_bubbles.html` 생성 폼 내부 |
| 초대 링크 섹션 | `invite-link-generator.tsx` | `04_bubbles_detail.html` 히어로 user-plus |
| 가입 신청 바텀 시트 | `join-flow.tsx` | `04_bubbles.html` screen-bubble-preview |
| 버블 탐색 바텀 시트 | `bubble-discover-sheet.tsx` | `04_bubbles.html` screen-bubble-discover |
| 발견 팝업 미리보기 | `bubble-preview-popup.tsx` | `04_bubbles.html` screen-bubble-preview |

---

## 데이터 흐름

```
[생성 플로우]
  FAB 클릭 → bubble-create-form
    → 이름/설명 입력 + 공개 설정 + 가입 정책 + 아이콘 + 초대 만료
    → "버블 만들기" CTA
    → useBubbleCreate.create()
      → bubbleRepo.create() (bubbles INSERT)
      → bubble_members INSERT (role='owner', status='active')
      → inviteCode 생성 (bubbleRepo.generateInviteCode)
      → XP: bonus_first_bubble +5 (첫 버블 시)
    → 성공 → 버블 상세 페이지로 이동

[가입 플로우 — manual_approve]
  1. 사용자가 버블 발견 (탐색/검색/초대 링크)
  2. bubble-preview-popup → 버블 정보 확인
  3. "가입 신청" 클릭 → join-flow 바텀 시트
  4. useBubbleJoin.join()
     → checkJoinEligibility() (domain service)
     → eligible → bubbleRepo.addMember(status='pending')
     → 알림: bubble_join_request → owner/admin
  5. Owner → 알림/설정에서 신청 확인
     → "승인" → useBubbleJoin.approveJoin()
       → updateMember('active')
       → 알림: bubble_join_approved → 신청자
     → "거절" → useBubbleJoin.rejectJoin()
       → updateMember('rejected')

[가입 플로우 — auto_approve]
  useBubbleJoin.join()
    → checkJoinEligibility()
    → eligible (조건 충족) → addMember(status='active') 즉시
    → not eligible → 에러 메시지 (미충족 사유)

[가입 플로우 — open]
  useBubbleJoin.join()
    → addMember(status='active') 즉시

[팔로우 플로우 — closed]
  useBubbleJoin.follow()
    → addMember(role='follower', status='active')
    → 소셜 XP +1 (팔로워 획득, owner에게)

[초대 링크 플로우]
  1. Owner → invite-link-generator → "새로 만들기"
  2. useInviteLink.generateLink(bubbleId, '30d')
     → bubbleRepo.generateInviteCode()
     → 링크 복사/공유
  3. 수신자 → 링크 클릭 → /bubbles/invite/[code]
  4. useInviteLink.validateLink(code)
     → valid → 버블 미리보기 + "가입" CTA
     → expired → "만료된 초대 링크" 안내
     → invalid → "유효하지 않은 링크" 안내
```

---

## 검증 체크리스트

```
□ 버블 생성: 이름(1~20자) + 설명(0~100자) + 공개 설정 + 아이콘
□ private 버블 → join_policy 자동 invite_only (UI에 정책 선택 안 나옴)
□ public 버블 → 4종 가입 정책 카드 선택 가능
□ auto_approve → 최소 기록/최소 레벨 입력 UI 표시
□ 초대 링크: 1일/7일/30일/무제한 만료 옵션
□ 가입 플로우: 5종 정책별 분기 동작
□   invite_only: 초대 코드 없으면 가입 불가
□   closed: "팔로우" 버튼만 (가입 불가)
□   manual_approve: pending → owner 승인/거절
□   auto_approve: 조건 충족 시 즉시 active
□   open: 즉시 active
□ max_members 초과 시 가입 차단
□ 양방향 프리뷰: 버블 정보 + 신청자 정보 정확 표시
□ XP 적립: bonus_first_bubble +5 (첫 버블)
□ 알림: bubble_join_request (owner에게), bubble_join_approved (신청자에게)
□ R1~R5 위반 없음
□ pnpm build / lint 에러 없음
□ 360px 모바일에서 레이아웃 정상
```
