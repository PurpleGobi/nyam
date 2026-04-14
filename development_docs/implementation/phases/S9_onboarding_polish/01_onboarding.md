# 9.1: 온보딩 — 기능 가이드 투어

> 신규 유저에게 Nyam의 핵심 기능 5가지를 시각적으로 안내하는 스와이프 기반 튜토리얼.
> 각 챕터는 "왜 이 기능이 중요한지" + "어떻게 쓰는지"를 2~4장의 카드로 설명한다.

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/12_ONBOARDING.md` | 전체 (이 문서가 SSOT — 기존 12_ONBOARDING.md도 함께 갱신 필요) |
| `systems/DESIGN_SYSTEM.md` | 온보딩 토큰, 프로그레스 바 |
| `systems/RATING_ENGINE.md` | 점수 시스템 (챕터 5 참조) |
| `systems/XP_SYSTEM.md` | §4-4 보너스 XP (온보딩 완료 +10) |
| `prototype/00_onboarding.html` | 인터랙티브 목업 (리디자인 필요) |

---

## 선행 조건

- S1: 인증 4종 + users 테이블 + RLS
- S2~S4: 기록/식당/와인 기능 구현 완료
- S5: 홈 (카드뷰/리스트뷰/지도뷰) 구현 완료
- S7: 버블 CRUD 구현 완료
- S8: 팔로우 시스템 구현 완료

---

## 설계 철학

### 기존 온보딩 (폐기)
- XP 적립 체험 중심 — 시드 식당 등록, 버블 템플릿 생성
- 문제: 유저가 "왜" 이걸 해야 하는지 모르고, 앱의 전체 그림을 볼 수 없었음

### 새 온보딩
- **기능 가이드 투어** — 앱의 핵심 기능 5가지를 시각적으로 빠르게 안내
- 각 기능의 **가치(Why)** → **사용법(How)** 순서로 설명
- 실제 앱 UI 스크린샷/일러스트를 활용한 시각적 설명
- 인터랙티브 액션 없음 — 읽고 넘기는 것만으로 완료
- 목표: **60초 이내에 앱의 전체 그림 파악**

---

## 구현 범위

### 파일 목록

```
# 신규/수정
src/domain/entities/onboarding.ts                          ← 리디자인
src/application/hooks/use-onboarding.ts                    ← 리디자인
src/presentation/components/onboarding/guide-card.tsx       ← 신규
src/presentation/components/onboarding/guide-progress.tsx   ← 신규 (기존 onboarding-progress 대체)
src/presentation/components/onboarding/chapter-intro.tsx    ← 신규
src/presentation/containers/onboarding-container.tsx        ← 리디자인
src/app/onboarding/page.tsx                                ← 유지
src/shared/constants/onboarding-guide.ts                   ← 신규 (기존 onboarding-seeds 대체)
supabase/migrations/XXX_onboarding_completed.sql           ← 유지

# 삭제
src/domain/services/onboarding-xp.ts                       ← 삭제
src/application/hooks/use-onboarding-restaurants.ts         ← 삭제
src/application/hooks/use-onboarding-bubbles.ts             ← 삭제
src/infrastructure/repositories/supabase-onboarding-repository.ts  ← 삭제 (DB 연산 불필요)
src/domain/repositories/onboarding-repository.ts           ← 삭제
src/presentation/components/onboarding/onboarding-intro.tsx         ← 삭제
src/presentation/components/onboarding/restaurant-register-step.tsx ← 삭제
src/presentation/components/onboarding/bubble-create-step.tsx       ← 삭제
src/presentation/components/onboarding/bubble-explore-step.tsx      ← 삭제
src/presentation/components/onboarding/bubble-explore-popup.tsx     ← 삭제
src/presentation/components/onboarding/xp-popup.tsx                 ← 삭제
src/presentation/components/onboarding/area-select.tsx              ← 삭제
src/presentation/components/onboarding/onboarding-search.tsx        ← 삭제
src/shared/constants/onboarding-seeds.ts                            ← 삭제
```

### DI 변경
- `shared/di/container.ts`에서 `onboardingRepo` 등록 제거

### 스코프 외
- 와인 기록 상세 설명 — 식당과 동일한 플로우이므로 별도 챕터 불필요
- 추천 알고리즘 상세 — 점수 시스템 챕터에서 개요만 설명
- 설정/알림 — 직관적이므로 온보딩 불필요

---

## 전체 구조

### 플로우

```
/auth/login → /onboarding → /
```

```
[인트로]
  ↓ "시작하기" 탭
[Chapter 1] 기록 남기기         — 3장
  ↓ 스와이프 또는 "다음" 탭
[Chapter 2] 지도로 탐색하기      — 3장
  ↓
[Chapter 3] 버블 활용하기        — 3장
  ↓
[Chapter 4] 팔로우와 소셜        — 2장
  ↓
[Chapter 5] 점수 시스템 이해하기  — 3장
  ↓ 마지막 장 "시작하기" CTA
[홈 /]
```

총 **14장 + 인트로 1장 = 15장**

### 라우팅

```
/onboarding          ← 단일 라우트, 내부 상태로 15장 전환
```

- `app/onboarding/page.tsx`는 `OnboardingContainer` 렌더링만
- 스크린 전환은 React 상태 기반 (`currentIndex: number`)
- URL 변경 없음

### 진입/이탈 조건

```typescript
// middleware.ts 또는 auth-provider에서
if (user.onboarding_completed === false) {
  redirect('/onboarding');
}

// 완료 유저가 /onboarding 접근 → / 리다이렉트
// 미완료 유저가 다른 페이지 접근 → /onboarding 리다이렉트
```

---

## 챕터별 상세 설계

### 인트로 (index: 0)

```
┌──────────────────────────────┐
│                              │
│                              │
│           nyam               │  ← Comfortaa 42px, brand gradient
│                              │
│   낯선 별점 천 개보다,         │  ← 14px, text-sub, center
│   믿을만한 한 명의 기록.       │
│                              │
│                              │
│       시작하기 →              │  ← 15px, bold, accent-food, 탭 시 Chapter 1로
│                              │
│                              │
└──────────────────────────────┘
```

- 프로그레스 바 없음
- FAB 없음
- "시작하기 →" 텍스트 버튼만

---

### Chapter 1: 기록 남기기 (index: 1~3)

**챕터 인트로 텍스트**: "내 미식 기록을 쌓아보세요"

#### 1-1. 식당/와인 찾기 (index: 1)

```
┌──────────────────────────────┐
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━  │  ← 프로그레스 (1/14)
│  ① 기록 남기기                │  ← 챕터 번호 + 제목 (accent-food)
├──────────────────────────────┤
│                              │
│    ┌────────────────────┐    │
│    │                    │    │
│    │  [일러스트/스크린샷] │    │  ← 홈 FAB 열린 상태
│    │  카메라 / 앨범 /    │    │    + 3가지 메뉴 하이라이트
│    │  위치 목록          │    │
│    │                    │    │
│    └────────────────────┘    │
│                              │
│  📷 사진 촬영, 앨범 선택,     │  ← 16px, bold, text
│  또는 위치 기반 목록에서       │
│  식당이나 와인을 찾아보세요.   │  ← 13px, text-sub
│                              │
│                              │
│ (◀)                    (▶)   │  ← FAB back/forward
└──────────────────────────────┘
```

**핵심 메시지**: 기록을 시작하는 3가지 방법
**비주얼**: 홈 화면 FAB이 열린 상태 — 카메라/앨범/위치 검색 3개 메뉴

#### 1-2. 사진 등록과 한줄평 (index: 2)

**핵심 메시지**: 사진 한 장 + 한줄평이면 충분
**비주얼**: 기록 등록 화면 — 사진 영역 + 한줄평 입력 + 공개/비공개 토글
**설명 텍스트**:
- 타이틀: "사진 한 장과 한줄평으로\n기록을 남겨보세요."
- 서브: "사진 공개/비공개를 선택할 수 있어요.\n비공개 사진은 나만 볼 수 있습니다."

#### 1-3. 카드뷰/리스트뷰 필터 (index: 3)

**핵심 메시지**: 쌓인 기록을 다양한 필터로 탐색
**비주얼**: 홈 카드뷰 + 필터 칩 활성화 상태
**설명 텍스트**:
- 타이틀: "기록이 쌓이면,\n나만의 맛집 지도가 완성돼요."
- 서브: "장르, 지역, 점수별로 필터링하고\n카드뷰와 리스트뷰를 전환할 수 있어요."

---

### Chapter 2: 지도로 탐색하기 (index: 4~6)

**챕터 인트로 텍스트**: "지도 위에서 맛집을 찾아보세요"

#### 2-1. 지도에서 식당 검색 (index: 4)

**핵심 메시지**: 지도를 이동하면 주변 식당이 자동으로 나타남
**비주얼**: 지도뷰 — 마커 여러 개 + "이 지역 검색" 배지
**설명 텍스트**:
- 타이틀: "지도를 움직이면,\n주변 맛집이 나타나요."
- 서브: "내 기록, 버블 공유, Nyam 추천 맛집이\n한 지도에 모여 있어요."

#### 2-2. 지도 필터 활용 (index: 5)

**핵심 메시지**: 장르/지역/점수 필터로 원하는 식당만
**비주얼**: 지도뷰 + 필터 바 열린 상태
**설명 텍스트**:
- 타이틀: "필터로 원하는 맛집만\n골라볼 수 있어요."
- 서브: "장르, 평점, 데이터 소스별로\n지도 위 결과를 좁혀보세요."

#### 2-3. 지도 검색 (index: 6)

**핵심 메시지**: 이름으로 직접 검색
**비주얼**: 지도뷰 상단 검색바 + 자동완성 결과
**설명 텍스트**:
- 타이틀: "식당 이름을 검색하면\n바로 찾아갈 수 있어요."
- 서브: "검색 결과를 탭하면\n해당 위치로 지도가 이동합니다."

---

### Chapter 3: 버블 활용하기 (index: 7~9)

**챕터 인트로 텍스트**: "믿을 수 있는 사람들과 맛집을 나눠요"

#### 3-1. 버블 만들기 (index: 7)

**핵심 메시지**: 가족, 친구, 동료 — 나만의 맛집 그룹
**비주얼**: 버블 생성 화면 — 이름/아이콘/설정
**설명 텍스트**:
- 타이틀: "가족, 친구, 동료와\n맛집 버블을 만들어보세요."
- 서브: "버블은 믿을 수 있는 사람들끼리\n맛집을 공유하는 비공개 그룹이에요."

#### 3-2. 버블에 맛집 등록하기 (index: 8)

**핵심 메시지**: 내 기록을 버블에 공유하는 방법
**비주얼**: 홈 FAB → "버블에 추가" → BubblePickerSheet
**설명 텍스트**:
- 타이틀: "내 맛집 기록을\n버블에 공유할 수 있어요."
- 서브: "홈 화면에서 맛집을 선택하고\n원하는 버블에 추가하세요."

#### 3-3. 버블 찾기와 가입 (index: 9)

**핵심 메시지**: 공개 버블 탐색 + 초대 링크로 가입
**비주얼**: 버블 탐색 리스트 + 가입 버튼
**설명 텍스트**:
- 타이틀: "다른 맛잘알들의 버블을\n찾아 가입할 수도 있어요."
- 서브: "공개 버블은 탐색에서 찾을 수 있고,\n비공개 버블은 초대 링크로 가입해요."

---

### Chapter 4: 팔로우와 소셜 (index: 10~11)

**챕터 인트로 텍스트**: "맛잘알을 팔로우하세요"

#### 4-1. 미니 프로필에서 팔로우 (index: 10)

**핵심 메시지**: 다른 사람의 기록에서 바로 팔로우
**비주얼**: 식당 상세 → 다른 사용자 기록 카드 → 미니 프로필 팝업 + 팔로우 버튼
**설명 텍스트**:
- 타이틀: "마음에 드는 기록을 남긴\n사람을 팔로우해보세요."
- 서브: "기록 카드를 탭하면 미니 프로필이 뜨고,\n바로 팔로우할 수 있어요."

#### 4-2. 팔로우 관리 (index: 11)

**핵심 메시지**: 설정에서 팔로워/팔로잉 관리
**비주얼**: 설정 → 팔로워/팔로잉 페이지 — 탭 전환 + 검색
**설명 텍스트**:
- 타이틀: "팔로잉과 팔로워를\n한 곳에서 관리하세요."
- 서브: "프로필 설정에서 팔로우 목록을 확인하고\n검색으로 새로운 사람을 찾을 수 있어요."

---

### Chapter 5: 점수 시스템 이해하기 (index: 12~14)

**챕터 인트로 텍스트**: "Nyam의 점수는 조금 다릅니다"

#### 5-1. 점수 우선순위 (index: 12)

**핵심 메시지**: 내 점수 > 버블 점수 > Nyam 점수
**비주얼**: 점수 뱃지 3종 — 내 점수(강조), 버블 점수, Nyam 점수 순서
**설명 텍스트**:
- 타이틀: "가장 믿을 수 있는 점수는\n내가 직접 매긴 점수예요."
- 서브: "내 점수가 없으면 내 버블 멤버들의 점수,\n그것도 없으면 Nyam 전체 점수를 보여줘요.\n가까운 사람의 판단일수록 더 믿을 수 있으니까요."

#### 5-2. Nyam 점수 산출 방식 (index: 13)

**핵심 메시지**: 단순 평균이 아닌 — 신뢰도·적합도·확신도
**비주얼**: 점수 카드 + 신뢰도/적합도/확신도 3개 지표 시각화
**설명 텍스트**:
- 타이틀: "Nyam 점수는\n단순 평균이 아니에요."
- 서브: "데이터 신뢰도 — 얼마나 많은 기록이 있는지\n적합도 — 나와 취향이 얼마나 비슷한지\n확신도 — 이 점수를 얼마나 믿을 수 있는지"

#### 5-3. 점수 활용하기 (index: 14)

**핵심 메시지**: 확신도 높은 사용자를 찾는 방법
**비주얼**: 버블 멤버 목록 + 레벨 뱃지 + 검색
**설명 텍스트**:
- 타이틀: "확신도 높은 맛잘알을\n찾는 방법이 있어요."
- 서브: "버블 멤버 중 레벨이 높은 사람의 기록을 보거나,\n직접 검색해서 팔로우하세요.\n기록이 많을수록 점수의 확신도가 올라갑니다."

---

## 공통 UI 설계

### 화면 레이아웃 (가이드 카드)

```
┌──────────────────────────────┐
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━  │  ← 프로그레스 바 (14칸, 챕터별 색상 구분)
│  ① 챕터 제목                  │  ← 챕터 번호 + 제목 (작은 텍스트)
├──────────────────────────────┤
│                              │
│    ┌────────────────────┐    │
│    │                    │    │  ← 일러스트/스크린샷 영역
│    │    비주얼 영역       │    │     max-height: 45vh
│    │    (스크린샷 or      │    │     border-radius: 16px
│    │     일러스트)        │    │     object-fit: contain
│    │                    │    │
│    └────────────────────┘    │
│                              │
│  타이틀 텍스트                 │  ← 22px, bold, text, line-height: 1.5
│  (2줄 이내)                   │
│                              │
│  서브 텍스트                   │  ← 13px, text-sub, line-height: 1.8
│  (3줄 이내)                   │
│                              │
│ (◀)                    (▶)   │  ← FAB back/forward (인트로 제외)
└──────────────────────────────┘
```

### 프로그레스 바

```
[챕터1 ][챕터1 ][챕터1 ][챕터2 ][챕터2 ][챕터2 ][챕터3 ][챕터3 ][챕터3 ][챕터4 ][챕터4 ][챕터5 ][챕터5 ][챕터5 ]
```

- 14칸 (각 가이드 카드 1칸)
- display:flex, gap:3px
- 각 바: flex:1, height:3px, border-radius:2px
- 상태별:
  - **current**: `background:var(--accent-food)`, `opacity:1`
  - **done**: `background:var(--accent-food)`, `opacity:0.35`
  - **pending**: `background:var(--border)`
- 같은 챕터의 바들은 시각적으로 그룹핑 (gap:3px 내부, 챕터 간 gap:6px)

### 챕터 번호 + 제목

- 프로그레스 바 아래, 좌측 정렬
- 형식: `① 기록 남기기` (circled number + 제목)
- 스타일: 12px, font-weight:600, color:var(--accent-food), letter-spacing:0.5px
- 챕터가 변경될 때만 업데이트 (같은 챕터 내 스와이프에서는 유지)

### FAB 네비게이션

기존 온보딩과 동일 스타일 유지:

| 요소 | 위치 | 크기 | 스타일 |
|------|------|------|--------|
| fab-back | left:16px, bottom:28px | 44×44px 원형 | bg:rgba(248,246,243,0.88), backdrop-filter:blur(12px), border:1px solid var(--border) |
| fab-forward | right:16px, bottom:28px | 44×44px 원형 | bg:var(--accent-food), color:#fff, box-shadow:0 3px 16px rgba(193,123,94,0.4) |

- 인트로(index:0)에서는 FAB 없음
- index:0에서 fab-back 없음
- 마지막 카드(index:14)에서 fab-forward → 홈 이동 (onComplete)

### 마지막 카드 CTA

index:14 (5-3. 점수 활용하기)의 하단에 추가 CTA:

```
┌──────────────────────────────┐
│  (... 5-3 카드 내용 ...)       │
│                              │
│  ┌──────────────────────────┐│
│  │     Nyam 시작하기          ││  ← btn-primary, accent-food
│  └──────────────────────────┘│
│                              │
│ (◀)                          │  ← fab-forward 대신 CTA 버튼
└──────────────────────────────┘
```

- 버튼 스타일: width:100%, padding:14px, border-radius:12px, bg:var(--accent-food), color:#fff
- 탭 → `completeOnboarding()` → 홈 이동

### 스와이프 제스처

- 좌→우 스와이프: 이전 카드 (goBack)
- 우→좌 스와이프: 다음 카드 (goForward)
- threshold: 50px (50px 미만 이동은 원위치 snap)
- 전환 애니메이션: translateX, 300ms cubic-bezier(0.4, 0, 0.2, 1)

### "건너뛰기" 텍스트 링크

- 위치: 프로그레스 바 우측 (같은 줄)
- 스타일: 12px, color:var(--text-hint), text-decoration:none
- 탭 → completeOnboarding() → 홈 이동
- 모든 가이드 카드에서 노출 (인트로 제외)

---

## 상세 구현 지침

### 1. Domain Layer

#### `src/domain/entities/onboarding.ts`

```typescript
export interface OnboardingGuideCard {
  id: string;                    // 'ch1-1', 'ch1-2', ...
  chapter: number;               // 1~5
  chapterTitle: string;          // '기록 남기기'
  title: string;                 // 카드 타이틀 (2줄 이내, \n 포함)
  subtitle: string;              // 카드 서브텍스트 (3줄 이내, \n 포함)
  visualType: 'screenshot' | 'illustration';
  visualSrc: string;             // public/onboarding/ 내 이미지 경로
  visualAlt: string;             // 접근성 alt 텍스트
}

export interface OnboardingState {
  currentIndex: number;          // 0 (인트로) ~ 14 (마지막 카드)
  totalCards: number;            // 14 (인트로 제외)
  completed: boolean;
}

export const ONBOARDING_CHAPTERS = [
  { number: 1, title: '기록 남기기', cardCount: 3 },
  { number: 2, title: '지도로 탐색하기', cardCount: 3 },
  { number: 3, title: '버블 활용하기', cardCount: 3 },
  { number: 4, title: '팔로우와 소셜', cardCount: 2 },
  { number: 5, title: '점수 시스템 이해하기', cardCount: 3 },
] as const;
```

### 2. Application Layer

#### `src/application/hooks/use-onboarding.ts`

```typescript
/**
 * 온보딩 가이드 투어 관리 훅
 *
 * 상태:
 * - currentIndex: number (0=인트로, 1~14=가이드 카드)
 * - direction: 'forward' | 'backward' (애니메이션 방향)
 * - isTransitioning: boolean (전환 중 중복 방지)
 *
 * 액션:
 * - goForward(): 다음 카드 (index+1, 마지막이면 completeOnboarding)
 * - goBack(): 이전 카드 (index-1, 인트로에서는 무시)
 * - goToIndex(n): 특정 인덱스로 이동
 * - skip(): 즉시 completeOnboarding
 * - completeOnboarding(): onboarding_completed=true + 완료 XP +10 + router.replace('/')
 *
 * 스와이프:
 * - touchStart/touchEnd 좌표로 방향 판별
 * - threshold 50px 이상만 전환
 *
 * 중도 이탈:
 * - 서버 저장 없음 (가이드 투어이므로 처음부터 다시 봐도 무방)
 * - 재진입 시 인트로부터 시작
 */
```

### 3. Presentation Layer

#### `src/presentation/components/onboarding/guide-card.tsx`

```typescript
/**
 * 가이드 카드 (1장)
 *
 * Props:
 * - card: OnboardingGuideCard
 * - isActive: boolean (현재 표시 중)
 * - isLast: boolean (마지막 카드 — CTA 버튼 표시)
 * - onComplete: () => void (마지막 CTA 탭)
 *
 * 레이아웃:
 * - flex:1, display:flex, flex-direction:column, padding:0 28px
 * - 비주얼 영역: max-height:45vh, border-radius:16px, overflow:hidden
 *   - img: width:100%, object-fit:contain, bg:var(--bg-elevated)
 * - 타이틀: margin-top:24px, 22px, bold, line-height:1.5
 * - 서브: margin-top:12px, 13px, text-sub, line-height:1.8
 * - 마지막 카드: 서브 아래에 CTA 버튼 (margin-top:24px)
 */
```

#### `src/presentation/components/onboarding/guide-progress.tsx`

```typescript
/**
 * 프로그레스 바 + 챕터 제목 + 건너뛰기
 *
 * Props:
 * - currentIndex: number (1~14, 인트로에서는 렌더링 안 함)
 * - totalCards: number (14)
 * - chapters: typeof ONBOARDING_CHAPTERS
 * - onSkip: () => void
 *
 * 레이아웃:
 * - padding: 54px 28px 0
 * - 프로그레스 바 행: display:flex, gap:3px, 챕터 간 gap:6px
 * - 아래 행: flex, justify-content:space-between
 *   - 좌: "① 기록 남기기" (챕터 번호+제목)
 *   - 우: "건너뛰기" 텍스트 링크
 */
```

#### `src/presentation/containers/onboarding-container.tsx`

```typescript
/**
 * 온보딩 가이드 투어 컨테이너
 *
 * 역할:
 * - use-onboarding 훅으로 상태 관리
 * - 15장 (인트로 1 + 가이드 14) 스와이프 전환
 * - FAB 네비게이션 (인트로 제외)
 * - 스와이프 제스처 핸들링
 * - 전환 애니메이션 관리
 *
 * 렌더링:
 * - index === 0: 인트로 화면 (로고 + 헤드라인 + CTA)
 * - index >= 1: GuideProgress + GuideCard
 *
 * 전환:
 * - 모든 카드를 position:absolute로 겹침
 * - 현재: translateX(0)
 * - forward 퇴장: translateX(-100%)
 * - backward 퇴장: translateX(100%)
 * - transition: 300ms cubic-bezier(0.4, 0, 0.2, 1)
 *
 * 스와이프:
 * - onTouchStart: startX 저장
 * - onTouchEnd: deltaX 계산 → |deltaX| > 50px 이면 전환
 *   - deltaX < -50: goForward (우→좌)
 *   - deltaX > 50: goBack (좌→우)
 *
 * 온보딩 완료:
 * 1. users.onboarding_completed = true UPDATE
 * 2. 온보딩 완료 XP +10 적립
 * 3. router.replace('/') → 홈 이동
 */
```

### 4. 가이드 데이터

#### `src/shared/constants/onboarding-guide.ts`

```typescript
import type { OnboardingGuideCard } from '@/domain/entities/onboarding';

export const ONBOARDING_GUIDE_CARDS: OnboardingGuideCard[] = [
  // Chapter 1: 기록 남기기
  {
    id: 'ch1-1',
    chapter: 1,
    chapterTitle: '기록 남기기',
    title: '사진 촬영, 앨범 선택,\n또는 위치 기반 검색으로 시작하세요.',
    subtitle: '홈 화면의 + 버튼을 누르면\n세 가지 방법으로 기록을 시작할 수 있어요.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch1-record-start.png',
    visualAlt: '홈 FAB 메뉴 - 카메라, 앨범, 위치 검색',
  },
  {
    id: 'ch1-2',
    chapter: 1,
    chapterTitle: '기록 남기기',
    title: '사진 한 장과 한줄평으로\n기록을 남겨보세요.',
    subtitle: '사진 공개/비공개를 선택할 수 있어요.\n비공개 사진은 나만 볼 수 있습니다.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch1-record-write.png',
    visualAlt: '기록 작성 화면 - 사진, 한줄평, 공개설정',
  },
  {
    id: 'ch1-3',
    chapter: 1,
    chapterTitle: '기록 남기기',
    title: '기록이 쌓이면,\n나만의 맛집 지도가 완성돼요.',
    subtitle: '장르, 지역, 점수별로 필터링하고\n카드뷰와 리스트뷰를 전환할 수 있어요.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch1-home-filter.png',
    visualAlt: '홈 카드뷰 필터 활성화 상태',
  },

  // Chapter 2: 지도로 탐색하기
  {
    id: 'ch2-1',
    chapter: 2,
    chapterTitle: '지도로 탐색하기',
    title: '지도를 움직이면,\n주변 맛집이 나타나요.',
    subtitle: '내 기록, 버블 공유, Nyam 추천 맛집이\n한 지도에 모여 있어요.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch2-map-browse.png',
    visualAlt: '지도뷰 마커와 검색 배지',
  },
  {
    id: 'ch2-2',
    chapter: 2,
    chapterTitle: '지도로 탐색하기',
    title: '필터로 원하는 맛집만\n골라볼 수 있어요.',
    subtitle: '장르, 평점, 데이터 소스별로\n지도 위 결과를 좁혀보세요.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch2-map-filter.png',
    visualAlt: '지도뷰 필터 바 열린 상태',
  },
  {
    id: 'ch2-3',
    chapter: 2,
    chapterTitle: '지도로 탐색하기',
    title: '식당 이름을 검색하면\n바로 찾아갈 수 있어요.',
    subtitle: '검색 결과를 탭하면\n해당 위치로 지도가 이동합니다.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch2-map-search.png',
    visualAlt: '지도뷰 검색바와 자동완성',
  },

  // Chapter 3: 버블 활용하기
  {
    id: 'ch3-1',
    chapter: 3,
    chapterTitle: '버블 활용하기',
    title: '가족, 친구, 동료와\n맛집 버블을 만들어보세요.',
    subtitle: '버블은 믿을 수 있는 사람들끼리\n맛집을 공유하는 비공개 그룹이에요.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch3-bubble-create.png',
    visualAlt: '버블 생성 화면',
  },
  {
    id: 'ch3-2',
    chapter: 3,
    chapterTitle: '버블 활용하기',
    title: '내 맛집 기록을\n버블에 공유할 수 있어요.',
    subtitle: '홈 화면에서 맛집을 선택하고\n원하는 버블에 추가하세요.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch3-bubble-add.png',
    visualAlt: '버블에 맛집 추가 - BubblePickerSheet',
  },
  {
    id: 'ch3-3',
    chapter: 3,
    chapterTitle: '버블 활용하기',
    title: '다른 맛잘알들의 버블을\n찾아 가입할 수도 있어요.',
    subtitle: '공개 버블은 탐색에서 찾을 수 있고,\n비공개 버블은 초대 링크로 가입해요.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch3-bubble-explore.png',
    visualAlt: '버블 탐색 리스트와 가입 버튼',
  },

  // Chapter 4: 팔로우와 소셜
  {
    id: 'ch4-1',
    chapter: 4,
    chapterTitle: '팔로우와 소셜',
    title: '마음에 드는 기록을 남긴\n사람을 팔로우해보세요.',
    subtitle: '기록 카드를 탭하면 미니 프로필이 뜨고,\n바로 팔로우할 수 있어요.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch4-mini-profile.png',
    visualAlt: '미니 프로필 팝업과 팔로우 버튼',
  },
  {
    id: 'ch4-2',
    chapter: 4,
    chapterTitle: '팔로우와 소셜',
    title: '팔로잉과 팔로워를\n한 곳에서 관리하세요.',
    subtitle: '프로필 설정에서 팔로우 목록을 확인하고\n검색으로 새로운 사람을 찾을 수 있어요.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch4-follow-manage.png',
    visualAlt: '팔로워/팔로잉 관리 페이지',
  },

  // Chapter 5: 점수 시스템 이해하기
  {
    id: 'ch5-1',
    chapter: 5,
    chapterTitle: '점수 시스템 이해하기',
    title: '가장 믿을 수 있는 점수는\n내가 직접 매긴 점수예요.',
    subtitle: '내 점수가 없으면 내 버블 멤버들의 점수,\n그것도 없으면 Nyam 전체 점수를 보여줘요.\n가까운 사람의 판단일수록 더 믿을 수 있으니까요.',
    visualType: 'illustration',
    visualSrc: '/onboarding/ch5-score-priority.png',
    visualAlt: '점수 우선순위 - 내 점수 > 버블 점수 > Nyam 점수',
  },
  {
    id: 'ch5-2',
    chapter: 5,
    chapterTitle: '점수 시스템 이해하기',
    title: 'Nyam 점수는\n단순 평균이 아니에요.',
    subtitle: '데이터 신뢰도 — 얼마나 많은 기록이 있는지\n적합도 — 나와 취향이 얼마나 비슷한지\n확신도 — 이 점수를 얼마나 믿을 수 있는지',
    visualType: 'illustration',
    visualSrc: '/onboarding/ch5-score-factors.png',
    visualAlt: '신뢰도, 적합도, 확신도 3개 지표',
  },
  {
    id: 'ch5-3',
    chapter: 5,
    chapterTitle: '점수 시스템 이해하기',
    title: '확신도 높은 맛잘알을\n찾는 방법이 있어요.',
    subtitle: '버블 멤버 중 레벨이 높은 사람의 기록을 보거나,\n직접 검색해서 팔로우하세요.\n기록이 많을수록 점수의 확신도가 올라갑니다.',
    visualType: 'screenshot',
    visualSrc: '/onboarding/ch5-find-expert.png',
    visualAlt: '버블 멤버 레벨 뱃지와 검색',
  },
];
```

### 5. DB 마이그레이션

#### `supabase/migrations/XXX_onboarding_completed.sql`

```sql
-- 온보딩 완료 플래그 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- onboarding_step 컬럼은 불필요 (가이드 투어는 중도 이탈 저장 없음)

-- 기존 유저는 온보딩 완료로 처리
UPDATE users SET onboarding_completed = true WHERE created_at < NOW();
```

### 6. 비주얼 에셋

```
public/onboarding/
├── ch1-record-start.png      ← 홈 FAB 열린 상태 스크린샷
├── ch1-record-write.png      ← 기록 작성 화면 스크린샷
├── ch1-home-filter.png       ← 홈 카드뷰 + 필터 활성화
├── ch2-map-browse.png        ← 지도뷰 마커들
├── ch2-map-filter.png        ← 지도뷰 필터 바
├── ch2-map-search.png        ← 지도뷰 검색
├── ch3-bubble-create.png     ← 버블 생성
├── ch3-bubble-add.png        ← 버블에 맛집 추가
├── ch3-bubble-explore.png    ← 버블 탐색/가입
├── ch4-mini-profile.png      ← 미니 프로필 팝업
├── ch4-follow-manage.png     ← 팔로워/팔로잉 페이지
├── ch5-score-priority.png    ← 점수 우선순위 일러스트
├── ch5-score-factors.png     ← 신뢰도/적합도/확신도 일러스트
└── ch5-find-expert.png       ← 맛잘알 찾기
```

- 스크린샷: 실제 앱 UI를 360px 뷰포트에서 캡처 → 모서리 라운딩 + 그림자 처리
- 일러스트 (ch5): 점수 시스템은 추상적이므로 다이어그램/인포그래픽으로 제작
- 포맷: PNG, 2x 해상도 (720px 너비), WebP 변환 권장
- 용량: 각 이미지 100KB 이하 목표

---

## XP 적립

| 시점 | XP | xp_histories.reason |
|------|-----|---------------------|
| 온보딩 완료 (마지막 CTA 또는 건너뛰기) | +10 | `'onboarding_complete'` |

- 기존 대비 단순화: 식당 등록 XP(0), 버블 생성 XP(+5) 제거
- 온보딩 완료 보너스 +10만 유지

---

## 네비게이션 경로 (최종)

| index | 카드 | fab-back | fab-forward | 비고 |
|-------|------|----------|-------------|------|
| 0 | 인트로 | — | — | "시작하기 →" 텍스트 CTA |
| 1~13 | 가이드 카드 | index-1 | index+1 | 프로그레스 바 + 건너뛰기 |
| 14 | 마지막 카드 (5-3) | index-1 | — | "Nyam 시작하기" CTA 버튼 |

---

## 검증 체크리스트

```
□ 인트로 → 14장 가이드 → 홈 전체 플로우 완주
□ "건너뛰기" 탭 → 즉시 홈 진입 (어느 카드에서든)
□ 스와이프 좌→우 (뒤로), 우→좌 (앞으로) 정상 동작
□ FAB back/forward 정상 동작 (인트로에는 없음)
□ 프로그레스 바 14칸 — 현재/완료/대기 스타일 구분
□ 챕터 전환 시 챕터 제목 업데이트
□ 전환 애니메이션 300ms 슬라이드
□ 마지막 카드 "Nyam 시작하기" CTA → onboarding_completed=true + XP +10 + 홈 이동
□ 온보딩 완료 유저 → /onboarding 접근 시 홈 리다이렉트
□ 온보딩 미완료 유저 → 다른 페이지 접근 시 /onboarding 리다이렉트
□ 비주얼 이미지 14장 모두 로드 확인
□ 360px 뷰포트 레이아웃 깨짐 없음
□ R1~R5 위반 없음
□ TypeScript strict, any/as any/@ts-ignore = 0
```
