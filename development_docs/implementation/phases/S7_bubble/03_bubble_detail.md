# S7-T3: 버블 상세 (피드/랭킹/멤버)

> 버블 상세 페이지 전체: 히어로, 3탭(피드/랭킹/멤버), 뷰모드 전환, 필터/소팅, 버블 목록 페이지.

---

## SSOT 출처

| 문서 | 참조 범위 |
|------|----------|
| `pages/08_BUBBLE.md` §11 | 버블 목록 페이지 (/bubbles) — 버블 탭, 버블러 탭, 탐색 시트 |
| `pages/08_BUBBLE.md` §12 | 버블 상세 (/bubbles/[id]) — 히어로, 피드, 랭킹, 멤버, 정보 시트 |
| `pages/08_BUBBLE.md` §13 | 버블러 프로필 (/bubbles/[id]/members/[userId]) |
| `pages/08_BUBBLE.md` §14 | 홈화면 버블 피드 |
| `systems/DESIGN_SYSTEM.md` | Notion 스타일 필터, 페이저, 스티키 탭 |
| `prototype/04_bubbles.html` | 버블 목록 목업 |
| `prototype/04_bubbles_detail.html` | 버블 상세 목업 (피드/랭킹/멤버) |
| `prototype/04_bubbler_profile.html` | 버블러 프로필 목업 |

---

## 선행 조건

- T7.1 완료: 모든 bubble 관련 엔티티, repository
- T7.2 완료: 가입/초대 플로우 (히어로의 초대 버튼 연동)

---

## 구현 범위

### 파일 목록

| 레이어 | 파일 | 설명 |
|--------|------|------|
| application | `src/application/hooks/use-bubble-detail.ts` | 버블 상세 데이터 로딩 |
| application | `src/application/hooks/use-bubble-feed.ts` | 피드 탭 데이터 (필터/소팅/페이지네이션) |
| application | `src/application/hooks/use-bubble-ranking.ts` | 랭킹 탭 데이터 |
| application | `src/application/hooks/use-bubble-members.ts` | 멤버 탭 데이터 |
| application | `src/application/hooks/use-bubble-list.ts` | 버블 목록 페이지 데이터 |
| presentation/components | `src/presentation/components/bubble/bubble-hero.tsx` | 히어로 섹션 |
| presentation/components | `src/presentation/components/bubble/bubble-quick-stats.tsx` | 퀵 통계 4칩 |
| presentation/components | `src/presentation/components/bubble/bubble-info-sheet.tsx` | 정보 바텀 시트 (ℹ️) |
| presentation/components | `src/presentation/components/bubble/feed-card.tsx` | 피드 카드 뷰 |
| presentation/components | `src/presentation/components/bubble/feed-compact.tsx` | 피드 컴팩트 뷰 |
| presentation/components | `src/presentation/components/bubble/ranking-podium.tsx` | 랭킹 포디움 (Top 3) |
| presentation/components | `src/presentation/components/bubble/ranking-list.tsx` | 랭킹 리스트 (4위~) |
| presentation/components | `src/presentation/components/bubble/member-grid.tsx` | 멤버 그리드 (2열) |
| presentation/components | `src/presentation/components/bubble/member-list-view.tsx` | 멤버 리스트 뷰 |
| presentation/components | `src/presentation/components/bubble/bubble-card.tsx` | 버블 목록 카드 |
| presentation/containers | `src/presentation/containers/bubble-list-container.tsx` | 버블 목록 |
| presentation/containers | `src/presentation/containers/bubble-detail-container.tsx` | 버블 상세 |
| presentation/containers | `src/presentation/containers/bubbler-profile-container.tsx` | 버블러 프로필 |
| app | `src/app/(main)/bubbles/page.tsx` | 버블 목록 라우트 |
| app | `src/app/(main)/bubbles/[id]/page.tsx` | 버블 상세 라우트 |
| app | `src/app/(main)/bubbles/[id]/members/[userId]/page.tsx` | 버블러 프로필 라우트 |
| app | `src/app/(main)/bubbles/invite/[code]/page.tsx` | 초대 링크 라우트 |

### 스코프 외

- 댓글/리액션 UI (→ 04_comments_reactions.md)
- 설정 페이지 (→ 05_roles.md)
- 랭킹 크론 (→ 06_ranking_cron.md)
- 버블러 프로필의 취향 비교 기능 (S8 follow/맞팔과 함께)

---

## 상세 구현 지침

### 1. 라우트 구조

```
/bubbles                              → 버블 목록 (버블 탭 / 버블러 탭)
/bubbles/[id]                         → 버블 상세 (피드 / 랭킹 / 멤버)
/bubbles/[id]/members/[userId]        → 버블러 프로필
/bubbles/invite/[code]                → 초대 링크 → 버블 미리보기 → 가입
```

### 2. 버블 목록 페이지 (/bubbles)

**목업 참조**: `04_bubbles.html`

**레이아웃** (위→아래):

```
┌─────────────────────────────────┐
│ nyam    bubbles   🔔  👤       │ ← 앱 헤더 (S5에서 구축)
├─────────────────────────────────┤
│ 🔔 직장 맛집에 새 피드가...      │ ← 알림 배너 (4초 후 축소)
├─────────────────────────────────┤
│ [버블] [버블러]  🧭 📊 ↕️ 🔍   │ ← 콘텐츠 탭 + 우측 아이콘 (탐색/필터/정렬/검색)
├─────────────────────────────────┤
│ [전체(5)] [운영(2)] [가입(3)]   │ ← 필터칩 (역할 기준)
├─────────────────────────────────┤
│ ┌─ 버블 카드 ─────────────────┐│
│ │ 🍴  직장 맛집               ││ ← 40×40 아이콘 + 이름
│ │     멤버 8명 · 기록 47개    ││ ← 메타
│ │     mine                    ││ ← 역할 표시
│ └─────────────────────────────┘│
│ ... (10개/페이지)               │
│ < 1 / 3 >                      │ ← 인라인 페이저
├─────────────────────────────────┤
│                         [+ FAB] │ ← 버블 만들기
└─────────────────────────────────┘
```

#### `bubble-card.tsx`

```typescript
interface BubbleCardProps {
  bubble: Bubble;
  role: 'mine' | 'joined' | null;  // 내 역할 표시
  onClick: () => void;
}
```

**스타일**:
- 아이콘: 40×40px, `rounded-xl`, `iconBgColor` 배경, lucide 아이콘 또는 이미지
- 이름: `text-sm font-bold text-foreground`
- 메타: `text-xs text-text-sub` "멤버 N명 . 기록 N개"
- 역할: `mine`→ pill `bg-primary/10 text-primary`, `joined`→ pill `bg-surface-variant text-text-sub`
- 우측 → activity dot (green, 최근 24시간 활동 시)

#### 버블 탭 필터/정렬

**필터 속성** (Notion 스타일):
| 속성 | 연산자 |
|------|--------|
| 지역 | is / is not / contains / >= / < |
| 유형 | is / is not |
| 멤버 수 | is / >= / < |
| 활성도 | is / is not |
| 가입 방식 | is / is not |

**정렬**: 최신 활동순(기본), 멤버 많은순, 기록 많은순, 이름순

#### 버블러 탭

| 필드 | 설명 |
|------|------|
| 아바타 | 40×40px 원형, 그라디언트 배경(avatar_color), 이니셜 |
| 이름 | username |
| 메타 | "기록 N개 . Lv.X" |
| 팔로우 버튼 | 맞팔(초록) / 팔로잉(파란 연한) / 팔로우(테두리) |

필터칩: 전체 / 팔로잉 / 팔로워 / 맞팔

### 3. 버블 상세 페이지 (/bubbles/[id])

**목업 참조**: `04_bubbles_detail.html`

#### 히어로 (`bubble-hero.tsx`)

```
┌─────────────────────────────────┐
│ ← 버블   bubbles   🔔  👤     │ ← 내부 페이지 헤더
├─────────────────────────────────┤
│                                 │
│  [🍴]  직장 맛집  ℹ️  ⚙️       │ ← 52×52 아이콘 + 이름 + info(모든 사용자) + settings(owner만)
│                                 │
│  을지로 주변 직장인 맛집 모음     │ ← 설명 (text-sm text-text-sub)
│                                 │
│  [멤버 8명] [취향 91%] [초대 👤+]│ ← 뱃지 3개
│                                 │
└─────────────────────────────────┘
```

```typescript
interface BubbleHeroProps {
  bubble: Bubble;
  myRole: BubbleMemberRole | null;     // null = 비멤버
  tasteMatchPct: number | null;
  onInfoClick: () => void;
  onSettingsClick: () => void;
  onInviteClick: () => void;
}
```

**뱃지 스타일**:
- 멤버 수: `bg-accent-social/10 text-accent-social` (파란)
- 취향 유사도: `bg-positive/10 text-positive` (초록)
- 초대: `bg-surface-variant text-text-sub` + user-plus 아이콘

#### 퀵 통계 (`bubble-quick-stats.tsx`)

4칩 가로 스크롤:

| 칩 | 값 | 아이콘 | 강조 |
|----|-----|--------|------|
| 총 기록 | `recordCount` | file-text | 기본 |
| 평균 점수 | `avgSatisfaction` | star | 기본 |
| 이번 주 | `weeklyRecordCount` | trending-up | `text-positive` (초록 강조) |
| 고유 장소 | `uniqueTargetCount` | map-pin | 기본 |

```typescript
interface BubbleQuickStatsProps {
  recordCount: number;
  avgSatisfaction: number | null;
  weeklyRecordCount: number;
  uniqueTargetCount: number;
}
```

#### 스티키 탭

```
┌─────────────────────────────────┐
│ [피드] [랭킹] [멤버]  👁️ 📊 ↕️ │ ← 스티키 (z-50), 탭별 우측 아이콘 변경
└─────────────────────────────────┘
```

- 활성 탭: `border-b-2 border-primary text-primary font-bold`
- 비활성: `text-text-sub`
- 우측 아이콘: 뷰 전환(eye/list) + 필터(sliders-horizontal) + 정렬(arrow-up-down)

### 4. 피드 탭

#### 카드 뷰 (`feed-card.tsx`) — 기본

**목업 참조**: `04_bubbles_detail.html` (screen-feed)

```typescript
interface FeedCardProps {
  share: BubbleShare;
  record: DiningRecord;            // S4 DiningRecord 엔티티
  target: Restaurant | Wine;       // S4 Restaurant/Wine 엔티티
  user: { nickname: string; avatarUrl: string | null; avatarColor: string | null; level: number };
  reactions: Record<ReactionType, number>;
  myReactions: ReactionType[];
  commentCount: number;
  readCount: number;
  onReactionToggle: (type: ReactionType) => void;
  onCommentClick: () => void;
  onClick: () => void;
}
```

**레이아웃**:

```
┌──────────────────────────────┐
│ 📷 사진 1      📷 사진 2      │ ← 2~3장 그리드 (4:3, gap-0.5)
│              [93]            │ ← 점수 오버레이 (좌하단)
│                              │   식당: bg-primary, 와인: bg-wine
│                              │   숫자 20px 900w 흰색, 배경 black/60 blur
├──────────────────────────────┤
│ 👤 김영수 Lv.9      3시간 전  │ ← 아바타 22px + 이름 + Lv뱃지 + 시간
│                              │
│ 미진                          │ ← 장소명 (15px, 800w)
│ 한식 · 을지로 · 혼밥          │ ← 메타 (11px, text-hint)
│                              │
│ 메밀국수 진짜 맛있다...       │ ← 한줄평 (12px, 2줄 클램프)
│                              │
│ 📌 3  ✓ 5  🔥 2 │ ❤️ 4  💬 2  │ ← 리액션 3종 | 좋아요+댓글
│                  외 4명이 봤어요│ ← readCount (text-hint, 10px)
└──────────────────────────────┘
```

**사진 그리드 규칙**:
- 1장: 16:9 단독
- 2장: 2열 (4:3 각각)
- 3장+: 좌 1장(큰) + 우 2장(작은) 스택
- gap: 2px

**점수 오버레이**: 좌하단, `absolute bottom-2 left-2`, 배경 `bg-black/60 backdrop-blur-sm`, 숫자 `text-xl font-black text-white`, 식당 테두리 `border-primary`, 와인 테두리 `border-wine`

#### 컴팩트 뷰 (`feed-compact.tsx`)

```
┌──────────────────────────────┐
│ [93] │ 미진               │ 김 │ ← 점수 42×42 + 장소명 + 아바타
│ SCORE│ 한식 · 을지로      │ 3시간│ ← 메타 + 시간
└──────────────────────────────┘
```

- 사진/한줄평/리액션 숨김
- 점수 배지: 42×42px, 식당 `bg-primary text-white`, 와인 `bg-wine text-white`
- 텍스트: `font-bold text-sm` (장소명), `text-xs text-text-sub` (메타)

#### 피드 필터

**속성** (Notion 스타일):
| 속성 | 값 |
|------|-----|
| 유형 | 전체 / 식당 / 와인 |
| 멤버 | 전체 / 개별 멤버 선택 |
| 시기 | 전체 / 이번 주 / 이번 달 / 3개월 |
| 점수 | 전체 / 90+ / 80+ / 70+ |

**필터칩 기본값**: 전체 / 식당만 / 와인만

**정렬**: 최신순(기본), 반응 많은순, 점수 높은순, 멤버별

### 5. 랭킹 탭

#### 서브토글

```
┌──────────────────────────────┐
│  [ 🍴 식당 | 🍷 와인 ]        │ ← 둥근 세그먼트 토글
└──────────────────────────────┘
```

- 활성: `bg-foreground text-background rounded-full`
- 비활성: `text-text-sub`

#### 포디움 뷰 (`ranking-podium.tsx`) — Top 3

**목업 참조**: `04_bubbles_detail.html` (screen-ranking)

```
         ┌────┐
       ┌─┤ 1  ├─┐          ← 1위: 110px 높이, crown 아이콘, 금색
       │ └────┘ │
     ┌──────┐ ┌──────┐
     │  2   │ │  3   │     ← 2위: 88px 은색, 3위: 76px 동색
     └──────┘ └──────┘
```

```typescript
interface RankingPodiumProps {
  items: Array<{
    rank: 1 | 2 | 3;
    target: Restaurant | Wine;
    avgSatisfaction: number;
    recordCount: number;
    delta: number | 'new' | null;     // ▲N / ▼N / NEW / null(변동 없음)
  }>;
  targetType: 'restaurant' | 'wine';
}
```

**포디움 아이템 스타일**:

| 순위 | 높이 | 뱃지 아이콘 | 뱃지 색상 | 배경 |
|------|------|------------|----------|------|
| 1위 | 110px | crown | `#FFD700` (금) | 사진 + 그라디언트 오버레이 |
| 2위 | 88px | medal | `#C0C0C0` (은) | 사진 + 그라디언트 오버레이 |
| 3위 | 76px | medal | `#CD7F32` (동) | 사진 + 그라디언트 오버레이 |

- 순위 배지: 좌상단 `absolute top-1 left-1`
- 점수 오버레이: 우하단 `absolute bottom-1 right-1`

#### 리스트 뷰 (`ranking-list.tsx`) — 4위~

```
│ 순위 │ 썸네일 │ 이름 + 메타       │ 점수 + 변동  │
│  4   │ 📷    │ 이코이  일식·을지로  │ 88   ▲3    │
│  5   │ 📷    │ 파스타바르 양식·성수  │ 84   NEW   │
```

```typescript
interface RankingListProps {
  items: Array<{
    rank: number;
    target: Restaurant | Wine;
    avgSatisfaction: number;
    recordCount: number;
    delta: number | 'new' | null;
  }>;
  targetType: 'restaurant' | 'wine';
}
```

**변동 표시**:
- `▲N`: `text-positive` (초록)
- `▼N`: `text-negative` (빨강)
- `NEW`: `text-text-hint bg-surface-variant rounded px-1`
- `─` (변동 없음): `text-text-hint`

#### 랭킹 필터

| 속성 | 값 |
|------|-----|
| 기간 | 전체 기간 / 이번 주 / 이번 달 / 3개월 |
| 유형 | 전체 / 식당 / 와인 |
| 멤버 | 전체 / 개별 멤버 |

**필터칩 기본값**: 전체 / 이번 주 / 이번 달

**정렬**: 점수순(기본), 기록 많은순, 최근 기록순

### 6. 멤버 탭

#### 그리드 뷰 (`member-grid.tsx`) — 2열, 기본

**목업 참조**: `04_bubbles_detail.html` (screen-members)

```typescript
interface MemberGridProps {
  members: Array<{
    user: { id: string; nickname: string; avatarUrl: string | null; avatarColor: string | null; level: number; levelTitle: string };
    member: BubbleMember;
    isMe: boolean;
    followStatus: 'none' | 'following' | 'follower' | 'mutual';
  }>;
  onMemberClick: (userId: string) => void;
  onFollowToggle: (userId: string) => void;
}
```

**멤버 카드 레이아웃**:

```
┌────────────────────┐
│     👤 (48×48)      │ ← 아바타 + 그라디언트 배경 + 이니셜
│   [🧭 탐험왕]       │ ← 배지 (우상단, bg-surface-variant text-text-sub)
│   김영수            │ ← 13px, 700w
│  Lv.9 미식가        │ ← pill, 높은 레벨: bg-primary/10 text-primary
│  ━━━━━━━ 91%       │ ← 일치도 진행 바 (h-1, rounded-full)
│  ✏️ 72개  📍 8곳    │ ← pencil-line + 기록수, map-pin + 장소수
│  [팔로잉]           │ ← 팔로우 버튼
└────────────────────┘
```

**일치도 바 색상**:
- \>70%: `bg-positive` (초록)
- 60~70%: `bg-accent-social` (파란)
- <60%: `bg-text-hint` (회색)

**팔로우 버튼**:
- 팔로우: `bg-accent-social text-white` (파란 filled)
- 팔로잉: `border border-line text-text-sub` (회색 outlined)
- 맞팔: `bg-positive/10 text-positive border border-positive/30` (초록)
- 나: 비활성 (`opacity-50`, 클릭 불가)

**"나" 카드**: `border-2 border-accent-social/30 bg-accent-social/5` (is-me 클래스)

#### 리스트 뷰 (`member-list-view.tsx`)

- 아바타 36px + 이름/레벨 + 미니통계 + 배지 (가로 배치)
- 팔로우 버튼, 일치도 바 숨김

#### 멤버 필터

| 속성 | 값 |
|------|-----|
| 역할 | 전체 / 관리자 / 멤버 |
| 일치도 | 전체 / 80%+ / 60%+ |
| 레벨 | 전체 / Lv.7+ / Lv.5+ / Lv.3+ |
| 팔로우 | 전체 / 팔로잉 / 팔로워 |

**필터칩 기본값**: 전체 / 팔로잉만 / 고레벨

**정렬**: 일치도순(기본), 기록 많은순, 레벨 높은순, 최근 활동순

### 7. 버블 정보 시트 (`bubble-info-sheet.tsx`)

히어로의 ℹ️ 클릭 → 바텀 시트.

```
┌─────────────────────────────────┐
│ 버블 정보                 [✕]   │
├─────────────────────────────────┤
│ 🛡️ 가입 조건                    │
│ [📋 승인 필요] [✏️ 기록 5개+]    │ ← 칩 형태
│ [⭐ Lv.3+] [👥 최대 20명]        │
├─────────────────────────────────┤
│ 📜 버블 규칙                     │
│ • 을지로·광화문 식당 위주          │ ← --primary 색 점 + 텍스트
│ • 점수는 솔직하게                 │
│ • 월 1회 이상 기록 필수           │
└─────────────────────────────────┘
```

```typescript
interface BubbleInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bubble: Bubble;
}
```

### 8. content_visibility 제한 로직

비멤버가 버블 상세를 볼 때 application layer에서 필터링:

| content_visibility | 비멤버에게 보이는 것 |
|-------------------|-------------------|
| `rating_only` | 식당/와인 이름 + 평균 점수 (아바타+Lv+만족도 숫자) |
| `rating_and_comment` | 위 + 한줄평 |

**구현 위치**: `use-bubble-feed.ts`에서 `myRole === null` (비멤버)일 때 데이터 필터링.
- 사진 숨김
- 리액션/댓글 숨김
- rating_only: 한줄평도 숨김
- 아바타/이름 대신 "멤버" 익명 표시 (closed 버블의 follower)

### 9. 버블러 프로필 (/bubbles/[id]/members/[userId])

**목업 참조**: `04_bubbler_profile.html`

별도 컨테이너 `bubbler-profile-container.tsx`에서 조합. BUBBLE.md §13 전체 구현.

**레이아웃 순서**:
1. 헤더: ← "[버블명]" + 옵션(ellipsis)
2. 프로필 히어로: 72×72 아바타 + Lv 배지 + 이름 + @handle + 통계(기록/팔로워/팔로잉) + 맛 태그 + 액션 버튼
3. 버블 컨텍스트 카드: 이번 주 순위 / 멤버십 기간 / 취향 일치도 / 같이 가본 곳
4. 스티키 탭: 식당 | 와인
5. 취향 프로필: 카테고리 비율 바 + 평점 성향 척도 + 지역 태그
6. 강력 추천 (Picks): 가로 스크롤 그리드 (82×82 카드)
7. 최근 기록: 3개 행 (썸네일+이름+메타+한줄평+점수)
8. 활동: 3칩(총 기록/연속 기록/활동 기간) + 히트맵(13×7) + 연속 기록 배너

---

## 목업 매핑

| 목업 화면 | 컴포넌트 | 프로토타입 |
|----------|---------|----------|
| 버블 목록 | `bubble-card.tsx` → `bubble-list-container.tsx` | `04_bubbles.html` |
| 히어로 | `bubble-hero.tsx` | `04_bubbles_detail.html` hero |
| 퀵 통계 | `bubble-quick-stats.tsx` | `04_bubbles_detail.html` stats |
| 피드 카드 | `feed-card.tsx` | `04_bubbles_detail.html` feed |
| 피드 컴팩트 | `feed-compact.tsx` | `04_bubbles_detail.html` feed-compact |
| 포디움 | `ranking-podium.tsx` | `04_bubbles_detail.html` ranking |
| 리스트 4위~ | `ranking-list.tsx` | `04_bubbles_detail.html` ranking |
| 멤버 그리드 | `member-grid.tsx` | `04_bubbles_detail.html` members |
| 멤버 리스트 | `member-list-view.tsx` | `04_bubbles_detail.html` members-list |
| 정보 시트 | `bubble-info-sheet.tsx` | `04_bubbles_detail.html` info-sheet |
| 버블러 프로필 | `bubbler-profile-container.tsx` | `04_bubbler_profile.html` |

---

## 데이터 흐름

```
[버블 목록]
  page.tsx → BubbleListContainer
    → useBubbleList() → bubbleRepo.getUserBubbles(userId)
    → 탭 전환: 버블 / 버블러
    → 필터/소팅 적용 (클라이언트 사이드 또는 쿼리 파라미터)

[버블 상세]
  page.tsx → BubbleDetailContainer
    → useBubbleDetail(bubbleId) → bubbleRepo.getById() + getMember(myId)
    → 탭 상태 관리: feed | ranking | members
    → 각 탭은 독립 hook 사용

[피드 탭]
  useBubbleFeed(bubbleId, filters)
    → bubbleRepo.getShares(bubbleId, { targetType, period, minSatisfaction, sortBy })
    → 각 share → record + target(restaurant/wine) + user 정보 JOIN
    → content_visibility 필터링 (비멤버 시)

[랭킹 탭]
  useBubbleRanking(bubbleId, targetType)
    → bubbleRepo.getRankings(bubbleId, { targetType, periodStart: thisWeekMonday })
    → getPreviousRankings() → delta 계산
    → Top 3 → podium, 4위~ → list

[멤버 탭]
  useBubbleMembers(bubbleId, filters)
    → bubbleRepo.getMembers(bubbleId, { role, sortBy })
    → 각 member → user 정보 JOIN + followStatus 계산
```

---

## 검증 체크리스트

```
□ /bubbles 라우트: 버블 카드 리스트 + 버블러 탭
□ /bubbles/[id] 라우트: 히어로 + 퀵 통계 + 3탭
□ 히어로: 52×52 아이콘 + 이름 + info(ℹ️) + settings(⚙️, owner만) + 뱃지
□ 퀵 통계: 4칩 (총 기록/평균 점수/이번 주/고유 장소)
□ 피드 카드: 사진 그리드 + 점수 오버레이 + 유저 행 + 장소명 + 메타 + 한줄평 + 리액션
□ 피드 컴팩트: 42×42 점수 배지 + 장소명 + 메타 (사진/한줄평/리액션 숨김)
□ 피드 필터: 유형/멤버/시기/점수
□ 피드 정렬: 최신순/반응순/점수순/멤버별
□ 랭킹 포디움: Top 3 (110/88/76px), 왕관/은/동 배지
□ 랭킹 리스트: 4위~ (순위+썸네일+이름+점수+변동)
□ 랭킹 서브토글: 식당/와인 세그먼트
□ 멤버 그리드: 2열 (48×48 아바타 + 일치도 바 + 미니 통계 + 팔로우)
□ 멤버 리스트: 36px 아바타 가로 배치
□ 멤버 "나" 카드: 틸 테두리/배경
□ 정보 시트: 가입 조건 칩 + 버블 규칙 리스트
□ content_visibility: 비멤버에게 제한된 데이터 표시
□ 버블러 프로필: 히어로 + 컨텍스트 카드 + 탭 + 취향 + Picks + 최근 기록 + 활동
□ 페이저: 인라인 페이저 (< 1/N >), 10개/페이지
□ R1~R5 위반 없음
□ pnpm build / lint 에러 없음
□ 360px 모바일에서 레이아웃 정상
```
