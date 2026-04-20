# RECORD_DETAIL — 기록 상세 페이지

> depends_on: DATA_MODEL, RATING_ENGINE, DESIGN_SYSTEM, XP_SYSTEM
> affects: HOME, RESTAURANT_DETAIL, WINE_DETAIL
> route: `/records/[id]` (미구현) — 현재는 `/record?edit={recordId}` (수정 모드)로 대체
> prototype: 없음 (식당/와인 상세 페이지 타임라인에서 탭하여 진입하는 화면)

---

## 1. 현재 상태

**기록 상세 전용 페이지(`/records/[id]`)는 아직 구현되지 않았다.**

현재 기록 정보를 확인하고 조작하는 방법:
- **식당 상세** (`/restaurants/[id]`) → `RecordTimeline` 컴포넌트로 기록 목록 표시. `onRecordTap` 미연결 (기록 탭 동작 없음). FabActions에서 최신 기록 수정/삭제 가능.
- **와인 상세** (`/wines/[id]`) → 커스텀 카드 레이아웃으로 기록 목록 표시. 기록 카드 탭 시 해당 기록 수정 모드 직접 진입. FabActions에서도 수정/삭제 가능.
- **기록 수정** → `/record?edit={recordId}&from=detail` (RecordFlowContainer)

### 인프라 준비 상태

기록 상세를 위한 **Application Hook**과 **Presentation 컴포넌트**는 이미 구현되어 있으나, Container와 Route가 없어 **모두 미사용 상태**이다:

| 레이어 | 파일 | 상태 |
|--------|------|------|
| Application Hook | `use-record-detail.ts` | ⚠️ 코드 완성 (Hook 미호출, 타입 export만 사용 중: `XpEarnedItem`, `LinkedTarget`) |
| Presentation 컴포넌트 | `record/mini-quadrant.tsx` | ⚠️ 코드 완성, 미사용 — 별도로 `home/mini-quadrant.tsx` (간소화 버전, 홈 카드에서 사용 중)이 존재 |
| | `satisfaction-gauge.tsx` | ⚠️ 코드 완성, 미사용 |
| | `aroma-display.tsx` | ⚠️ 코드 완성, 미사용 |
| | `pairing-display.tsx` | ⚠️ 코드 완성, 미사용 |
| | `record-practical-info.tsx` | ⚠️ 코드 완성, 미사용 |
| | `xp-earned-section.tsx` | ⚠️ 코드 완성, 미사용 |
| | `record-actions.tsx` | ⚠️ 코드 완성, 미사용 |
| | `delete-confirm-modal.tsx` | ✅ 사용 중 (RecordFlowContainer, 식당/와인 상세 Container) |
| | `record-nav.tsx` | ⚠️ 코드 완성, 미사용 |
| Container | `record-detail-container.tsx` | ❌ 미구현 |
| App Route | `src/app/(main)/records/[id]/page.tsx` | ❌ 미구현 |

> **`MiniQuadrant` 동명이 컴포넌트 2개 주의**:
> - `record/mini-quadrant.tsx`: 기록 상세용 (currentDot/refDots/targetType/onTap/onEdit). 미사용.
> - `home/mini-quadrant.tsx`: 홈 카드/버블 카드용 (axisX/axisY/satisfaction/accentColor/size). 실제 사용 중. dot 크기 6px 고정, 간소화 버전.

---

## 2. 와이어프레임

```
┌──────────────────────────────────────┐
│ [←]                          [⋯]    │  헤더 (계획: record-nav / 현재: AppHeader+FabBack)
│                                      │
│ 스시코우지                            │  대상명 (H2, 21px, weight 800)
│ 2026.03.19 · [데이트]                 │  방문일 + 상황 태그 칩
│                                      │
│ ── 사분면 ──────────────────────     │  Section 1: 미니 사분면
│ ┌──────────────────────────────────┐ │
│ │       경험↑                       │ │
│ │        |  ●                      │ │  이 기록 = 불투명, 고정 20px
│ │ 퀄리티↓┼── 퀄리티↑                │ │  다른 기록 = 반투명(30%), 14px
│ │   ○    |                         │ │
│ │       경험↓                       │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ── 만족도 ─────────────────────     │  Section 2: 게이지
│   별로 ━━━━━━━━━━━━━ 92 최고         │  만족도 색상 매핑, 1~100
│                                      │
│ ── 아로마 (와인만) ──────────────    │  Section 3: 아로마 휠
│ ┌──────────────────────────────────┐ │
│ │  [아로마 휠 readOnly]             │ │  AromaWheel readOnly 모드
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │  구조 평가 (있을 때만)
│ │ 복합성 ━━━ 68  여운 ━━ 7초+       │ │  GaugeBar 컴포넌트
│ │ 균형 ━━━━ 85                      │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ── 한줄평 ─────────────────────     │  Section 4 (있을 때만)
│ "분위기 최고, 코스 구성도 훌륭"       │
│                                      │
│ ── 사진 ──────────────────────      │  Section 5 (있을 때만)
│ [사진1] [사진2] [사진3]  →           │  가로 스크롤, 탭→풀스크린
│                                      │
│ ── 페어링 (와인만) ────────────     │  Section 6 (있을 때만)
│ [🥩 적색육] [🧀 치즈·유제품]          │  선택된 페어링 칩 (Lucide 아이콘)
│                                      │
│ ── 메뉴 태그 (식당만) ─────────      │  Section 7 (있을 때만)
│ [A코스] [런치세트] [오마카세]          │  태그 칩
│                                      │
│ ── 실용 정보 ─────────────────      │  Section 8
│ DollarSign ₩85,000 (1인)            │  가격 (Lucide 아이콘)
│ Users 김영수                         │  동반자
│ Calendar 2026.03.19                  │  방문일
│ Wine Château Margaux 2018            │  식당 기록: 연결된 와인
│ UtensilsCrossed 스시코우지            │  와인 기록: 연결된 식당
│                                      │
│ ── 경험치 ────────────────────      │  Section 9
│ 을지로 +5 XP  [Lv.4]                │  XpEarnedSection
│ 일식 +5 XP  [Lv.3]                  │
│                                      │
│ ── 액션 ──────────────────────      │  Section 10
│ [Edit2 수정] [Share2 공유] [Trash2 삭제]│  RecordActions (3 버튼)
│                                      │
│                          [h-20 여백] │
└──────────────────────────────────────┘
```

---

## 3. 섹션별 상세

### 헤더

> **Note**: `record-nav.tsx` 컴포넌트가 존재하지만 현재 **미사용 (dead code)**. 실제 기록 플로우(`RecordFlowContainer`)는 `AppHeader` + `FabBack` 조합을 사용한다. 아래는 `/records/[id]` 상세 페이지 구현 시 계획된 헤더 스펙.

| 요소 | 스펙 | 현재 상태 |
|------|------|----------|
| 뒤로 버튼 | `ChevronLeft` (22px) → 이전 페이지 | `FabBack`: fixed bottom-left, 44×44 원형, glassmorphism (`rgba(248,246,243,0.88)` + `blur(12px)`) |
| 더보기 | 계획: `more-horizontal` → 드롭다운: 수정, 삭제, 공유 | 미구현 |
| 앱 헤더 | — | `AppHeader`: nyam 로고 + 알림벨 + 레벨바 + 아바타 |

### 대상명 + 방문 정보

- **대상명**: 21px, weight 800
  - 식당: `var(--text)` 색상 → 탭 시 `/restaurants/[id]`
  - 와인: `var(--accent-wine)` 색상 → 탭 시 `/wines/[id]`
  - 와인: 와인명 + 생산자 + 빈티지 (있으면) — `LinkedTarget.subText`로 "생산자 · 빈티지" 포맷
- **방문일**: 12px, `var(--text-sub)`, YYYY.MM.DD 형식 (`visitDate ?? createdAt` 사용, `-` → `.` 변환)
- **상황 태그**: 칩 형태, 상황별 색상. `scene` 값 있을 때만 표시

**식당 상황 태그 6종** (`RestaurantScene`):

| 값 | 라벨 | CSS 변수 | 색상 |
|----|------|----------|------|
| `solo` | 혼밥 | `--scene-solo` | `#7A9BAE` |
| `romantic` | 데이트 | `--scene-romantic` | `#B8879B` |
| `friends` | 친구 | `--scene-friends` | `#7EAE8B` |
| `family` | 가족 | `--scene-family` | `#C9A96E` |
| `business` | 회식 | `--scene-business` | `#8B7396` |
| `drinks` | 술자리 | `--scene-drinks` | `#B87272` |

**와인 상황 태그 7종** (`WineScene`):

| 값 | 라벨 | CSS 변수 | 색상 |
|----|------|----------|------|
| `solo` | 혼술 | `--scene-solo` | `#7A9BAE` |
| `romantic` | 데이트 | `--scene-romantic` | `#B8879B` |
| `gathering` | 모임 | `--scene-friends` | `#7EAE8B` |
| `pairing` | 페어링 | `--scene-family` | `#C9A96E` |
| `gift` | 선물 | `--scene-business` | `#8B7396` |
| `tasting` | 테이스팅 | `--scene-drinks` | `#B87272` |
| `decanting` | 디캔팅 | `--scene-solo` | `#7A9BAE` |

### Section 1: 미니 사분면 (`MiniQuadrant`)

- 높이: h-48 (192px), max-w-[240px], mx-auto
- **이 기록의 점**: 불투명, `getGaugeColor(satisfaction)` fill, **고정 20px**
- **같은 대상의 다른 기록**: 반투명(30%), **고정 14px**, 동일 색상 규칙
- **축 라벨** (9px, `var(--text-hint)`):
  - 식당: 왼쪽 "퀄리티↓", 오른쪽 "퀄리티↑", 위 "경험↑", 아래 "경험↓"
  - 와인: 왼쪽 "구조↓", 오른쪽 "구조↑", 위 "감성↑", 아래 "감성↓"
- **좌표 계산**: `left: axisX%`, `bottom: axisY%`, `transform: translate(-50%, 50%)`
- 사분면 영역: `inset-4`, `rounded-lg`, dashed 십자선
- 기록 1개뿐이면 점 하나만 표시
- **빈 상태** (currentDot=null): 카드에 "사분면 평가를 추가해보세요" + 선택적 `[Edit2 평가하기]` 버튼
- **탭 동작**: `onTap` → 해당 식당/와인 상세 페이지로 이동

> **Note**: 만족도 = `(axisX + axisY) / 2` 자동 계산. 점 크기는 만족도와 무관하게 고정.

### Section 2: 만족도 게이지 (`SatisfactionGauge`)

- 가로 바 레이아웃: `[별로] ━━━━━━━ {숫자} ━━━ [최고]`
- 왼쪽 라벨: "별로" (기본값), 오른쪽 라벨: "최고" (기본값)
- 값 범위: 1~100 (clamped)
- 컬러: `getGaugeColor(value)` — default 채널 (= food, warm 모노톤 → 오렌지레드)
  - 0~20: `#C4B5A8` → 21~40: `#C8907A` → 41~60: `#C17B5E` → 61~80: `#B5603A` → 81~100: `#A83E1A`
  - **Note**: CSS 변수 `--gauge-1`~`--gauge-5`는 별도 색상 세트 (`#C4B5A8` → `#E8A87C` → `#E8913A` → `#E06B20` → `#D4451A`). `getGaugeColor()` 반환값과 다름.
- 바 너비 = `{value}%`, minWidth 32px
- 숫자 표시: `showNumber` (기본 true)

### Section 3: 아로마 (와인 기록만) (`AromaDisplay`)

- `aromaRegions`과 `aromaLabels`이 모두 있고 labels가 비어있지 않을 때만 표시
- **아로마 휠**: `AromaWheel` 컴포넌트 readOnly 모드
  - `aromaRegions` 키 → `AromaSectorId[]` 변환
  - `calculateAromaColor(activeIds)` → 가중 평균 hex 색상
- **구조 평가 바** (complexity, finish, balance 중 하나라도 있으면):
  - `rounded-xl p-3`, `bg-card` + border
  - `GaugeBar` 컴포넌트 3개:
    - "복합성": value + 숫자 라벨
    - "여운": value + `finishToSeconds(finish)` + "초+"
    - "균형": value + 숫자 라벨
  - 각 항목은 값이 null이면 숨김

### Section 4: 한줄평

- `comment` 필드 있을 때만 표시
- Body (1rem, `var(--text-sub)`), italic 스타일
- 최대 200자

### Section 5: 사진

- `record_photos` 있을 때만 표시
- 가로 스크롤, `order_index` 순
- 각 사진: `rounded-lg`, h-48 (192px)
- 탭 → 풀스크린 모달 (좌우 스와이프, 핀치 줌)

### Section 6: 페어링 (와인 기록만) (`PairingDisplay`)

- `pairingCategories` 있을 때만 표시 (빈 배열이면 null 반환)
- 선택된 페어링 카테고리를 칩으로 나열
- 칩 스타일: `rounded-full px-3 py-1.5`, `var(--accent-wine-light)` 배경, `var(--accent-wine-dim)` 테두리, `var(--accent-wine)` 텍스트
- **Lucide 아이콘 매핑**:

| 카테고리 | 라벨 | 아이콘 | 예시 |
|---------|------|--------|------|
| `red_meat` | 적색육 | `Beef` | 스테이크 · 양갈비 · 오리 · 사슴 |
| `white_meat` | 백색육 | `Drumstick` | 닭 · 돼지 · 송아지 · 토끼 |
| `seafood` | 어패류 | `Fish` | 생선 · 갑각류 · 조개 · 굴 · 초밥 |
| `cheese` | 치즈·유제품 | `Milk` | 숙성치즈 · 블루 · 브리 · 크림소스 |
| `vegetable` | 채소·곡물 | `Leaf` | 버섯 · 트러플 · 리조또 · 파스타 |
| `spicy` | 매운·발효 | `Flame` | 커리 · 마라 · 김치 · 된장 |
| `dessert` | 디저트·과일 | `Candy` | 다크초콜릿 · 타르트 · 건과일 |
| `charcuterie` | 샤퀴트리·견과 | `Nut` | 하몽 · 살라미 · 아몬드 · 올리브 |

### Section 7: 메뉴 태그 (식당 기록만)

- `menuTags` 있을 때: 태그 칩 (`rounded-full bg-neutral-100 px-3 py-1`)
- 없으면 섹션 숨김
- **Note**: `tips` 필드는 DiningRecord에 존재하지 않음. 비공개 메모(`privateNote`)는 별도 필드로 존재하나 기록 상세에서의 표시 방식은 미정

### Section 8: 실용 정보 (`RecordPracticalInfo`)

| 항목 | Lucide 아이콘 | 표시 | 조건 |
|------|-------------|------|------|
| 가격 | `DollarSign` | `₩{price.toLocaleString()} (1인/병)` — 식당: `totalPrice`, 와인: `purchasePrice` | 없으면 "---" |
| 동반자 | `Users` | 이름 쉼표 나열 (`companions.join(', ')`) | 있을 때만 (행 자체 숨김) |
| 방문일 | `Calendar` | `visitDate ?? createdAt` → YYYY.MM.DD | 항상 표시 |
| 연결된 와인 | `Wine` | 와인명 (밑줄, `var(--accent-wine)`) → 탭 시 와인 상세 | 식당 기록 + `linkedWineId` 시 |
| 연결된 식당 | `UtensilsCrossed` | 식당명 (밑줄, `var(--accent-food)`) → 탭 시 식당 상세 | 와인 기록 + `linkedRestaurantId` 시 |

- 아이콘 크기: 16px, 색상: `var(--text-hint)` (연결 아이템은 accent 색상)
- 텍스트: 14px, `var(--text)`
- 레이아웃: flex-col gap-2.5, 각 행 flex items-center gap-2.5

### Section 9: 경험치 (`XpEarnedSection`)

- `xp_histories`에서 `record_id`로 조회 + `user_experiences`에서 실제 레벨 조회
- 0건이면 컴포넌트 null 반환 (섹션 숨김)
- 헤더: "획득한 경험치" (h3, 15px, fontWeight 700)
- 각 항목:
  - 왼쪽: `{axisValue}` (13px)
  - 오른쪽: `+{xpAmount} XP` (13px, bold, `var(--accent-food)`) + `Lv.{currentLevel}` 뱃지
  - 레벨 뱃지: `rounded-full px-2 py-0.5`, 10px bold, `levelColor` 텍스트 + `{levelColor}15` 배경
- 레벨 색상: `getLevelColor(level)` (`xp-calculator.ts`)

### Section 10: 액션 (`RecordActions`)

- flex gap-3, 버튼 3개 (각 flex-1)
- 모든 버튼: `rounded-xl py-3`, `border: 1px solid var(--border)`, 14px fontWeight 600

| 버튼 | 아이콘 | 텍스트 | 색상 |
|------|--------|--------|------|
| 수정 | `Edit2` (16px) | "수정" | `var(--text)` |
| 공유 | `Share2` (16px) | "공유" | `var(--accent-social)` |
| 삭제 | `Trash2` (16px) | "삭제" | `var(--negative)` |

- **공유 버튼**: `onShare` prop이 있을 때만 렌더링

---

## 4. 수정 기능 (현재 구현)

현재 기록 수정은 `/records/[id]` 가 아닌 **`/record?edit={recordId}&from=detail`** 라우트에서 `RecordFlowContainer`가 처리한다.

### 수정 진입 경로

| 진입점 | 대상 기록 | 동작 |
|--------|----------|------|
| 식당 상세 FabActions "수정" | 최신 기록 (`myRecords[0]`) | `/record?edit={latestRecordId}&from=detail` |
| 와인 상세 FabActions "수정" | 선택된 기록 또는 최신 | `/record?edit={selectedRecordId or latest}&from=detail` |
| 와인 상세 기록 카드 탭 | 해당 기록 | 카드 탭 → `setSelectedRecordId` → 수정 모드 진입 |

### 수정 플로우

1. 상세 페이지에서 수정 트리거
2. `/record?edit={recordId}&from=detail` 로 이동
3. `RecordFlowContainer`가 기존 기록 + 사진 + 대상 정보 로드
4. `RestaurantRecordForm` 또는 `WineRecordForm`에 기존 데이터 pre-fill:
   - 사분면 위치 (axisX, axisY), 만족도
   - 상황 태그 (scene)
   - 코멘트, 동반자, 비공개 메모
   - 가격 (totalPrice/purchasePrice)
   - 방문일 (visitDate)
   - 식당: 메뉴 태그 (menuTags)
   - 와인: 아로마 (aromaRegions, aromaLabels, aromaColor), 구조 평가 (complexity, finish, balance), 페어링 (pairingCategories)
5. 사진: 기존 사진 `initExistingPhotos`로 로드 → 추가/삭제/크롭/순서변경 가능
6. 저장 시:
   - `recordRepo.update(recordId, updateData)`
   - 사진 차분 처리: DB 비교 → 삭제된 사진 Storage+DB 제거, 크롭 편집 사진 재업로드, 신규 사진 업로드
   - 식당 가격대 업데이트 (priceRange)
   - XP 재계산 (`awardXp` with `previousXp`)
   - 버블 자동 공유 동기화
7. 완료 후 → 식당/와인 상세 페이지로 이동 (`router.replace`)

---

## 5. 삭제 기능 (현재 구현)

삭제는 **두 곳**에서 가능하다:
- **RecordFlowContainer** (수정 모드): `/record?edit={recordId}` 에서 삭제 버튼
- **식당/와인 상세 페이지**: FabActions의 삭제 버튼 (식당: 최신 기록, 와인: 선택된 기록 or 최신)

### 삭제 플로우 A: 수정 모드에서 삭제 (RecordFlowContainer)

1. 수정 모드에서 삭제 버튼 탭 → `DeleteConfirmModal` 표시
2. **확인 모달** (`DeleteConfirmModal`):
   - `AlertDialog` (max-w-[320px], rounded-2xl, transition 200ms ease-in-out)
   - 제목: "기록을 삭제하시겠습니까?" (17px, fontWeight 700)
   - 설명: "이 기록을 삭제하면 경험치가 차감됩니다." (14px, `var(--text-sub)`)
   - 취소 버튼: flex-1, rounded-xl, py-3, `var(--border)` 테두리
   - 삭제 버튼: flex-1, rounded-xl, py-3, `var(--negative)` 배경, 흰색 텍스트
   - 삭제 중: "삭제 중..." + disabled (opacity-50)
3. 확인 시 (`handleDelete`):
   - **삭제 전** XP 이력 조회: `xpRepo.getHistoriesByRecord(recordId)` (CASCADE 삭제 대비)
   - `recordRepo.delete(recordId)` → `record_photos` ON DELETE CASCADE 자동 삭제
   - XP 차감 (best-effort, try/catch):
     - 전체 XP 합산: `histories.forEach(h => totalXpToDeduct += h.xpAmount)`
     - `xpRepo.updateUserTotalXp(userId, -totalXpToDeduct)` — **`users.total_xp`만 차감** (axis별 `user_experiences` 레벨 재계산은 하지 않음)
     - `xpRepo.deleteByRecordId(recordId)` (CASCADE로 이미 삭제된 경우 무시)
4. 삭제 후 → 토스트 "기록이 삭제되었습니다" → 800ms 후 홈(`/`)으로 이동
5. 삭제 실패 시 → 토스트 "삭제에 실패했습니다. 다시 시도해주세요."

### 삭제 플로우 B: 상세 페이지에서 삭제 (식당/와인 상세 Container)

1. 식당/와인 상세 페이지의 FabActions에서 삭제 버튼 탭 → `DeleteConfirmModal` 표시
2. 확인 시:
   - **삭제 전** XP 이력 조회: `xpRepo.getHistoriesByRecord(recordId)`
   - `recordRepo.delete(recordId)`
   - XP 차감 (best-effort): `xpRepo.updateUserTotalXp(userId, -totalXpToDeduct)` + `xpRepo.deleteByRecordId(recordId)`
3. 삭제 후 → 토스트 "기록이 삭제되었습니다" → 홈(`/`)으로 이동

> **삭제 대상 기록**:
> - 식당 상세: 항상 **최신 기록** (`myRecords[0]`)
> - 와인 상세: **`selectedRecordId`** (기록 카드를 먼저 탭했으면 해당 기록, 미선택 시 최신 기록 fallback)
>
> RecordFlowContainer와 동일한 XP 차감 패턴 (삭제 전 이력 조회, `total_xp`만 차감). Container별로 독립 구현.

---

## 6. `useRecordDetail` Hook (구현 완료, 미연결)

기록 상세 페이지용 Application Hook. Container가 구현되면 사용할 예정.

### 인터페이스

```typescript
// 반환 타입
interface RecordDetailState {
  record: DiningRecord | null
  photos: RecordPhoto[]
  targetInfo: LinkedTarget | null       // 대상 정보 (식당/와인)
  wineInfo: Wine | null                  // 와인 기록인 경우 전체 Wine 엔티티
  linkedItem: LinkedTarget | null        // 연결된 식당/와인
  otherRecords: DiningRecord[]           // 같은 대상의 다른 기록 (사분면 참조 점)
  xpEarned: XpEarnedItem[]              // 이 기록으로 획득한 XP
  isLoading: boolean
  error: string | null
  isDeleting: boolean
  deleteError: string | null
}

interface RecordDetailActions {
  deleteRecord: () => Promise<boolean>
}

// XP 이력 항목
interface XpEarnedItem {
  axisType: string       // 'genre' | 'area' | 'wine_region' | 'wine_variety'
  axisValue: string      // 예: '일식', '을지로'
  xpAmount: number
  currentLevel: number
  levelColor: string     // getLevelColor(level)
}

// 연결 대상
interface LinkedTarget {
  id: string
  name: string
  targetType: 'restaurant' | 'wine'
  subText: string | null  // 와인: "생산자 · 빈티지"
}
```

### 데이터 로딩 전략

```
1. 병렬: record + photos
2. record 로드 성공 후 4가지 병렬:
   a. 대상 정보 (식당: findById, 와인: findById + wineInfo 설정)
   b. 연결 아이템 (linkedWineId → wines, linkedRestaurantId → restaurants)
   c. 같은 대상의 다른 기록 (사분면 참조 점용)
   d. XP 이력 + user_experiences 레벨 조회
```

### 삭제 로직 (Hook 내장 — Container보다 상세)

```
1. recordRepo.delete(recordId) → record_photos CASCADE 삭제
2. xpRepo.getHistoriesByRecord(recordId)
3. axis별 XP 합산 → user_experiences 각 축 차감 + getLevelThresholds로 레벨 재계산
4. users.total_xp 차감
5. xp_histories 삭제
```

> **Note**: Hook은 레코드 삭제 후 XP 이력을 조회하므로, xp_histories에 CASCADE가 설정되어 있으면 이력이 이미 삭제되어 조회 불가할 수 있음. 현재 사용 중인 Container(`RecordFlowContainer`)는 삭제 전에 이력을 조회하여 이 문제를 회피함. 또한 Container는 `total_xp`만 차감하지만, Hook은 axis별 `user_experiences` 레벨까지 재계산하는 더 정밀한 차감 로직을 가짐.

---

## 7. 빈 상태 패턴

| 섹션 | 빈 상태 | 처리 |
|------|---------|------|
| 사분면 | `currentDot` = null (axisX/Y NULL) | "사분면 평가를 추가해보세요" + [Edit2 평가하기] |
| 아로마 | 와인 아닌 경우 or aromaRegions NULL or aromaLabels 빈 배열 | 컴포넌트 null 반환 (섹션 숨김) |
| 한줄평 | comment NULL | 섹션 숨김 |
| 사진 | record_photos 0개 | 섹션 숨김 |
| 페어링 | 와인 아닌 경우 or pairingCategories 빈 배열 | 컴포넌트 null 반환 (섹션 숨김) |
| 메뉴 태그 | menuTags NULL 또는 빈 배열 | 섹션 숨김 |
| 실용 정보 | 가격 null이면 "---" 표시, 동반자 없으면 행 숨김, 방문일은 항상 표시 | 부분 표시 |
| 경험치 | xpEarned 0건 | 컴포넌트 null 반환 (섹션 숨김) |

---

## 8. 인터랙션

| 인터랙션 | 상세 |
|---------|------|
| 스크롤 시 | 계획: 고정 헤더 (glassmorphism) + 대상명 (현재 미구현 — AppHeader는 고정이나 대상명 표시 없음) |
| 사진 탭 | 풀스크린 모달 (좌우 스와이프, 핀치 줌, [×] 닫기) |
| 사분면 탭 | `onTap` → 해당 식당/와인 상세 페이지로 이동 |
| 대상명 탭 | 상세 페이지 (`/restaurants/[id]` 또는 `/wines/[id]`) |
| 연결된 와인 탭 | `onLinkedItemTap(id, 'wine')` → `/wines/[id]` |
| 연결된 식당 탭 | `onLinkedItemTap(id, 'restaurant')` → `/restaurants/[id]` |
| 삭제 확인 모달 | `AlertDialog` (200ms ease-in-out), `onOpenChange` → `onCancel` |

---

## 9. 데이터 소스

| UI 요소 | 소스 | 필드/테이블 |
|---------|------|------------|
| 기록 기본정보 | `records` | axisX, axisY, satisfaction, scene, comment, visitDate, mealTime 등 |
| 사진 | `record_photos` | url, orderIndex, isPublic |
| 식당 정보 | `restaurants` | name, genre, area, address |
| 와인 정보 | `wines` | name, producer, vintage, wineType, region, country 등 |
| 사분면 좌표 | `records` | axisX, axisY + 동일 target의 다른 records |
| 아로마 | `records` | aromaRegions, aromaLabels, aromaColor |
| 구조 평가 | `records` | complexity, finish, balance |
| 페어링 | `records` | pairingCategories |
| 경험치 | `xp_histories` + `user_experiences` | axisType, axisValue, xpAmount, level |
| 와인 연결 | `records.linkedWineId` → `wines` | 식당 기록에서 와인 상세로 |
| 식당 연결 | `records.linkedRestaurantId` → `restaurants` | 와인 기록에서 식당 상세로 |

### DiningRecord 전체 필드 참조

```typescript
interface DiningRecord {
  id: string
  listId: string
  userId: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  // 사분면 평가
  axisX: number | null
  axisY: number | null
  satisfaction: number | null        // (axisX + axisY) / 2 자동 계산
  // 경험 데이터
  scene: string | null               // RestaurantScene | WineScene
  comment: string | null
  totalPrice: number | null           // 식당 총 가격 (1인)
  purchasePrice: number | null        // 와인 구매 가격 (병)
  visitDate: string | null
  mealTime: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
  // 메뉴/페어링
  menuTags: string[] | null           // 식당 전용
  pairingCategories: PairingCategory[] | null  // 와인 전용
  // GPS
  hasExifGps: boolean
  isExifVerified: boolean
  // 와인 전용
  cameraMode: 'individual' | 'shelf' | 'receipt' | null
  ocrData: Record<string, unknown> | null
  aromaRegions: Record<string, unknown> | null
  aromaLabels: string[] | null
  aromaColor: string | null
  complexity: number | null
  finish: number | null
  balance: number | null
  autoScore: number | null
  // 메타
  privateNote: string | null
  companionCount: number | null
  companions: string[] | null
  linkedRestaurantId: string | null
  linkedWineId: string | null
  recordQualityXp: number
  scoreUpdatedAt: string | null
  createdAt: string
  updatedAt: string
}
```

---

## 10. Phase 구분

### Phase 1 (현재)
- 기록 수정: `RecordFlowContainer` (`/record?edit={recordId}&from=detail`)
- 기록 삭제: RecordFlowContainer (수정 모드) + 식당/와인 상세 페이지 FabActions
- 기록 조회: 식당 상세 (`RecordTimeline`) / 와인 상세 (커스텀 카드 레이아웃) 내 인라인 표시
- 기록 상세 표시용 컴포넌트 + Hook 타입 구현 완료

### Phase 2 (미구현)
- `/records/[id]` 전용 라우트 + `RecordDetailContainer` 구현
- `useRecordDetail` Hook 연결
- [버블에 공유] 기능: `RecordActions.onShare` → 버블 선택 바텀시트 → `bubble_shares` INSERT
- 공유된 기록에 버블 아이콘 표시

---

## 11. 라우팅

### 현재 라우팅

```
/record?edit={recordId}&from=detail
  ← 식당 상세 FabActions "수정" (항상 최신 기록)
  ← 와인 상세 FabActions "수정" (선택된 기록 or 최신)
  ← 와인 상세 기록 카드 탭 (해당 기록)
  → / (삭제 완료 후 홈 이동)
  → /restaurants/{targetId} (수정 완료 후 식당 상세)
  → /wines/{targetId} (수정 완료 후 와인 상세)
```

### Phase 2 라우팅 (계획)

```
/records/[id]
  ← 홈 카드 탭
  ← 식당 상세 타임라인 아이템 탭
  ← 와인 상세 타임라인 아이템 탭
  ← 프로필 최근 기록 탭
  → /restaurants/[id] (대상명 탭, 사분면 탭 — 식당 기록)
  → /wines/[id] (대상명 탭, 사분면 탭 — 와인 기록)
  → /record?edit={id}&from=detail (수정하기)
```

---

## 12. 관련 파일 맵

| 레이어 | 파일 | 역할 |
|--------|------|------|
| Domain Entity | `src/domain/entities/record.ts` | DiningRecord, CreateRecordInput, PairingCategory 등 |
| | `src/domain/entities/record-photo.ts` | RecordPhoto, PendingPhoto, PHOTO_CONSTANTS |
| | `src/domain/entities/quadrant.ts` | QuadrantPoint, QuadrantReferencePoint, getGaugeLevel |
| | `src/domain/entities/aroma.ts` | AromaSectorId, AromaRing, AromaSelection |
| | `src/domain/entities/pairing.ts` | PAIRING_CATEGORIES (8종 메타데이터) |
| | `src/domain/entities/scene.ts` | RestaurantScene (6종), WineScene (7종), SCENE_TAGS |
| | `src/domain/entities/wine-structure.ts` | `WineStructure`, `finishToSeconds()` — 여운 초 환산 |
| Domain Service | `src/domain/services/xp-calculator.ts` | `getLevelColor()` — 레벨→색상 변환 |
| Domain Repository | `src/domain/repositories/record-repository.ts` | RecordRepository 인터페이스 |
| Infrastructure | `src/infrastructure/repositories/supabase-record-repository.ts` | Supabase 구현체 |
| Application Hook | `src/application/hooks/use-record-detail.ts` | 기록 상세 데이터 로딩 + 삭제 |
| | `src/application/hooks/use-create-record.ts` | 기록 생성 |
| | `src/application/hooks/use-photo-upload.ts` | 사진 업로드/관리 |
| | `src/application/hooks/use-xp-award.ts` | XP 적립 |
| Presentation Component | `src/presentation/components/record/mini-quadrant.tsx` | 기록 상세용 미니 사분면 (미사용) |
| | `src/presentation/components/home/mini-quadrant.tsx` | 홈 카드용 미니 사분면 (사용 중, 6px dot) |
| | `src/presentation/components/record/satisfaction-gauge.tsx` | 만족도 게이지 바 |
| | `src/presentation/components/record/aroma-display.tsx` | 아로마 휠 + 구조 평가 표시 |
| | `src/presentation/components/record/pairing-display.tsx` | 페어링 칩 표시 |
| | `src/presentation/components/record/record-practical-info.tsx` | 실용 정보 (가격, 동반자, 날짜, 연결 아이템) |
| | `src/presentation/components/record/xp-earned-section.tsx` | XP 이력 표시 |
| | `src/presentation/components/record/record-actions.tsx` | 수정/공유/삭제 액션 버튼 |
| | `src/presentation/components/record/delete-confirm-modal.tsx` | 삭제 확인 AlertDialog |
| | `src/presentation/components/record/record-nav.tsx` | 기록 상세 헤더 (dead code, 미사용) |
| | `src/presentation/components/detail/record-timeline.tsx` | 식당 상세 내 기록 타임라인 표시 |
| Container | `src/presentation/containers/record-flow-container.tsx` | 기록 생성/수정 플로우 (현재 삭제도 담당) |
| | `src/presentation/containers/restaurant-detail-container.tsx` | 식당 상세 (기록 수정/삭제 FabActions 포함) |
| | `src/presentation/containers/wine-detail-container.tsx` | 와인 상세 (기록 카드 탭→수정, 삭제 FabActions 포함) |
| App Route | `src/app/(main)/record/page.tsx` | 기록 생성/수정 페이지 |
| Shared Utility | `src/shared/utils/gauge-color.ts` | `getGaugeColor()` — 만족도→색상 변환 (MiniQuadrant, SatisfactionGauge에서 사용) |
| | `src/shared/utils/aroma-color.ts` | `calculateAromaColor()` — 아로마 섹터→가중 평균 색상 (AromaDisplay에서 사용) |
| DI | `src/shared/di/container.ts` | recordRepo, photoRepo, xpRepo 바인딩 |
