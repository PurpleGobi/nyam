# RESTAURANT_DETAIL — 식당 상세 페이지

> depends_on: DATA_MODEL, RATING_ENGINE, DESIGN_SYSTEM
> route: /restaurants/[id]
> prototype: `prototype/02_detail_restaurant.html`

---

## 1. 와이어프레임

```
┌──────────────────────────────────────┐
│ [←홈] nyam          bubbles 🔔 [J] │  top-fixed (glassmorphism)
│──────────────────────────────────────│
│ ┌──────────────────────────────────┐ │
│ │     사진 캐러셀 (h-56, 224px)    │ │  Layer 1: 히어로
│ │  ┌─────────┐                    │ │  히어로 썸네일 (좌하단)
│ │  │🍽 스시코우지│        [♡] [공유]│ │  좋아요/공유 (우하단)
│ │  └─────────┘    ●●●            │ │  dot indicator (하단 중앙)
│ └──────────────────────────────────┘ │
│                                      │
│ 식당명                                │  Layer 2: 정보
│ 장르 · 지역 · ₩₩₩                    │  메타 (한 줄)
│                                      │
│ ┌──────┐ ┌──────┐ ┌──────┐         │  Layer 3: 점수 카드 (항상 3슬롯)
│ │내 점수 │ │ nyam │ │ 버블 │         │  → 버블 카드 탭 시 확장 패널
│ │  87   │ │  88  │ │ 87 ③│         │
│ │ 3회   │ │웹+명성│ │평균·3│         │
│ └──────┘ └──────┘ └──────┘         │
│ ┌ 버블 확장 패널 (접힌 상태) ────┐     │
│ │ 🍴 직장맛집  3명 평가      90 │     │
│ │ 🍷 와인모임  2명 평가      82 │     │
│ │ 🏠 동네맛집  5명 평가      89 │     │
│ └──────────────────────────────┘     │
│                                      │
│ [★미슐랭] [◆블루리본] [📺수요미식회]   │  뱃지 행
│                                      │
│ ── 나의 기록 ────── 방문 3회 · 날짜  │  Layer 5: 내 기록 타임라인
│   ● 2026.03.15 [데이트]              │
│     92점 "분위기 최고" [📷][📷]       │
│   ● 2026.02.28 [회식]                │
│     78점 "코스가 아쉬움"              │
│   ● 2026.01.10 [혼밥]                │
│     85점 "런치세트 가성비"            │
│ ═══════════ divider ═══════════════  │
│ ── 내 식당 지도 ─── 리뷰한 식당 중    │  Layer 6: 포지션 맵
│   ┌─ 저렴 ────── 고가 ─┐            │
│   │ ●골목집    ●스시코우지│  포멀     │
│   │      ●몽탄  ●욘트빌  │           │
│   │            ●에오    │  캐주얼    │
│   └───────────────────┘            │
│ ═══════════ divider ═══════════════  │
│ ── 정보 ────────────────────────    │  Layer 7: 실용 정보
│   📍 서울 중구 을지로 XX길 12        │
│      [지도 iframe]                   │
│   🕐 영업 중 · 11:30–22:00          │
│   📞 02-1234-5678       [전화하기]   │
│   [▼ 메뉴 보기] (접이식)             │
│ ═══════════ divider ═══════════════  │
│ ── 연결된 와인 ──── 같이 즐긴 와인   │  Layer 8: 와인 연결
│   [가로 스크롤 카드]                  │
│ ═══════════ divider ═══════════════  │
│ ── 버블 기록 ──── Phase 2           │  Layer 9: 버블 기록
│   [전체] [직장맛집] [와인모임]         │  필터 칩
│   ┌ 버블 카드 ──────────────┐       │
│   │ 김 김영수 직장맛집버블 90점│       │
│   │ "여기 사케 페어링 필수"   │       │
│   │ 회식·3일전    ♡4 💬2     │       │
│   └────────────────────────┘       │
│                                      │
│ [←FAB]                    [+FAB]    │  좌하단 뒤로 / 우하단 기록 추가
└──────────────────────────────────────┘
```

---

## 2. 앱 헤더 (top-fixed)

상세 페이지에서도 공통 앱 헤더 사용. 서브페이지 모드로 전환.

### 구조
```
[← 홈]                   bubbles 🔔 [J]
```

| 요소 | 설명 |
|------|------|
| **뒤로 버튼** | `chevron-left` + 진입 경로명 텍스트 (16px, weight 600) |
| **진입 경로** | `?from=` 쿼리 파라미터로 판단 |
| **우측 액션** | bubbles 링크, 알림 벨, 아바타 (공통 헤더와 동일) |

### 진입 경로 매핑

| from 값 | 표시 텍스트 | 뒤로 이동 경로 |
|---------|-----------|--------------|
| `home` (기본값) | 홈 | `/` |
| `profile` | 프로필 | `/profile` |
| `bubble` | 버블 | `/bubbles/[id]` |
| `search` | 검색 | `/` (검색 상태 유지) |
| `recommend` | 추천 | `/` (추천 탭) |

### 스타일
- 배경: `rgba(248,246,243,0.55)` + `backdrop-filter: blur(20px) saturate(1.5)`
- 그림자: `0 1px 12px rgba(0,0,0,0.08)`
- 스크롤 위치와 관계없이 항상 동일한 glassmorphism 스타일

---

## 3. 섹션별 상세

### Layer 1: 히어로 (사진 캐러셀)

| 속성 | 값 |
|------|---|
| 높이 | `h-56` (224px) |
| 사진 없음 | `bg-neutral-100` + 장르 아이콘 |
| 스와이프 | 좌우 터치/마우스 드래그 |
| 자동 전환 | 4초 간격 |
| dot indicator | 하단 중앙, 활성 dot 16px 너비 |
| 하단 그라디언트 오버레이 | 80px, `linear-gradient(transparent, rgba(0,0,0,0.4))` — dot/액션 버튼 가독성 확보 |

#### 히어로 썸네일 (hero-thumb)
- **위치**: 캐러셀 좌하단 (`bottom: 14px; left: 16px`)
- **크기**: 160×110px, `border-radius: 12px` (가로형)
- **내용**: 장르 아이콘 (28px) + 식당명 (11px, weight 800, uppercase)
- **배경**: 대표 사진 cover
- **테두리**: `2.5px solid rgba(255,255,255,0.85)` + `box-shadow: 0 2px 12px rgba(0,0,0,0.25)`
- **숨김 동작**: 캐러셀 클릭 시 왼쪽으로 슬라이드아웃 (0.35s cubic-bezier), 캐러셀 외부 클릭 시 복귀

#### 좋아요/공유 버튼
- **위치**: 캐러셀 우하단 (`bottom: 10px; right: 12px`)
- **스타일**: 배경 없음, 흰색 아이콘 (`rgba(255,255,255,0.85)`)
- **좋아요 토글**: 활성 시 `#FF6038` (brand 색상)
- **아이콘**: `heart` (20px), `share-2` (20px)

### `.detail-info` 컨테이너 (Layer 2 + 3 + 뱃지 통합)

Layer 2 (정보), Layer 3 (점수 카드), 버블 확장 패널, 뱃지 행은 하나의 `.detail-info` 컨테이너 안에 포함된다. `.section`이 아닌 별도 컨테이너이며, padding `0 20px`.

> Layer 5 이후의 섹션들은 `.section` (padding `16px 20px`)을 사용하지만, 이 영역은 다른 구조.

### Layer 2: 정보 (일관된 레이아웃)

**기록 유무에 관계없이 항상 동일한 구조.**

| 요소 | 스타일 |
|------|--------|
| 이름 | 21px, weight 800, `--text` |
| 메타 | `장르 · 지역 · 가격대` (12px, `--text-sub`, 한 줄) |
| 가격대 | 12px, weight 700, `--text` (강조) |
| 구분자 | `·` (8px, `--border-bold`), margin `0 5px` |
| 패딩 | `14px 0 8px` |

### Layer 3: 점수 카드 (항상 3슬롯)

**모든 상태에서 3개 카드를 나란히 표시. 값만 상태에 따라 변경.**

#### 점수 카드 컨테이너
```
display: flex
gap: 8px
padding: 0 0 10px
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
| 점수 | 24px, weight 800, `--primary` |
| 점수 (빈) | 18px, `--border-bold`, "—" 표시 |
| 부가 텍스트 | 9px, `--text-hint` |

#### 3가지 상태별 값

| 상태 | 내 점수 카드 | nyam 카드 | 버블 카드 |
|------|------------|----------|----------|
| **내 기록 있음** | 평균 점수 (크게) / "N회 방문" | nyam 점수 / "웹+명성" | 버블 평균 / "평균 · N개" + 카운트 뱃지 |
| **미방문 + 버블 없음** | "—" / "미방문" | nyam 점수 / "웹+명성" | "—" / 빈 상태 (카운트 뱃지 없음) |
| **미방문 + 버블 있음** | "—" / "미방문" | nyam 점수 / "웹+명성" | 버블 평균 / "N개 버블" + 카운트 뱃지 |

#### 버블 카드 상세
- **카운트 뱃지**: 우상단 `top: -4px; right: -4px`, 16px 원형, `--accent-social` 배경, 흰색 숫자 (9px weight 700), `1.5px solid --bg` 테두리
- **탭 동작**: 확장 패널 토글 (다른 확장 패널은 자동 닫힘)
- **active 시**: `border-color: --accent-social`

#### 버블 확장 패널
점수 카드 아래에 위치. `max-height` 트랜지션으로 열고 닫힘 (0.25s ease).

```
컨테이너: padding 0 0 10px, flex column, gap 6px
열림: max-height 200px
닫힘: max-height 0, overflow hidden
```

각 버블 점수 행:
```
[아이콘 24px] [버블명 + N명 평가] [점수 16px bold]
```

| 요소 | 스타일 |
|------|--------|
| 아이콘 | 24px 정사각, radius 6px, 버블 테마색 light 배경, 아이콘 12px |
| 버블명 | 12px, weight 500, `--text` |
| 평가 수 | 10px, `--text-hint` |
| 점수 | 16px, weight 800, `--primary` |
| 행 스타일 | flex, align-center, gap 8px, `bg-card`, border, radius 8px, padding 6px 10px |

#### nyam 점수 산출 로직 (식당)

| 요소 | 가중치 |
|------|--------|
| 네이버 (N) | 40% |
| 카카오 (K) | 30% |
| 구글 (G) | 30% |
| → 가중평균 × 20 | = 100점 환산 |
| 명성 보너스 | 미슐랭 +8, 블루리본 +5, TV +3 (상한 15) |
| 최종 | 웹점수 × 0.82 + 명성 × 1.15 |

- N/K/G 점수는 별도 칩으로 표시하지 않음 → nyam 점수 클릭 시 산출식 팝업으로 확인
- 명성 뱃지(미슐랭, 블루리본, TV)는 별도 행에 표시

### 뱃지 행

| 속성 | 값 |
|------|---|
| 패딩 | `0 0 10px` |
| 레이아웃 | flex, gap 5px, flex-wrap |
| 조건 | 있을 때만 표시, 없어도 레이아웃 영향 없음 |

| 뱃지 | 배경 | 텍스트 | 보더 |
|------|------|--------|------|
| 미슐랭 | `#FDF6EC` | `#B8860B` | `#E8DDCA` |
| 블루리본 | `#EDF2FB` | `#4A6FA5` | `#D0DCF0` |
| TV | `#FFF3F0` | `--brand` | `#F0D8D0` |

뱃지 pill: padding `3px 9px`, radius 20px, font 10px weight 600, 아이콘 10px

### Layer 5: 나의 기록

**섹션 헤더**: "나의 기록" + 우측 "방문 N회 · 최근 YYYY.MM.DD"

#### 기록 있음: 타임라인
```
│ (세로선: linear-gradient primary → 투명)
● 2026.03.15  [데이트]
  92점 "분위기 최고, 오마카세 감동"
  [📷] [📷]
● 2026.02.28  [회식]
  78점 "코스가 아쉬움"
● 2026.01.10  [혼밥]
  85점 "런치세트 가성비 좋다"
```

| 요소 | 스타일 |
|------|--------|
| 세로선 | `left: 6px`, width 2px, `linear-gradient(to bottom, --primary, #D4A089, transparent)` |
| 타임라인 dot | 12px 원, 2px `--bg` 보더 + `box-shadow: 0 0 0 2px` 외부 링 |
| 날짜 | 11px, `--text-sub`, flex row with gap 6px |
| 상황 칩 | padding `2px 8px`, radius 20px, 10px weight 600, 흰색 텍스트, 상황별 배경색 |
| 점수 | 13px, weight 700 |
| 한줄평 | 12px, `--text-sub`, inline |
| 사진 썸네일 | 44×44px, radius 6px, gap 6px |
| 아이템 간격 | `margin-bottom: 18px` (마지막 아이템 0) |
| 탭 동작 | 기록 상세 화면으로 이동 |

#### 타임라인 dot·점수 색상 규칙

각 타임라인 아이템의 **dot 색상과 점수 색상은 항상 동일** (일관된 색상 페어링).

- **CSS 기본값**: `--primary` (#C17B5E) — dot background + box-shadow + 점수 color 모두 적용
- **상황별 오버라이드**: 아이템별로 inline style로 dot과 점수 색상을 상황 태그 색상으로 변경 가능

| 상황 태그 | CSS 변수 | 색상 | dot/점수 오버라이드 |
|----------|---------|------|------------------|
| 혼밥/혼술 | `--scene-solo` | `#7A9BAE` | `var(--accent-social)` |
| 데이트 | `--scene-romantic` | `#B8879B` | `var(--scene-romantic)` |
| 친구/모임 | `--scene-friends` | `#7EAE8B` | `var(--positive)` |
| 가족 | `--scene-family` | `#C9A96E` | `var(--caution)` |
| 회식/접대 | `--scene-business` | `#8B7396` | `var(--wine)` |
| 술자리 | `--scene-drinks` | `#B87272` | `var(--negative)` |

> 목업에서는 최근 기록이 기본 `--primary`를 사용하고, 이전 기록들이 상황 태그 색상으로 오버라이드됨. 구현 시 모든 기록에 상황 태그 기반 색상을 적용하는 것을 권장.

#### 기록 없음
```
🔍 (28px, --text-hint)
"아직 방문 기록이 없어요" (14px, weight 600, --text-sub)
"우하단 + 버튼으로 첫 기록을 남겨보세요" (12px, --text-hint)
```

### Layer 6: 내 식당 지도 (포지션 맵)

**내가 리뷰한 식당이 2곳 이상일 때만 표시.** (이 식당의 방문 횟수가 아니라, 유저가 기록한 서로 다른 식당 수 기준)

- **섹션 제목**: "내 식당 지도"
- **부제**: "리뷰한 식당 중 위치"
- **목적**: 내가 리뷰한 식당들 사이에서 현재 식당의 상대적 위치를 2D 좌표로 시각화

#### 차트 영역
```
패딩: 16px
배경: --bg-card, radius 12px, border
차트: --bg-elevated, radius 8px, border
비율: padding-bottom 80% (4:5 비율)
```

#### 축
| 축 | 왼쪽/위 | 오른쪽/아래 |
|----|---------|-----------|
| X축 | 저렴 | 고가 |
| Y축 | 포멀 | 캐주얼 |

축 라벨: 9px, `--text-sub`, weight 500. 십자선: 1px, `--border`

#### 점 (dot)

| 종류 | 크기 | 스타일 | z-index |
|------|------|--------|---------|
| **현재 식당** (current) | 38px | `--primary` 배경, 3px `--primary-light` 보더, `#fff` 텍스트, weight 800, 11px | 10 |
| **참조 식당** (ref) | 28px | `--border-bold` 배경, 2px `--border` 보더, `--text` 텍스트, opacity 0.35, weight 600, 8px | 5 |

- 현재 식당 dot: `box-shadow: 0 2px 10px rgba(193,123,94,0.4)`
- 참조 dot hover: opacity 0.7, scale 1.15
- 각 dot 아래 식당명 라벨: 9px `--text-hint` (현재 식당: 10px `--text-sub` weight 700)
- dot 내부에 점수 숫자 표시

#### 하단 설명
```
ℹ️ (12px, --text-hint) "내가 리뷰한 비슷한 가격대·지역 식당과의 상대적 위치"
```

### Layer 7: 실용 정보

**섹션 제목**: "정보"

| 행 | 아이콘 | 내용 | 액션 |
|----|--------|------|------|
| 주소 | `map-pin` | 주소 텍스트 + 미니 지도 iframe | 탭 → 외부 지도 앱 |
| 영업 | `clock` | `영업 중` (`--positive`, weight 600) · 시간 | — |
| 전화 | `phone` | 전화번호 | "전화하기" (`--primary`, weight 600) |
| 메뉴 | — | 접이식 버튼 (내 기록 모드에서만 표시) | 토글 |

> **미방문 상태 (추천/버블 리뷰 모드)에서는 메뉴 접이식 버튼이 표시되지 않음.**
> 주소+지도, 영업시간, 전화번호는 모든 모드에서 동일하게 표시.

#### 정보 행 공통 스타일
```
display: flex, align-items: flex-start, gap: 10px
padding: 8px 0
border-bottom: 1px solid #F0EDE8 (마지막 행 제외)
font-size: 13px
아이콘: 16px, --text-sub, flex-shrink 0
```

#### 미니 지도
- 높이: 120px, radius 8px
- `pointer-events: none` (탭 시 외부 지도로 이동하려면 래퍼에 이벤트 처리)

#### 메뉴 보기 (접이식)
- 버튼: `#F0EDE8` 배경, radius 8px, 13px weight 600, 화살표 아이콘 (rotation 0→180°, 0.3s)
- 내용: 메뉴명 + 가격, 행별 `border-bottom: 1px solid #F0EDE8`
- 트랜지션: display toggle

### Layer 8: 연결된 와인

**이 식당에서 와인 기록이 있을 때만 표시.**

- **섹션 제목**: "연결된 와인"
- **부제**: "같이 즐긴 와인"

#### 가로 스크롤 카드
```
카드 너비: 130px
배경: --wine-light
border: 1px solid #DDD6E3
border-radius: 12px
padding: 10px
```

| 요소 | 스타일 |
|------|--------|
| 와인 라벨 | 100% × 56px, 보라 그라디언트 배경, radius 6px, wine 아이콘 (20px) |
| 와인명 | 11px, weight 600, `--wine`, line-height 1.3 |
| 점수 | 11px, `--text-sub`, 점수 bold `--wine` |

탭 → 와인 상세 페이지로 이동

### Layer 9: 버블 기록 (Phase 2)

- Phase 1: 빈 상태만 표시
- Phase 2: 필터 + 버블 카드 목록

#### 필터 칩
- pill 형태: padding `5px 12px`, radius 20px, 11px weight 500
- 비활성: `--bg` 배경, `1.5px solid --border`, `--text-sub`
- 활성: `--primary-light` 배경, `1.5px solid --primary`, `--primary` 텍스트
- 단일 선택 (전체 / 버블명별)

#### 버블 카드
```
┌─────────────────────────────────────┐
│ [아바타32] 유저명              90점  │
│            버블명                    │
│ "한줄평 텍스트"                      │
│ 상황·시간               ♡4  💬2    │
└─────────────────────────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 카드 | `--bg-card`, radius 12px, border, padding 12px, margin-bottom 8px |
| 아바타 | 32px 원형, 그라디언트 배경 (유저별), 이니셜 (14px weight 700 흰색) |
| 유저명 | 12px, weight 600, `--text` |
| 버블명 | 10px, `--text-sub` |
| 점수 | 14px, weight 700, `--primary` |
| 한줄평 | 12px, `--text-sub`, line-height 1.5 |
| 메타 | 10px, `--text-hint` (상황 · 시간) |
| 리액션 | 11px, `--text-sub`, `heart`/`message-circle` 12px |
| 탭 | `transform: scale(0.98)` |

---

## 4. FAB (Floating Action Buttons)

**2개 FAB: 좌하단 뒤로 + 우하단 기록 추가**

### 공통 스타일
```
position: absolute
bottom: 28px
width: 44px, height: 44px
border-radius: 50%
background: rgba(248,246,243,0.88)
backdrop-filter: blur(12px)
border: 1px solid --border
box-shadow: 0 2px 12px rgba(0,0,0,0.12)
active: scale(0.9)
z-index: 85
```

| FAB | 위치 | 아이콘 | 동작 |
|-----|------|--------|------|
| 뒤로 | `left: 16px` | `chevron-left` (22px) | `history.back()` |
| 추가 | `right: 16px` | `plus` (22px) | 기록 추가 진입 |

### FAB 추가 동작 (컨텍스트 인식)
- **내 기록 있을 때**: 식당 선택 스킵 → 바로 사분면 평가 → "새 방문 추가"
- **미방문 상태**: 식당 선택 스킵 → 바로 사분면 평가 → "첫 기록 남기기"
- 기록 수정은 개별 기록 탭에서 진행 (FAB와 무관)

---

## 5. 뷰 모드 (3가지 상태)

페이지는 조건에 따라 3가지 뷰 모드로 렌더링됨:

| 모드 | 조건 | 달라지는 것 |
|------|------|------------|
| **내 기록** | 내가 방문/시음 기록이 있을 때 | 점수 카드 전체 표시, 타임라인, 사분면, 와인 연결 |
| **추천** | 미방문 + 버블 기록 없음 | 내 점수 "—", 기록 빈 상태, 사분면 숨김, 와인 숨김, 버블 빈 상태 |
| **버블 리뷰** | 미방문 + 버블 기록 있음 | 내 점수 "—", 기록 빈 상태, 사분면 숨김, 와인 숨김, 버블 데이터 표시 |

### 모드별 섹션 가시성

| 섹션 | 내 기록 | 추천 | 버블 리뷰 |
|------|---------|------|----------|
| Layer 1 히어로 | ✅ | ✅ | ✅ |
| Layer 2 정보 | ✅ | ✅ | ✅ |
| Layer 3 점수 카드 | 3개 전부 값 있음 | 내점수 "—" | 내점수 "—", 버블 값 있음 |
| 뱃지 행 | ✅ | ✅ | ✅ |
| Layer 5 나의 기록 | 타임라인 | 빈 상태 | 빈 상태 |
| Layer 6 사분면 | ✅ (기록 2+) | 숨김 | 숨김 |
| Layer 7 정보 | ✅ (메뉴 접이식 포함) | ✅ (메뉴 접이식 없음) | ✅ (메뉴 접이식 없음) |
| Layer 8 와인 연결 | ✅ (있을 때) | 숨김 | 숨김 |
| Layer 9 버블 기록 | 버블 데이터 | 빈 상태 | 버블 데이터 |

---

## 6. 빈 상태 패턴

| 섹션 | 빈 상태 | 비고 |
|------|---------|------|
| 점수 카드 | 3슬롯 유지, 값만 `—` 표시 (18px, `--border-bold`) | 레이아웃 불변 |
| 기록 | `search` 아이콘 + "아직 방문 기록이 없어요" + "우하단 + 버튼으로 첫 기록을 남겨보세요" | padding 40px 20px |
| 사분면 | 섹션 숨김 | 기록 2개+ 시 표시 |
| 사진 | 장르 아이콘 + neutral-100 | — |
| 와인 연결 | 섹션 숨김 | 기록 있을 때만 |
| 버블 기록 | `message-circle` 아이콘 + "아직 버블 기록이 없어요" + "버블에서 이 식당에 대한 이야기를 나눠보세요" | padding 40px 20px |

---

## 7. 레이아웃 & 구조

### 전체 레이아웃 흐름
```
scroll-content (padding-top: 80px)
├─ hero-wrap           ← Layer 1 (히어로 캐러셀)
├─ .detail-info        ← Layer 2+3+뱃지 (padding 0 20px, NOT .section)
├─ .section            ← Layer 5 (나의 기록)
├─ .divider            ← 8px
├─ .section            ← Layer 6 (내 식당 지도) — 기록 2+ 시만
├─ .divider            ← 8px
├─ .section            ← Layer 7 (정보)
├─ .divider            ← 8px
├─ .section            ← Layer 8 (연결된 와인) — 있을 때만
├─ .divider            ← 8px
├─ .section            ← Layer 9 (버블 기록)
└─ .bottom-spacer      ← 80px (FAB 클리어런스)
```

> `.detail-info`와 Layer 5 `.section` 사이에는 divider가 없음. 첫 divider는 Layer 5와 Layer 6 사이.

### 섹션 구분
- `.section` padding: `16px 20px`
- `.section` margin-top: `8px`
- `.section` 배경: `--bg`
- divider: `height: 8px; background: #F0EDE8`

### 섹션 헤더
```
[섹션 제목 15px w700]        [메타 12px --text-sub]
margin-bottom: 14px
```

### 스크롤 영역
- `padding-top: 80px` (top-fixed 높이만큼)
- 하단 여백: `80px` (FAB 클리어런스)

---

## 8. 인터랙션

| 인터랙션 | 상세 |
|---------|------|
| 헤더 | 항상 glassmorphism 고정 (스크롤 위치 무관) |
| 캐러셀 스와이프 | 터치 40px / 마우스 30px 임계값, 0.4s ease 트랜지션 |
| 캐러셀 자동전환 | 4초 간격, 순환 |
| 히어로 썸네일 | 캐러셀 클릭 → 슬라이드아웃, 외부 클릭 → 복귀 (0.35s cubic-bezier) |
| 버블 확장 패널 | `max-height` 0→200px, 0.25s ease. 하나만 열림 (배타적) |
| 메뉴 접이식 | display toggle, 화살표 180° 회전 (0.3s) |
| 타임라인 아이템 탭 | 기록 상세 화면으로 이동 |
| 버블 카드 탭 | `scale(0.98)` 피드백 |
| FAB | `scale(0.9)` + shadow 축소 on active |
| 좋아요 토글 | `liked` 클래스 토글 → `#FF6038` |
| 필터 칩 | 단일 선택, 즉시 전환 |
| 알림 드롭다운 | 오버레이 + blur, 알림 목록, 읽음/수락/거절 처리 |

---

## 9. 데이터 소스

| UI 요소 | 소스 | 갱신 |
|---------|------|------|
| 식당 기본정보 | restaurants 테이블 (외부 API 캐시) | 2주 |
| 외부 평점 | restaurants.naver_rating / kakao_rating / google_rating | 2주 |
| nyam 점수 | restaurants.nyam_score (외부 평점 + 명성 보너스 계산, 캐시) | 2주 |
| 내 점수 (평균) | records.satisfaction 평균 (user_id + target_id + target_type='restaurant') | 실시간 |
| 내 기록 타임라인 | records + record_photos (user_id + target_id) | 실시간 |
| 버블 점수 | bubble_shares → records.satisfaction 집계 | 실시간 |
| 포지션 맵 | 해당 유저의 모든 식당 records의 axis_x/y + satisfaction | 실시간 |
| 와인 연결 | records (linked_restaurant_id = 현재 식당, target_type='wine') | 실시간 |
| 뱃지 | restaurants.michelin_stars, has_blue_ribbon, media_appearances | 2주 |
