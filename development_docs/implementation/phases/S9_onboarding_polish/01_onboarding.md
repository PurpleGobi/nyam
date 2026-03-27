# 9.1: 온보딩 풀 플로우

> 신규 유저를 로그인→인트로→맛집 등록→버블 생성→버블 탐색→홈까지 30초 이내에 안내한다.

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/12_ONBOARDING.md` | 전체 (SSOT — 00_IA.md와 불일치 시 이 문서 우선) |
| `systems/DATA_MODEL.md` | users, records, bubbles, bubble_members, xp_histories 테이블 |
| `systems/XP_SYSTEM.md` | §4-1 기록 XP, §4-4 보너스 XP (온보딩 완료 +10, 첫 버블 생성 +5) |
| `systems/AUTH.md` | 소셜 로그인 4종 (카카오/구글/네이버/애플) |
| `systems/DESIGN_SYSTEM.md` | 온보딩 FAB, 프로그레스 바 토큰 |
| `prototype/00_onboarding.html` | 인터랙티브 목업 (5 스크린) |

---

## 선행 조건

- S1: 인증 4종 + users/records/bubbles/bubble_members 테이블 + RLS 완료
- S2: RecordRepository, DiningRecord entity
- S6: XpCalculator, XpHistory entity, xp_histories 테이블
- S7: BubbleRepository, Bubble/BubbleMember entity

---

## 구현 범위

### 파일 목록

```
src/domain/entities/onboarding.ts
src/domain/services/onboarding-xp.ts
src/infrastructure/repositories/supabase-onboarding-repository.ts
src/application/hooks/use-onboarding.ts
src/application/hooks/use-onboarding-restaurants.ts
src/application/hooks/use-onboarding-bubbles.ts
src/presentation/components/onboarding/onboarding-progress.tsx
src/presentation/components/onboarding/onboarding-intro.tsx
src/presentation/components/onboarding/restaurant-register-step.tsx
src/presentation/components/onboarding/bubble-create-step.tsx
src/presentation/components/onboarding/bubble-explore-step.tsx
src/presentation/components/onboarding/bubble-explore-popup.tsx
src/presentation/components/onboarding/xp-popup.tsx
src/presentation/components/onboarding/area-select.tsx
src/presentation/components/onboarding/onboarding-search.tsx
src/presentation/containers/onboarding-container.tsx
src/app/onboarding/page.tsx
src/shared/constants/onboarding-seeds.ts
supabase/migrations/XXX_onboarding_completed.sql
```

### 스코프 외

- 지도에서 가져오기 (네이버/구글) — v1 비활성, alert 표시만
- 와인 온보딩 — v1 스코프 외
- 프로필/닉네임 설정 — 소셜 로그인에서 자동 설정
- 건너뛰기 링크 — 0개 등록 허용으로 불필요

---

## 라우팅 설계

### 라우트 구조

```
/onboarding          ← 단일 라우트, 내부 상태로 5개 스크린 전환
```

- `app/onboarding/page.tsx`는 `OnboardingContainer` 렌더링만
- 스크린 전환은 React 상태 기반 (`currentScreen`)
- URL 변경 없음 (뒤로가기는 FAB로 처리, 브라우저 히스토리 미사용)

### 진입 조건

```typescript
// middleware.ts 또는 layout.tsx에서 확인
if (user.onboarding_completed === false) {
  redirect('/onboarding');
}
```

### 이탈 방지

```typescript
// 온보딩 미완료 유저가 다른 페이지 접근 시 → /onboarding으로 리다이렉트
// 온보딩 완료 유저가 /onboarding 접근 시 → / (홈)으로 리다이렉트
```

---

## 상세 구현 지침

### 1. Domain Layer

#### `src/domain/entities/onboarding.ts`

```typescript
export type OnboardingScreen = 'login' | 'intro' | 'record' | 'bubble' | 'explore';

export interface OnboardingState {
  currentScreen: OnboardingScreen;
  registeredRestaurants: Set<string>;  // restaurant_id Set
  createdBubbles: Set<string>;         // bubble template name Set
  firstBubbleCreated: boolean;         // 첫 버블 생성 여부 (XP 트리거)
}

export interface OnboardingSeedRestaurant {
  id: string;        // 시드 마이그레이션에서 생성된 UUID
  name: string;
  genre: string;
  area: string;
}

export interface OnboardingBubbleTemplate {
  name: string;            // '가족' | '친구' | '직장동료'
  icon: string;            // lucide icon name: 'home' | 'users' | 'briefcase'
  iconColor: string;       // CSS variable
  description: string;
}

export interface OnboardingSeedBubble {
  name: string;
  icon: string;            // lucide icon name
  description: string;
  memberCount: number;
  maxMembers: number;
  recordCount: number;
  minLevel: number;
  visibility: 'public' | 'private';
  contentVisibility: 'rating_and_comment' | 'rating_only';
  joinPolicy: 'auto_approve' | 'manual_approve' | 'open';
  startDate: string;       // 'YYYY.MM'
  activityLabel: string;   // '매우 활발' | '활발'
  recordFrequency: string; // 'N.N일마다'
}

export const ONBOARDING_AREAS = ['을지로', '광화문', '성수', '강남', '홍대', '이태원'] as const;
export type OnboardingArea = typeof ONBOARDING_AREAS[number];
```

#### `src/domain/services/onboarding-xp.ts`

```typescript
import type { XpCalculator } from '@/domain/services/xp-calculator';

/**
 * 온보딩 XP 규칙 (XP_SYSTEM.md §4-4):
 * - 식당 등록: 0 XP (이름만 = checked)
 * - 첫 버블 생성: +5 XP (보너스, 1회만)
 * - 온보딩 완료: +10 XP (보너스, 1회만)
 * - 최대 온보딩 XP: 15
 */
export function calculateOnboardingBubbleXp(
  isFirstBubble: boolean
): number {
  return isFirstBubble ? 5 : 0;
}

export const ONBOARDING_COMPLETION_XP = 10;
```

### 2. Infrastructure Layer

#### `src/infrastructure/repositories/supabase-onboarding-repository.ts`

```typescript
// 온보딩 전용 DB 연산 (RecordRepository, BubbleRepository 조합)

export class SupabaseOnboardingRepository {

  /** 시드 식당 목록 조회 (area별) */
  async getSeedRestaurants(area: OnboardingArea): Promise<OnboardingSeedRestaurant[]> {
    // SELECT id, name, genre, area FROM restaurants
    // WHERE area = :area AND id IN (:seed_ids)
    // ORDER BY name
  }

  /** 식당 등록 (이름만, checked) */
  async registerRestaurant(userId: string, restaurantId: string): Promise<void> {
    // INSERT INTO records (user_id, target_id, target_type, status)
    // VALUES (:userId, :restaurantId, 'restaurant', 'checked')
    // record_quality_xp = 0
  }

  /** 버블 생성 (템플릿 기반) */
  async createBubbleFromTemplate(
    userId: string,
    template: OnboardingBubbleTemplate
  ): Promise<{ bubbleId: string; inviteCode: string }> {
    // 1. INSERT INTO bubbles (name, description, icon, focus_type, visibility, join_policy, content_visibility, created_by, invite_code)
    //    VALUES (:name, :desc, :icon, 'all', 'private', 'invite_only', 'rating_and_comment', :userId, nanoid(12))
    // 2. INSERT INTO bubble_members (bubble_id, user_id, role, status, joined_at)
    //    VALUES (:bubbleId, :userId, 'owner', 'active', NOW())
    // RETURN { bubbleId, inviteCode }
  }

  /** 온보딩 완료 처리 */
  async completeOnboarding(userId: string): Promise<void> {
    // UPDATE users SET onboarding_completed = true, updated_at = NOW()
    // WHERE id = :userId
  }

  /** XP 적립 (보너스) */
  async grantBonusXp(userId: string, amount: number, reason: string): Promise<void> {
    // 1. UPDATE users SET total_xp = total_xp + :amount WHERE id = :userId
    // 2. INSERT INTO xp_histories (user_id, xp_amount, reason, source_type)
    //    VALUES (:userId, :amount, :reason, 'bonus')
  }

  /** 온보딩 진행 상태 저장/조회 (중도 이탈 대비) */
  async saveOnboardingStep(userId: string, step: OnboardingScreen): Promise<void> {
    // UPDATE users SET onboarding_step = :step WHERE id = :userId
    // onboarding_step 컬럼 필요 (마이그레이션에 포함)
  }

  async getOnboardingStep(userId: string): Promise<OnboardingScreen | null> {
    // SELECT onboarding_step FROM users WHERE id = :userId
  }
}
```

### 3. Application Layer

#### `src/application/hooks/use-onboarding.ts`

```typescript
/**
 * 온보딩 전체 플로우 관리 훅
 *
 * 상태:
 * - currentScreen: 현재 표시 스크린
 * - screenHistory: 뒤로가기용 히스토리 스택
 * - registeredRestaurants: Set<string> (등록한 restaurant_id)
 * - createdBubbles: Set<string> (생성한 bubble template name)
 * - firstBubbleCreated: boolean
 * - isTransitioning: boolean (화면 전환 중 중복 방지)
 *
 * 액션:
 * - goForward(): 다음 스크린으로 전환 (350ms 슬라이드)
 * - goBack(): 이전 스크린으로 전환 (히스토리 기반)
 * - registerRestaurant(id): checked 기록 INSERT + Set에 추가
 * - createBubble(template): 버블 INSERT + XP 처리 + Set에 추가
 * - completeOnboarding(): onboarding_completed=true + 완료 XP +10 + 홈 이동
 *
 * 중도 이탈:
 * - currentScreen 변경 시 서버에 onboarding_step 저장
 * - 마운트 시 getOnboardingStep()으로 복원
 * - intro까지만 본 경우 → record부터 시작
 */
```

#### `src/application/hooks/use-onboarding-restaurants.ts`

```typescript
/**
 * Step 1: 맛집 등록 데이터 관리
 *
 * 상태:
 * - selectedArea: OnboardingArea (기본값: '을지로')
 * - restaurants: OnboardingSeedRestaurant[] (현재 지역 식당 목록)
 * - searchQuery: string
 * - searchResults: OnboardingSeedRestaurant[]
 * - isSearchOpen: boolean
 *
 * 로직:
 * - selectArea(area): 지역 변경 → 해당 시드 식당 로드
 * - search(query): 식당명/장르 포함 매칭, 없으면 전체 목록 fallback
 * - register(restaurantId): 등록 → DB INSERT → registeredRestaurants에 추가
 * - isRegistered(restaurantId): Set 확인
 *
 * 제약:
 * - 지역 전환 시 드롭다운은 을지로로 리셋되지 않음 (선택 유지)
 * - screen-record로 네비게이션할 때마다 드롭다운 을지로로 리셋 (SSOT 규칙)
 * - 등록 완료 상태는 전역 Set으로 유지 (지역 전환해도 안 사라짐)
 */
```

#### `src/application/hooks/use-onboarding-bubbles.ts`

```typescript
/**
 * Step 2: 버블 생성 데이터 관리
 *
 * 상태:
 * - createdBubbles: Set<string> (template name 기준)
 * - inviteCodes: Map<string, string> (template name → invite code)
 * - firstBubbleCreated: boolean
 *
 * 액션:
 * - createBubble(template): DB INSERT + XP 처리
 *   - 첫 버블: +5 XP (보너스), xp_histories에 reason='first_bubble' INSERT
 *   - 2번째+: 실제 XP 0, 하지만 UI에서 "+5 XP" 팝업은 동일 표시 (SSOT 규칙)
 * - copyInviteLink(templateName): 클립보드에 딥링크 URL 복사
 *   - URL: `${window.location.origin}/bubbles/join?code=${inviteCode}`
 *
 * 제약:
 * - 커스텀 이름 불가 (온보딩에서는 템플릿 이름 고정)
 * - 버블 설정은 홈 진입 후 버블 상세에서 변경 가능
 */
```

### 4. Presentation Layer

#### `src/presentation/components/onboarding/onboarding-progress.tsx`

```typescript
/**
 * 3칸 진행 바
 *
 * Props:
 * - currentStep: 1 | 2 | 3 (screen-record=1, screen-bubble=2, screen-explore=3)
 *
 * 레이아웃:
 * - display:flex, gap:6px
 * - 각 바: flex:1, height:3px, border-radius:2px
 * - padding: 54px 28px 0 (상단 여백 포함)
 *
 * 상태별 스타일:
 * - active: background:var(--accent-food)
 * - done: background:var(--accent-food), opacity:0.45
 * - pending: background:var(--border)
 *
 * login/intro 화면에서는 렌더링하지 않음 (부모에서 조건부)
 */
```

#### `src/presentation/components/onboarding/onboarding-intro.tsx`

```typescript
/**
 * 인트로 화면 (screen-intro)
 *
 * 레이아웃:
 * - 세로 중앙 정렬, padding: 0 36px
 * - 헤드라인: "낯선 별점 천 개보다,\n믿을만한 한 명의 기록."
 *   → 26px, font-weight:700, line-height:1.5, text-align:center
 * - 서브텍스트: "기록은 쌓이고,\n취향은 선명해지고,\n가까운 사람들과 나눌 수 있어요."
 *   → 14px, color:var(--text-sub), line-height:1.8, margin-top:16px
 * - CTA: "시작하기 →"
 *   → background:none, border:none, 15px, font-weight:600, color:var(--accent-food)
 *   → press: opacity:0.5 (mousedown), opacity:1 (mouseup)
 *
 * 동작:
 * - CTA 탭 → onStart() 콜백 → screen-record로 전환
 *
 * 하지 않는 것:
 * - 스텝 진행 바 없음
 * - FAB 없음
 */
```

#### `src/presentation/components/onboarding/restaurant-register-step.tsx`

```typescript
/**
 * Step 1/3: 맛집 등록 화면
 *
 * 레이아웃 (공통 온보딩 Step 구조):
 * - 상단 28%: 멘트 구간
 *   - 타이틀: "기록할 때마다,\n당신의 미식 경험치가 쌓여요."
 *   - 서브: "경험치를 통해 레벨이 올라가고,\n레벨은 사용자의 전문분야\n(지역, 장르)를 보여줍니다."
 * - 하단 72%: bg-card, radius 24px 24px 0 0
 *   - 지도에서 가져오기 [N] [G] — 비활성 (alert 표시)
 *   - 구분선
 *   - [지역 드롭다운] [검색 인풋] — 한 줄 배치
 *   - 식당 리스트
 *   - sticky 하단: "지금은 등록만 하고,\n나중에 식당평가 기록을 완성해 주세요."
 *
 * Props:
 * - registeredRestaurants: Set<string>
 * - onRegister: (restaurantId: string) => void
 *
 * 지역 드롭다운 (nyam-select):
 * - 기본 선택: '을지로'
 * - 지역 목록: 을지로, 광화문, 성수, 강남, 홍대, 이태원
 * - 변경 시 리스트 교체, 등록 상태 유지
 *
 * 검색 (ob-search):
 * - placeholder: "직접 검색"
 * - 매칭: name 또는 genre 포함 (includes)
 * - 결과 없으면 전체 목록 fallback
 * - onblur → 200ms 후 닫힘
 *
 * 식당 행:
 * - [식당명] ............. [등록] 버튼
 * - 등록 후: 텍스트 "완료", color:var(--text-hint), pointer-events:none
 *
 * 데이터:
 * - INSERT INTO records (user_id, target_id, target_type, status='checked')
 * - record_quality_xp = 0
 * - XP 팝업 없음
 */
```

#### `src/presentation/components/onboarding/bubble-create-step.tsx`

```typescript
/**
 * Step 2/3: 버블 생성 화면
 *
 * 레이아웃 (공통 온보딩 Step 구조):
 * - 상단 28%:
 *   - 타이틀: "내가 인정하는 미식가들끼리\n숨겨진 맛집을 공유해요."
 *   - 서브: "가족, 친구, 동료 —\n나만의 버블을 만들어보세요."
 * - 하단 72%:
 *   - 템플릿 카드 3개 (가족/친구/직장동료)
 *   - 초대하기 → 텍스트 버튼
 *   - sticky 하단: "세부 사항은 나중에 언제든 변경할 수 있어요."
 *
 * 템플릿 카드 (bubble-template):
 * - 아이콘 영역: 48×48px, border-radius:14px, bg:var(--bg-page)
 * - 가족: home 아이콘, color:#C17B5E, "우리 가족만의 맛집 지도"
 * - 친구: users 아이콘, color:#7A9BAE, "친구들과 찐맛집 공유"
 * - 직장동료: briefcase 아이콘, color:#C9A96E, "점심 맛집 같이 모으기"
 * - [추가] 버튼 → 탭 시 "완료"로 변경 + XP 팝업
 *
 * XP 팝업 (xp-popup.tsx):
 * - "+5 XP" 텍스트
 * - position:fixed, z-index:999, pointer-events:none
 * - 색상: var(--brand) = #FF6038
 * - 애니메이션: 0~40% translateY(0→-18px) scale(1→1.2) opacity:1
 *               40~100% translateY(-40px) scale(0.7) opacity:0
 * - duration: 0.9s ease, 종료 후 DOM 제거
 * - 위치: 버튼의 getBoundingClientRect() 기준 상단
 * - 모든 버블 추가 시 동일 팝업 표시 (실제 XP는 첫 번째만 +5)
 *
 * 초대하기 →:
 * - color:var(--accent-social) = #7A9BAE
 * - 탭 → 마지막 생성 버블의 invite_code로 딥링크 조립 → 클립보드 복사 → 토스트
 *
 * 데이터:
 * - INSERT bubbles: visibility='private', join_policy='invite_only', content_visibility='rating_and_comment'
 * - INSERT bubble_members: role='owner', status='active'
 * - 첫 버블: xp_histories INSERT (reason='first_bubble', xp_amount=5)
 */
```

#### `src/presentation/components/onboarding/bubble-explore-step.tsx`

```typescript
/**
 * Step 3/3: 버블 탐색 화면
 *
 * 레이아웃 (공통 온보딩 Step 구조):
 * - 상단 28%:
 *   - 타이틀: "경험을 쌓으면,\n맛잘알들의 세계가 열려요."
 *   - 서브: "레벨이 오를수록 더 많은 버블에\n들어가 모르는 맛잘알들과도\n맛집을 나눌 수 있어요."
 * - 하단 72%:
 *   - 탐색 카드 4개 (시드 버블)
 *   - sticky 하단: "내가 만든 버블은 가입 조건을 직접 설정해서,\n원하는 사람들과만 맛집을 공유할 수 있어요."
 *     → line-height:1.7 (다른 스텝의 1.5와 다름)
 *
 * 탐색 카드 (explore-card):
 * - 아이콘: 48×48px, border-radius:14px, bg:var(--bg-page)
 * - 이름: 15px, bold
 * - 메타: "멤버 N명 · N개 공유중" (12px, text-sub)
 * - 레벨 표시: "Lv.N 이상" (11px, text-hint, 우측 정렬)
 * - 탭 → 바텀시트 상세 팝업 열기
 *
 * 시드 버블 4개:
 * 1. 삼성전자 DX사업부 맛집 | building-2 | 23명/40 | 87개 | Lv.2 | private
 * 2. 클린식단 헬스맵 | dumbbell | 14명/25 | 53개 | Lv.3 | public
 * 3. 회식은 내가 잡는다 | beer | 19명/30 | 112개 | Lv.4 | public
 * 4. 서울 비건 맛집지도 | leaf | 27명/50 | 94개 | Lv.3 | public
 *
 * fab-forward → 온보딩 완료 처리 → 홈 이동
 */
```

#### `src/presentation/components/onboarding/bubble-explore-popup.tsx`

```typescript
/**
 * 버블 탐색 바텀시트 상세 팝업
 *
 * 트리거: explore-card 탭
 * 높이: max-height:75%
 * 오버레이: rgba(0,0,0,0.45), z-index:90
 * 시트: bg-elevated, border-radius:20px 20px 0 0
 * 애니메이션: slideUp 0.3s ease (translateY(100%)→0)
 * 닫기: 오버레이 탭 (시트 외부) 또는 X 버튼
 *
 * 구조:
 * - 핸들 (36×4px, border-bold, 중앙)
 * - 헤더: 아이콘(50×50) + 이름(17px, bold) + 설명(12px) + pill 태그 + X 닫기
 * - 통계 그리드 2×2: 시작일 / 가입자(여유자리) / 활성도(빈도) / 공유맛집
 * - 가입 조건 섹션 (shield-check 아이콘)
 *   - 관리자 승인 or 즉시 가입 (shield-check/zap)
 *   - 최소 기록 N개 이상 (check-circle)
 *   - 최소 Lv.N 이상 (check-circle)
 *   - 현재 N/M명 (users)
 * - 공개 범위 섹션 (eye 아이콘) — 고정 3행
 *   - 내 기록이 멤버에게 공개 (unlock, "선택한 기록만")
 *   - 프로필·레벨·뱃지 (unlock, "항상 공개")
 *   - 사분면·점수 상세 (lock, "비공개")
 *
 * 가입 액션:
 * - 온보딩에서는 미리보기만 (가입 버튼 없음)
 * - 신규 유저는 레벨 부족으로 가입 불가
 */
```

#### `src/presentation/containers/onboarding-container.tsx`

```typescript
/**
 * 온보딩 전체 플로우 컨테이너
 *
 * 역할:
 * - use-onboarding 훅으로 상태 관리
 * - 5개 스크린 전환 (login은 auth 처리 후 진입이므로 실제 4개)
 * - FAB 네비게이션 (Step 1~3에만)
 * - 스크린 전환 애니메이션 관리
 *
 * 스크린 배치:
 * - 모든 스크린을 position:absolute로 겹침
 * - 현재: translateX(0) .active
 * - 왼쪽 퇴장: translateX(-100%) .slide-out
 * - 오른쪽 대기: translateX(100%) .hidden
 * - transition: 0.35s cubic-bezier(0.4, 0, 0.2, 1)
 *
 * 뒤로가기:
 * - 현재 → slideOutRight (0→100%)
 * - 이전 → slideInLeft (-100%→0)
 * - duration: 0.3s forwards
 *
 * FAB:
 * - fab-back: left:16px, bottom:28px, 44×44px 원형
 *   → bg:rgba(248,246,243,0.88), backdrop-filter:blur(12px), border:1px solid var(--border)
 *   → chevron-left 아이콘 22×22px
 * - fab-forward: right:16px, bottom:28px, 44×44px 원형
 *   → bg:var(--accent-food), color:#fff, box-shadow:0 3px 16px rgba(193,123,94,0.4)
 *   → chevron-right 아이콘 22×22px
 * - :active → transform:scale(0.9), transition:0.15s
 *
 * 전환 후 처리:
 * - 350ms 후 이전 화면 → .hidden 클래스
 * - isTransitioning 플래그로 중복 전환 방지
 *
 * 온보딩 완료 플로우 (fab-forward on screen-explore):
 * 1. completeOnboarding() 호출
 * 2. users.onboarding_completed = true UPDATE
 * 3. 온보딩 완료 XP +10 적립
 * 4. router.replace('/') → 홈 이동
 */
```

### 5. 시드 데이터

#### `src/shared/constants/onboarding-seeds.ts`

```typescript
import type { OnboardingSeedRestaurant, OnboardingBubbleTemplate, OnboardingSeedBubble } from '@/domain/entities/onboarding';

/** 지역별 시드 식당 (SSOT: 12_ONBOARDING.md §4-4) */
export const SEED_RESTAURANTS: Record<string, OnboardingSeedRestaurant[]> = {
  '을지로': [
    { id: 'seed-euljiro-1', name: '을지면옥', genre: '한식', area: '을지로' },
    { id: 'seed-euljiro-2', name: '스시코우지', genre: '일식', area: '을지로' },
    { id: 'seed-euljiro-3', name: '을지다락', genre: '주점', area: '을지로' },
    { id: 'seed-euljiro-4', name: '을지OB맥주', genre: '한식', area: '을지로' },
  ],
  '광화문': [
    { id: 'seed-gwanghwa-1', name: '미진', genre: '한식', area: '광화문' },
    { id: 'seed-gwanghwa-2', name: '토속촌', genre: '한식', area: '광화문' },
    { id: 'seed-gwanghwa-3', name: '광화문국밥', genre: '한식', area: '광화문' },
  ],
  '성수': [
    { id: 'seed-seongsu-1', name: '레스토랑 오르되브르', genre: '양식', area: '성수' },
    { id: 'seed-seongsu-2', name: '카페 어니언', genre: '카페', area: '성수' },
    { id: 'seed-seongsu-3', name: '다운타우너', genre: '양식', area: '성수' },
  ],
  '강남': [
    { id: 'seed-gangnam-1', name: '도쿄등심', genre: '일식', area: '강남' },
    { id: 'seed-gangnam-2', name: '스시사이토', genre: '일식', area: '강남' },
    { id: 'seed-gangnam-3', name: '한신포차', genre: '한식', area: '강남' },
  ],
  '홍대': [
    { id: 'seed-hongdae-1', name: '피자알볼로', genre: '양식', area: '홍대' },
    { id: 'seed-hongdae-2', name: '비스트로 홍대', genre: '양식', area: '홍대' },
    { id: 'seed-hongdae-3', name: '옥동식', genre: '한식', area: '홍대' },
  ],
  '이태원': [
    { id: 'seed-itaewon-1', name: '포잉', genre: '아시안', area: '이태원' },
    { id: 'seed-itaewon-2', name: '레바논익스프레스', genre: '양식', area: '이태원' },
    { id: 'seed-itaewon-3', name: '그리디키친', genre: '양식', area: '이태원' },
  ],
};

/** 검색 전용 시드 (지역 리스트에 없는 추가 결과) */
export const SEED_SEARCH_ONLY: OnboardingSeedRestaurant[] = [
  { id: 'seed-search-1', name: '백종원의 역전우동', genre: '일식', area: '' },
  { id: 'seed-search-2', name: '스시효', genre: '일식', area: '' },
];

/** 버블 생성 템플릿 3종 (SSOT: 12_ONBOARDING.md §5-2) */
export const BUBBLE_TEMPLATES: OnboardingBubbleTemplate[] = [
  { name: '가족', icon: 'home', iconColor: 'var(--accent-food)', description: '우리 가족만의 맛집 지도' },
  { name: '친구', icon: 'users', iconColor: 'var(--accent-social)', description: '친구들과 찐맛집 공유' },
  { name: '직장동료', icon: 'briefcase', iconColor: 'var(--caution)', description: '점심 맛집 같이 모으기' },
];

/** 탐색 시드 버블 4종 (SSOT: 12_ONBOARDING.md §6-2) */
export const SEED_EXPLORE_BUBBLES: OnboardingSeedBubble[] = [
  {
    name: '삼성전자 DX사업부 맛집', icon: 'building-2', description: '수원·영통 점심 맛집 & 회식 장소 공유',
    memberCount: 23, maxMembers: 40, recordCount: 87, minLevel: 2,
    visibility: 'private', contentVisibility: 'rating_and_comment', joinPolicy: 'manual_approve',
    startDate: '2025.08', activityLabel: '매우 활발', recordFrequency: '1.5일마다',
  },
  {
    name: '클린식단 헬스맵', icon: 'dumbbell', description: '고단백 저지방 식단 맛집만 · 닭가슴살 말고 진짜 맛집',
    memberCount: 14, maxMembers: 25, recordCount: 53, minLevel: 3,
    visibility: 'public', contentVisibility: 'rating_and_comment', joinPolicy: 'auto_approve',
    startDate: '2025.10', activityLabel: '활발', recordFrequency: '2.4일마다',
  },
  {
    name: '회식은 내가 잡는다', icon: 'beer', description: '단체석·코스·2차까지 검증된 회식 맛집만',
    memberCount: 19, maxMembers: 30, recordCount: 112, minLevel: 4,
    visibility: 'public', contentVisibility: 'rating_and_comment', joinPolicy: 'auto_approve',
    startDate: '2025.05', activityLabel: '매우 활발', recordFrequency: '1.8일마다',
  },
  {
    name: '서울 비건 맛집지도', icon: 'leaf', description: '100% 비건 · 비건옵션 맛집 큐레이션',
    memberCount: 27, maxMembers: 50, recordCount: 94, minLevel: 3,
    visibility: 'public', contentVisibility: 'rating_and_comment', joinPolicy: 'auto_approve',
    startDate: '2025.04', activityLabel: '매우 활발', recordFrequency: '1.3일마다',
  },
];
```

### 6. DB 마이그레이션

#### `supabase/migrations/XXX_onboarding_completed.sql`

```sql
-- 온보딩 상태 관리 필드 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(20) DEFAULT NULL;
  -- onboarding_step: 'login'|'intro'|'record'|'bubble'|'explore'|NULL(완료)
  -- 중도 이탈 시 마지막 화면 저장, 재진입 시 복원

-- 시드 식당 INSERT (온보딩용)
-- 6 지역 × 3~4개 = 21개 + 검색 전용 2개 = 23개
-- UUID는 실제 생성 시 gen_random_uuid() 사용
-- 여기서는 구조만 정의, 실제 시드는 별도 migration으로

-- RLS: 온보딩 중에도 records, bubbles INSERT 가능하도록 기존 RLS 정책으로 충분
-- (user_id = auth.uid() 조건)
```

---

## 스크린별 네비게이션 경로 (최종 확인)

| 스크린 | fab-back 목적지 | fab-forward 목적지 | 비고 |
|--------|----------------|-------------------|------|
| screen-login | — (없음) | — (없음) | auth 처리 후 자동 전환 |
| screen-intro | — (없음) | — (없음) | "시작하기 →" 텍스트 CTA |
| screen-record | screen-intro | screen-bubble | Step 1 active |
| screen-bubble | screen-record | screen-explore | Step 2 active |
| screen-explore | screen-bubble | 홈 진입 (/) | Step 3 active |

---

## 0개 등록 시나리오

| 스텝 | 0개로 진행 시 결과 |
|------|-------------------|
| Step 1 (맛집 등록) | records에 아무것도 INSERT 안 함. 빈 홈으로 진입 |
| Step 2 (버블 생성) | bubbles에 아무것도 INSERT 안 함. 버블 목록 비어 있음 |
| Step 3 (버블 탐색) | 미리보기만이므로 0개 당연 |

---

## XP 적립 타이밍 정리

| 시점 | 트리거 | XP | xp_histories.reason |
|------|--------|-----|---------------------|
| Step 1 식당 등록 (개당) | 등록 버튼 탭 | 0 | — (기록 안 함) |
| Step 2 첫 버블 추가 | 첫 번째 [추가] 탭 | +5 | `'first_bubble'` |
| Step 2 추가 버블 | 2~3번째 [추가] 탭 | 0 | — (UI 팝업만 표시) |
| Step 3 → 홈 진입 | fab-forward 탭 | +10 | `'onboarding_complete'` |

온보딩 완료 시 최대 종합 XP: **15** (첫 버블 +5 + 완료 +10)

---

## 검증 체크리스트

```
□ 로그인 → 인트로 → Step 1 → Step 2 → Step 3 → 홈 전체 플로우 완주
□ 모든 스텝 0개 등록으로 끝까지 진행 가능
□ 스크린 전환 애니메이션 350ms 슬라이드 작동
□ FAB back/forward 정상 동작 (login/intro에는 FAB 없음)
□ 지역 드롭다운 6개 지역 전환 + 등록 상태 유지
□ 검색: 이름/장르 매칭 + fallback
□ 등록 → "완료" 텍스트 변경 + pointer-events:none
□ 버블 추가 시 "+5 XP" 팝업 애니메이션 (모든 추가에 동일)
□ 실제 XP: 첫 버블만 +5, 나머지 0
□ 초대하기 → 클립보드 복사 + 토스트
□ 탐색 카드 → 바텀시트 팝업 (75% 높이)
□ 바텀시트 오버레이/X 닫기
□ 온보딩 완료 시 users.onboarding_completed = true
□ 온보딩 완료 XP +10 적립
□ 중도 이탈 → 재진입 시 마지막 화면부터 재개
□ 온보딩 완료 유저 → /onboarding 접근 시 홈 리다이렉트
□ 온보딩 미완료 유저 → 다른 페이지 접근 시 /onboarding 리다이렉트
□ 지도에서 가져오기 버튼 → alert "출시 후 지원"
□ R1~R5 위반 없음
□ TypeScript strict, any/as any/@ts-ignore = 0
□ 360px 레이아웃 깨짐 없음
```
