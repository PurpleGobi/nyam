# RESTAURANT_DETAIL — 식당 상세 페이지

> depends_on: DATA_MODEL, RATING_ENGINE, DESIGN_SYSTEM
> route: /restaurants/[id]
> prototype: `prototype/02_detail_restaurant.html`

---

## 1. 와이어프레임

```
┌──────────────────────────────────────┐
│ [← 뒤로]     nyam    bubbles 🔔 [J] │  AppHeader (공통)
│──────────────────────────────────────│
│ ┌──────────────────────────────────┐ │
│ │     사진 캐러셀 (h-56, 224px)    │ │  Layer 1: 히어로
│ │                                  │ │
│ │                    [Share][♡]    │ │  공유/좋아요 (우하단)
│ │            ●●●                  │ │  dot indicator (하단 중앙)
│ └──────────────────────────────────┘ │
│                                      │
│ 식당명                                │  Layer 2: 정보
│ 양식 > 이탈리안 · 고가                │  장르 체인 · 가격대 텍스트
│                                      │
│ ┌──────────┐ ┌──────────┐           │  Layer 3: 점수 카드 (2슬롯)
│ │  내 점수   │ │ 버블러 평균 │           │
│ │    87     │ │    85    │           │
│ │  3회 방문  │ │ 리뷰 3개  │           │
│ └──────────┘ └──────────┘           │
│ ┌ 버블 확장 패널 (접힌 상태) ────┐     │
│ │ 🍴 직장맛집  3명 평가      90 │     │
│ │ 🍷 와인모임  2명 평가      82 │     │
│ └──────────────────────────────┘     │
│                                      │
│ [★미슐랭] [◆블루리본] [📺수요미식회]   │  뱃지 행
│                                      │
│ ── 나의 평가 ──── N회 방문 평균       │  Layer 4: 평가 사분면 (RatingInput)
│   ┌─ 저렴 ────── 고가 ─┐            │
│   │ ●골목집    ●스시코우지│  포멀     │
│   │      ●몽탄  ●욘트빌  │           │
│   │            ●에오    │  캐주얼    │
│   └───────────────────┘            │
│                                      │
│ [일식 Lv.4] [강남 Lv.3]              │  축 숙련도 뱃지
│                                      │
│ ── 나의 기록 ────── 방문 3회 · 날짜  │  Layer 5: 내 기록 타임라인
│   ● 2026.03.15 [데이트]              │
│     92점 "분위기 최고" [📷][📷]       │
│   ● 2026.02.28 [회식]                │
│     78점 "코스가 아쉬움"              │
│ ═══════════ divider ═══════════════  │
│ ── 버블 기록 ──── 필터 칩             │  Layer 6: 버블 기록
│   [전체] [직장맛집] [와인모임]         │
│   ┌ 버블 카드 ──────────────┐       │
│   │ 김 김영수 직장맛집버블 90점│       │
│   │ "여기 사케 페어링 필수"   │       │
│   └────────────────────────┘       │
│ ═══════════ divider ═══════════════  │
│ ── 정보 ────────────────────────    │  Layer 7: 실용 정보
│   📍 서울 중구 을지로 XX길 12        │
│      [지도 플레이스홀더]              │
│      [카카오맵] [네이버지도] [구글맵]  │
│   🕐 영업 중 · 11:30–22:00          │
│   📞 02-1234-5678                   │
│   [▼ 메뉴 보기] (접이식)             │
│                                      │
│ [←FAB]  [수정][삭제]      [+FAB]    │  좌하단 뒤로 / 중앙 액션 / 우하단 추가
└──────────────────────────────────────┘
```

---

## 2. 앱 헤더

공통 `AppHeader` 컴포넌트 사용. 식당 상세 페이지 전용 커스터마이징 없음.

뒤로 가기는 `router.back()`으로 처리 (FAB 뒤로 버튼).

### 버블 모드 서브헤더

`?bubble=[bubbleId]` 쿼리 파라미터가 있으면 AppHeader 아래에 `BubbleMiniHeader` 표시.

| 요소 | 설명 |
|------|------|
| **위치** | `position: sticky; top: 46px; z-index: 80` |
| **내용** | 버블 아이콘 + 버블명 + 설명(truncated) + 멤버 수 |
| **배경** | `var(--accent-social-light)` |
| **뒤로 버튼** | `showBack` 활성 |

---

## 3. 섹션별 상세

### Layer 1: 히어로 (사진 캐러셀)

| 속성 | 값 |
|------|---|
| 높이 | `h-56` (224px) |
| 사진 소스 | `restaurant.photos` 우선 → 없으면 `recordPhotos`에서 수집 |
| 사진 없음 | `var(--bg-elevated)` 배경 + `UtensilsCrossed` 아이콘 (28px, `--text-hint`) |
| 스와이프 | 터치/마우스 드래그, 임계값 40px |
| 트랜지션 | `translateX` 기반, `duration-[400ms] ease-in-out` |
| dot indicator | 하단 중앙, 6px dot, 활성 dot 16px 너비 |
| 하단 그라디언트 오버레이 | 80px, `linear-gradient(transparent, rgba(0,0,0,0.4))` |
| 사진 클릭 | 풀스크린 팝업 (PopupWindow), 클릭으로 다음 사진 순환 |
| 풀스크린 팝업 | `maxWidth: min(90vw, 500px)`, `maxHeight: 70vh`, `object-fit: contain`, z-index 200 |

#### 좋아요/공유 버튼
- **위치**: 캐러셀 우하단 (`bottom: 10px; right: 12px`)
- **레이아웃**: `flex gap-3`
- **공유 버튼**: `Share2` 아이콘 (20px), `rgba(255,255,255,0.85)` — `navigator.share()` Web Share API 호출
- **좋아요 버튼**: `WishlistButton` 컴포넌트, `variant="hero"`, size 20px

> **참고**: 과거 문서에 있던 "히어로 썸네일(hero-thumb)" 컴포넌트는 현재 구현에 없음.

### `.detail-info` 컨테이너 (Layer 2 + 3 + 뱃지 통합)

Layer 2 (정보), Layer 3 (점수 카드), 버블 확장 패널, 뱃지 행은 하나의 컨테이너 안에 포함된다.

### Layer 2: 정보 (일관된 레이아웃)

**기록 유무에 관계없이 항상 동일한 구조.**

| 요소 | 스타일 |
|------|--------|
| 이름 | 21px, weight 800, `--text` |
| 장르 체인 | 12px, `--text-sub` — `대분류 > 소분류` 형식 (예: `양식 > 이탈리안`), 단일 대분류면 장르명만 |
| 가격대 | 12px, weight 600, `--accent-food` — `저가` / `중간` / `고가` 텍스트 |
| 구분자 | `·` (12px, `--text-hint`), gap 1.5 |
| 패딩 | `14px 20px 8px` |

#### 장르 체인 로직 (`getGenreChain`)
```
GENRE_MAJOR_CATEGORIES에서 대분류 매핑:
- 대분류 === 장르 → 장르명만 (예: "한식")
- 대분류 ≠ 장르 → "대분류 > 장르" (예: "양식 > 이탈리안")
- 매핑 없음 → 장르명 그대로
```

### Layer 3: 점수 카드 (2슬롯)

**2개 카드를 나란히 표시. 버블 모드에서는 카드 내용이 스왑됨.**

#### 점수 카드 컨테이너
```
display: flex
gap: 8px (gap-2)
padding: 0 20px 10px
```

#### 카드 공통 스타일
```
flex: 1 (균등 분할)
bg: --bg-card
border: 1px solid --border
border-radius: 10px
padding: 8px 10px
min-height: 56px
text-align: center
```

| 요소 | 스타일 |
|------|--------|
| 라벨 | 9px, weight 600, `--text-hint`, letter-spacing 0.02em |
| 점수 | 24px, weight 800 |
| 점수 (빈) | 18px, `--border-bold`, "—" 표시 |
| 부가 텍스트 | 9px, `--text-hint` |

#### 일반 모드 (기본)

| 카드 | 라벨 | 점수 색상 | 부가 텍스트 |
|------|------|----------|------------|
| **내 점수** | "내 점수" | `var(--accent-food)` | "N회 방문" 또는 "미방문" |
| **버블러 평균** | "버블러 평균" | `var(--accent-social)` | "리뷰 N개" 또는 빈 문자열 |

#### 버블 모드 (`?bubble=[id]`)

| 카드 | 라벨 | 점수 색상 | 부가 텍스트 |
|------|------|----------|------------|
| **내 점수** (왼쪽) | "내 점수" | `var(--accent-food)` | "버블 평균 · N명" (버블 멤버 평균으로 스왑) |
| **버블러 평균** (오른쪽) | "버블러 평균" | `var(--accent-social)` | "나 · N회" 또는 "미방문" (내 점수로 스왑) |

> **참고**: 과거 문서의 "nyam 점수" 카드 (웹+명성 기반)는 현재 구현에 없음. 2슬롯 구조.

#### 버블 카드 상세
- **탭 동작**: 확장 패널 토글
- **active 시**: `border-color: var(--accent-social)` → `var(--border)` 트랜지션

#### 버블 확장 패널

**일반 모드에서만 표시** (`!isBubbleMode`). 점수 카드 아래에 위치.
**`bubbleScores`가 비어있으면 `null` 반환** (추천 모드에서는 데이터 없으므로 실질적으로 숨김).

```
컨테이너: padding 0 20px 10px
열림: maxHeight 200px
닫힘: maxHeight 0, overflow hidden
트랜지션: max-height 0.25s ease
```

각 버블 점수 행:
```
[아이콘 24px] [버블명 + N명 평가] [점수 16px bold]
```

| 요소 | 스타일 |
|------|--------|
| 아이콘 | 24px 정사각, radius 6px, 버블 테마색 배경 |
| 버블명 | 12px, weight 500, `--text` |
| 평가 수 | 10px, `--text-hint` |
| 점수 | 16px, weight 800, `--accent-food` |

### 뱃지 행

| 속성 | 값 |
|------|---|
| 레이아웃 | flex, gap 5px, flex-wrap |
| 조건 | 있을 때만 표시, 없으면 null 반환 |

| 뱃지 | 배경 | 텍스트 | 보더 |
|------|------|--------|------|
| 미슐랭 | `#FDF6EC` | `#B8860B` | `#E8DDCA` |
| 블루리본 | `#EDF2FB` | `#4A6FA5` | `#D0DCF0` |
| TV | `#FFF3F0` | `--brand` | `#F0D8D0` |

뱃지 pill: padding `3px 9px`, radius 20px, font 10px weight 600, 아이콘 10px

#### 뱃지 빌드 로직
```
restaurant.michelinStars → { type: 'michelin', label: "미슐랭 N스타", icon: 'star' }
restaurant.hasBlueRibbon → { type: 'blue_ribbon', label: "블루리본", icon: 'award' }
restaurant.mediaAppearances → 각각 { type: 'tv', label: 방송명, icon: 'tv' }
```

### Layer 4: 평가 사분면

**조건부 표시: 버블 모드 또는 내 기록 모드에서만.**

`RatingInput` 컴포넌트를 `readOnly` 모드로 사용.

#### 버블 모드 (`isBubbleMode && bubbleRefPoints.length > 0`)

| 요소 | 값 |
|------|---|
| **섹션 제목** | "버블 멤버 평가" |
| **부제** | "N명" (12px, `--text-hint`) |
| **현재 dot** | 내 방문 평균 좌표 (없으면 `hideDot`) |
| **참조 점** | 버블 멤버들의 axisX/Y/satisfaction — 내 dot만 컬러, 나머지 그레이스케일 (satisfaction=0) |

#### 일반 모드 (`viewMode === 'my_records' && currentDot`)

**2가지 사분면 모드**: 기록이 2개 이상이면 `quadrantMode` 토글 표시 (`'avg'` | `'recent'`).

##### 평균 모드 (`quadrantMode === 'avg'`, 기본값)

| 요소 | 값 |
|------|---|
| **섹션 제목** | "나의 평가" |
| **부제** | "N회 방문 평균" (12px, `--text-hint`) |
| **현재 dot** | 모든 방문의 axisX/Y/satisfaction 평균 (`avgDot`) |
| **참조 점** | `quadrantRefs` — 같은 유저의 다른 식당 평균 좌표 (최대 12개), `targetId` + `targetType` 포함 |
| **참조 dot 탭** | `onRefNavigate` — 탭 시 해당 식당/와인 상세 페이지로 이동 |

##### 최근 모드 (`quadrantMode === 'recent'`)

| 요소 | 값 |
|------|---|
| **섹션 제목** | "나의 평가" |
| **부제** | "최근 방문 · YYYY-MM-DD" (12px, `--text-hint`) — `focusedRecord.visitDate` |
| **현재 dot** | 포커스된 기록의 axisX/Y/satisfaction (`focusedDot`) |
| **참조 점** | 같은 식당의 다른 방문 기록들 (`otherRecordRefs`) — 날짜 라벨, `_refIdx` 포함 |
| **참조 dot 롱프레스** | `onRefLongPress` — 롱프레스 시 해당 기록으로 포커스 전환 (`setFocusedRecordIdx`) |
| **참조 dot 탭** | `onRefNavigate`는 `undefined` (최근 모드에서는 네비게이션 없음) |

##### 사분면 모드 토글

- **조건**: `allRecordsWithAxis.length >= 2` (축 데이터 있는 기록 2개 이상)
- **RatingInput props**: `quadrantMode` + `onQuadrantModeChange` 전달
- **모드 전환 시**: `focusedRecordIdx`를 `0`으로 리셋 (최신 기록부터 다시 시작)
- **토글 불가**: 기록 1개 이하이면 props를 전달하지 않아 토글 숨김

##### Dot 계산

```
// 평균 dot (avg 모드)
allRecordsWithAxis = myRecords.filter(axisX && axisY && satisfaction != null)
avgDot = {
  axisX: Math.round(평균),
  axisY: Math.round(평균),
  satisfaction: Math.round(평균),
}

// 포커스 dot (recent 모드)
sortedRecords = allRecordsWithAxis (createdAt 내림차순)
focusedRecord = sortedRecords[focusedRecordIdx]
focusedDot = { axisX, axisY, satisfaction } from focusedRecord

// 현재 dot (모드 분기)
currentDot = quadrantMode === 'recent' && focusedDot ? focusedDot : avgDot
```

##### 액션 대상 기록 (`activeRecordId`)

사분면 모드에 따라 수정/삭제 대상 기록이 변경됨:
```
activeRecordId = quadrantMode === 'recent' && focusedRecord
  ? focusedRecord.id        // 최근 모드: 포커스된 기록
  : myRecords[0]?.id ?? null  // 평균 모드: 최신 기록
```

### 축 숙련도 뱃지 (AxisLevelBadge)

**조건**: `axisLevels.length > 0 && myRecords.length > 0`

- **위치**: Divider와 RecordTimeline 사이
- **컨테이너 스타일**: `flex items-center gap-1.5 px-5 pt-4`
- **내용**: 장르 레벨 뱃지 + 지역 레벨 뱃지 (예: `[일식 Lv.4] [강남 Lv.3]`)
- **뱃지 스타일**: `rounded-full`, padding `px-2 py-0.5`, 11px weight 600
- **뱃지 색상**: `getLevelColor(level)` 기반 — 텍스트 색상 + 배경은 같은 색상 저투명도 (`${color}18`)
- **데이터**: `useAxisLevel(userId, [{ axisType: 'genre', axisValue }, { axisType: 'area', axisValue }])`

### Layer 5: 나의 기록

**섹션 제목**: "나의 기록"
**섹션 메타** (기록 있을 때): "방문 N회 · YYYY-MM-DD"

`RecordTimeline` 컴포넌트 사용.

#### 기록 있음: 타임라인
```
│ (세로선: linear-gradient accent-food → 투명)
● 2026.03.15  [데이트]
  92점 "분위기 최고, 오마카세 감동"
  [📷] [📷]
  🍷 연결된 와인명 (탭 → 와인 상세)
● 2026.02.28  [회식]
  78점 "코스가 아쉬움"
```

| 요소 | 스타일 |
|------|--------|
| 세로선 | `linear-gradient(to bottom, --accent-food, 투명)` |
| 타임라인 dot | 12px 원, 상황 태그 색상 적용 |
| 날짜 | 11px, `--text-sub` |
| 상황 칩 | pill 형태, 상황별 배경색, 흰색 텍스트 |
| 점수 | 13px, weight 700 |
| 한줄평 | 12px, `--text-sub` |
| 사진 썸네일 | 44×44px, radius 6px (최대 4장, 팝업 갤러리) |
| 연결 와인 | 와인명 버튼 → 탭 시 `/wines/[id]`로 이동 |

#### 연결된 와인 통합

과거 별도 섹션이었던 "연결된 와인(Layer 8)"은 현재 타임라인 내에 통합됨.
- `linkedWines` 데이터를 `linkedWineNames` Map으로 변환 (wineId → wineName)
- `RecordTimeline`에 `linkedWineNames` + `onLinkedWineTap` 전달
- 각 기록 항목에서 연결된 와인이 있으면 와인명 버튼 표시

#### 기록 없음
```
search 아이콘 (lucide)
"아직 방문 기록이 없어요" (빈 상태 제목)
"우하단 + 버튼으로 첫 기록을 남겨보세요" (빈 상태 설명)
```

### Layer 6: 버블 기록

`BubbleRecordSection` 컴포넌트 사용.

- **props**: `targetId={restaurantId}`, `targetType="restaurant"`
- **필터 칩**: 버블별 선택
- **카드**: `BubbleRecordCard` — 아바타, 유저명, 버블명, 점수, 한줄평
- **더보기**: `hasMore` 시 "더보기" 버튼
- **빈 상태**: `MessageCircle` 아이콘 + "아직 버블 기록이 없어요"

### Layer 7: 실용 정보

**섹션 제목**: "정보" (15px, weight 700)

`RestaurantInfo` 컴포넌트 사용. 데이터가 하나도 없으면 `null` 반환.

| 행 | 아이콘 | 내용 | 스타일 |
|----|--------|------|--------|
| 주소 | `MapPin` 14px | 주소 텍스트 | 13px, `--text-sub` |
| 영업 | `Clock` 14px | `영업 중` + 시간 또는 `오늘 휴무` | 영업 중: `--positive` weight 600, 시간: `--text-sub` |
| 전화 | `Phone` 14px | 전화번호 (`tel:` 링크) | 13px, `--accent-food` |

#### 지도 영역
- **미니 지도 플레이스홀더**: 120px 높이, `--bg-elevated` 배경, `MapPin` 아이콘 + "지도에서 보기" 텍스트
- **클릭 시**: 카카오맵 외부 링크 오픈

#### 지도 앱 링크 버튼 (3개, 가로 나란히)
| 버튼 | 배경색 | 텍스트색 | URL 패턴 |
|------|--------|---------|---------|
| 카카오맵 | `#FEE500` | `#191919` | `map.kakao.com/link/map/{name},{lat},{lng}` |
| 네이버지도 | `#03C75A` | `#fff` | `map.naver.com/v5/search/{name}?c={lng},{lat},15,0,0,0,dh` |
| 구글맵 | `#4285F4` | `#fff` | `google.com/maps/search/?api=1&query={lat},{lng}&query_place_id={name}` |

각 버튼: `flex-1`, rounded-lg, py-2, 12px weight 600, `ExternalLink` 아이콘 12px

#### 메뉴 보기 (접이식)
- **조건**: `showMenuSection && menus.length > 0` — 내 기록 모드(`viewMode === 'my_records'`)에서만
- **버튼**: `#F0EDE8` 배경, rounded-lg, px-3 py-2, 13px weight 600
- **화살표**: `ChevronDown` 16px, 열림 시 180° 회전 (0.3s transition)
- **메뉴 항목**: 메뉴명 + 가격 (`toLocaleString()원`), 행별 `1px solid #F0EDE8` 구분

---

## 4. FAB (Floating Action Buttons)

### 기본 FAB (DetailFab) — 항상 표시

| FAB | 위치 | 아이콘 | 동작 |
|-----|------|--------|------|
| 뒤로 | 좌하단 | `chevron-left` | `router.back()` |
| 추가 | 우하단 | `plus` | 기록 추가 진입 |

### 액션 버튼 (FabActions) — 기록 있을 때만

| 버튼 | 동작 |
|------|------|
| 수정 | 대상 기록 수정 페이지로 이동 (`/record?...&edit={activeRecordId}`) |
| 삭제 | `DeleteConfirmModal` 열기 → 확인 시 대상 기록 삭제 + XP 차감 + 버블 공유 정리 + 홈 이동 |

`variant="food"` 스타일 적용.

### FAB 추가 동작 (기록 추가 진입)
- `/record?type=restaurant&targetId=...&name=...&meta=...&from=detail` 형태
- `type=restaurant`: 기록 타입 지정
- `targetId`, `name`, `meta`(장르·지역): 식당 선택 스킵용 사전 입력 데이터
- `from=detail`: 진입 경로
- 기록 수정 시: `edit={activeRecordId}` 파라미터 추가 (사분면 모드에 따라 대상 기록 변경)

### 하단 spacer
- 기록 있을 때: 140px (FAB + FabActions 클리어런스)
- 기록 없을 때: 80px (FAB만)

---

## 5. 뷰 모드 (3가지 상태)

페이지는 조건에 따라 3가지 뷰 모드로 렌더링됨:

| 모드 | 조건 | 달라지는 것 |
|------|------|------------|
| **내 기록** (`my_records`) | `myRecords.length > 0` | 점수 표시, 타임라인, 사분면, 메뉴 접이식, 축 뱃지, 수정/삭제 액션 |
| **버블 리뷰** (`bubble_review`) | `myRecords.length === 0 && bubbleScores.length > 0` | 내 점수 "—", 기록 빈 상태, 사분면 숨김, 메뉴 숨김, 버블 데이터 표시 |
| **추천** (`recommend`) | 위 둘 다 아님 | 내 점수 "—", 기록 빈 상태, 사분면 숨김, 메뉴 숨김, 버블 빈 상태 |

#### 뷰 모드 결정 로직
```typescript
if (myRecords.length > 0) → 'my_records'
else if (bubbleScores.length > 0) → 'bubble_review'
else → 'recommend'
```

### 모드별 섹션 가시성

| 섹션 | 내 기록 | 추천 | 버블 리뷰 |
|------|---------|------|----------|
| Layer 1 히어로 | ✅ | ✅ | ✅ |
| Layer 2 정보 | ✅ | ✅ | ✅ |
| Layer 3 점수 카드 | 2개 전부 값 있음 | 내점수 "—" | 내점수 "—", 버블 값 있음 |
| 버블 확장 패널 | ✅ (데이터 있으면) | 숨김 (데이터 없음→null) | ✅ |
| 뱃지 행 | ✅ | ✅ | ✅ |
| Layer 4 사분면 | ✅ (currentDot 있을 때) | 숨김 | 숨김 |
| 축 숙련도 뱃지 | ✅ (axisLevels 있을 때) | 숨김 | 숨김 |
| Layer 5 나의 기록 | 타임라인 | 빈 상태 | 빈 상태 |
| Layer 6 버블 기록 | 버블 데이터 | 빈 상태 | 버블 데이터 |
| Layer 7 정보 | ✅ (메뉴 접이식 포함) | ✅ (메뉴 접이식 없음) | ✅ (메뉴 접이식 없음) |
| FabActions (수정/삭제) | ✅ | 숨김 | 숨김 |

### 버블 모드 (`?bubble=[bubbleId]`)

일반 뷰 모드와 별도로, URL에 `bubble` 쿼리가 있으면 **버블 모드**가 활성화됨:

| 변경 사항 | 설명 |
|----------|------|
| **BubbleMiniHeader** | AppHeader 아래에 버블 컨텍스트 헤더 표시 |
| **ScoreCards 스왑** | 왼쪽: 버블 멤버 평균, 오른쪽: 내 점수 (역전) |
| **사분면** | "버블 멤버 평가"로 제목 변경, 멤버 dot 표시 (내 것만 컬러) |
| **버블 확장 패널** | 숨김 (버블 모드에서는 불필요) |

---

## 6. 빈 상태 패턴

| 섹션 | 빈 상태 | 비고 |
|------|---------|------|
| 점수 카드 | 2슬롯 유지, 값만 `—` 표시 (18px, `--border-bold`) | 레이아웃 불변 |
| 기록 | `search` 아이콘 + "아직 방문 기록이 없어요" + "우하단 + 버튼으로 첫 기록을 남겨보세요" | RecordTimeline 빈 상태 |
| 사분면 | 섹션 숨김 | 기록 있고 currentDot 있을 때만 표시 |
| 사진 | `UtensilsCrossed` 아이콘 + `--bg-elevated` 배경 | 28px lucide 아이콘 |
| 버블 기록 | `MessageCircle` 아이콘 + "아직 버블 기록이 없어요" | BubbleRecordSection 빈 상태 |

---

## 7. 레이아웃 & 구조

### 전체 레이아웃 흐름
```
content-detail (min-h-dvh, bg: --bg)
├─ AppHeader                       ← 공통 헤더
├─ BubbleMiniHeader?               ← 버블 모드에서만 (sticky top:46px)
│
├─ ┌ inner wrapper ─────────────────
│  ├─ HeroCarousel                 ← Layer 1 (사진 캐러셀, 224px)
│  ├─ ┌ detail-info wrapper ────────
│  │  ├─ 이름+장르+가격대           ← Layer 2 (padding 14px 20px 8px)
│  │  ├─ ScoreCards                ← Layer 3 (2슬롯, padding 0 20px 10px)
│  │  ├─ BubbleExpandPanel?        ← 일반 모드 + 데이터 있을 때만
│  │  └─ BadgeRow                  ← 뱃지 행
│  │
│  ├─ [Divider + 평가 사분면]?      ← Layer 4 (조건부: Divider와 사분면이 한 쌍)
│  ├─ Divider                      ← 항상 표시
│  ├─ AxisLevelBadge?              ← 축 숙련도 (조건부, px-5 pt-4)
│  ├─ RecordTimeline               ← Layer 5 (나의 기록)
│  ├─ Divider                      ← 8px
│  ├─ BubbleRecordSection          ← Layer 6 (버블 기록)
│  ├─ Divider                      ← 8px
│  ├─ RestaurantInfo               ← Layer 7 (정보, padding 16px 20px)
│  └─ spacer                       ← 140px 또는 80px
│
├─ DetailFab                       ← 뒤로 + 추가 FAB
├─ FabActions?                     ← 수정 + 삭제 (기록 있을 때만)
├─ DeleteConfirmModal              ← 삭제 확인 모달
└─ ShareToBubbleSheet              ← 버블 공유 시트 (현재 UI에서 트리거 미연결)
```

### Divider 컴포넌트
```
height: 8px
backgroundColor: #F0EDE8
```

### 토스트 알림
- `useToast()` 훅으로 토스트 표시 (`showToast()` 호출)
- 별도 `<Toast>` 컴포넌트를 직접 렌더하지 않음 — 프로바이더에서 관리

---

## 8. 인터랙션

| 인터랙션 | 상세 |
|---------|------|
| 캐러셀 스와이프 | 터치/마우스 40px 임계값, `translateX` 기반, 400ms ease-in-out |
| 사진 클릭 | 풀스크린 `PopupWindow` 팝업, 클릭으로 다음 사진 순환 |
| 버블 확장 패널 | `isOpen` 토글, 버블 모드에서는 숨김 |
| 메뉴 접이식 | display toggle, `ChevronDown` 180° 회전 (0.3s) |
| 지도 플레이스홀더 탭 | 카카오맵 외부 링크 오픈 |
| 좋아요 토글 | `WishlistButton` variant="hero" |
| 공유 | `navigator.share()` Web Share API |
| 기록 삭제 | `DeleteConfirmModal` → XP 이력 + 버블 공유 병렬 조회 → 기록 삭제 → XP 차감 → 버블 공유 삭제 토스트 → 남은 기록 확인 토스트 → `router.replace('/')` 홈 이동 |
| 기록 수정 | `/record` 페이지로 `type=restaurant&edit={activeRecordId}` 파라미터와 함께 이동 |
| 버블 공유 | `ShareToBubbleSheet` 렌더됨 — `handleShare`로 `canShare` 검증 로직 구현되어 있으나 현재 UI 버튼 미연결 |
| 연결 와인 탭 | 타임라인 내 와인 버튼 → `/wines/[id]` 이동 |
| 사분면 모드 토글 | 평균/최근 모드 전환 (기록 2개 이상일 때) — 참조 점과 dot이 모드에 따라 변경 |
| 사분면 참조 dot 탭 | 평균 모드: `onRefNavigate` — 다른 식당 상세 페이지로 이동 |
| 사분면 참조 dot 롱프레스 | 최근 모드: `onRefLongPress` — 해당 방문 기록으로 포커스 전환 |
| dot indicator 탭 | 다음 사진으로 순환 |

---

## 9. 데이터 소스

### Hook: `useRestaurantDetail(restaurantId, userId, repo)`

3단계 데이터 로딩:

| 단계 | 호출 | 병렬 |
|------|------|------|
| **Phase 1** | `repo.findById(restaurantId)` | 단독 |
| **Phase 2** | `repo.findMyRecords()` + `repo.findBubbleScores()` | `Promise.allSettled` 병렬 |
| **Phase 3** | `repo.findRecordPhotos()` + `repo.findQuadrantRefs()` + `repo.findLinkedWines()` | `Promise.allSettled` 병렬 (기록 있을 때만) |

### 파생값

| 값 | 계산 |
|----|------|
| `myAvgScore` | 만족도 있는 기록들의 `satisfaction` 평균 (Math.round) |
| `visitCount` | `myRecords.length` |
| `latestVisitDate` | `myRecords[0].visitDate` 또는 `createdAt.split('T')[0]` |
| `bubbleAvgScore` | `avgScore` 있는 버블들의 평균 (Math.round) |
| `bubbleCount` | `bubbleScores.length` |
| `viewMode` | 기록 있음 → `my_records`, 버블 있음 → `bubble_review`, 없음 → `recommend` |

### 컨테이너 로컬 상태

| 상태 | 타입 | 용도 |
|------|------|------|
| `bubbleExpanded` | `boolean` | 버블 확장 패널 토글 |
| `showDeleteConfirm` | `boolean` | 삭제 확인 모달 |
| `showShareSheet` | `boolean` | 버블 공유 시트 |
| `isDeleting` | `boolean` | 삭제 진행 중 |
| `quadrantMode` | `'avg' \| 'recent'` | 사분면 평균/최근 모드 토글 |
| `focusedRecordIdx` | `number` | 최근 모드에서 포커스된 기록 인덱스 (0 = 최신) |

### 추가 훅

| 훅 | 용도 |
|----|------|
| `useWishlist` | 찜 토글 (userId, restaurantId, 'restaurant', recordRepo) |
| `useAxisLevel` | 장르/지역 숙련도 배지 |
| `useShareRecord` | 대상 기록(`activeRecordId`) 버블 공유 가능 여부 + 공유 실행 |
| `useBubbleFeed` | 버블 모드에서 멤버 기록 조회 |
| `useBubbleDetail` | 버블 모드에서 버블 정보 조회 |
| `useToast` | 토스트 알림 표시 (`showToast()`) |

### DI 컨테이너 (`shared/di/container`)

| export | 용도 |
|--------|------|
| `restaurantRepo` | 식당 상세 데이터 조회 |
| `recordRepo` | 기록 CRUD (삭제, 남은 기록 조회) |
| `xpRepo` | XP 이력 조회/차감/삭제 |
| `bubbleRepo` | 기록 삭제 시 연관 버블 공유 조회 |

### UI 요소별 데이터 매핑

| UI 요소 | 소스 | 갱신 |
|---------|------|------|
| 식당 기본정보 | `restaurants` 테이블 (외부 API 캐시) | 주기적 |
| 내 점수 (평균) | `records.satisfaction` 평균 (user_id + target_id + target_type='restaurant') | 실시간 |
| 내 기록 타임라인 | `records` + `record_photos` (user_id + target_id) | 실시간 |
| 버블 점수 | `bubble_shares` → `records.satisfaction` 집계 | 실시간 |
| 평가 사분면 | records의 `axis_x`/`axis_y` + `satisfaction` 평균 | 실시간 |
| 참조 dot | 해당 유저의 다른 식당 records의 axis 평균 (최대 12개) | 실시간 |
| 연결 와인 | records의 `linked_wine_id` → wines 테이블 조인 | 실시간 |
| 뱃지 | `restaurants.michelin_stars`, `has_blue_ribbon`, `media_appearances` | 주기적 |
| 히어로 사진 | `restaurant.photos` 우선 → `recordPhotos` 폴백 | 실시간 |
