# RATING_ENGINE — 사분면 평가 시스템

> affects: RECORD_FLOW, SEARCH_REGISTER, RESTAURANT_DETAIL, WINE_DETAIL, HOME, RECOMMENDATION, PROFILE
> 비주얼 레퍼런스: `prototype/01_home.html` (screen-rest-record, screen-wine-record), `prototype/00_design_system.html` (§15, §15b)

---

## 1. 핵심 개념

### 식당 평가 (Quick)
**하나의 평가 = (X%, Y%, 만족도, 상황태그)**
- ~3초 안에 완료되는 4차원 데이터
- 사분면 위치(음식 퀄리티×경험 가치) + 만족도((x+y)/2 자동 산출) + 상황 태그

### 와인 평가 (Deep)
**하나의 평가 = (X%, Y%, 만족도, 아로마, 품질평가(BLIC), 페어링)**
- WSET 체계적 시음 기반
- 사분면(구조·완성도×즐거움·감성) + 아로마 팔레트 + 품질평가(균형·여운·강도·복합성) + 페어링 카테고리

---

## 2. 사분면 축 정의

### 식당
| 축 | 0% | 100% | 의미 |
|----|-----|------|------|
| X축: 음식 퀄리티 | 아쉬움 | 훌륭함 | 맛 중심의 음식 품질 |
| Y축: 경험 가치 | 낮음 | 높음 | 서비스 + 분위기 + 가성비 종합 |
| 만족도 | 1 | 100 | (axis_x + axis_y) / 2 자동 산출 |

```
           경험 가치 높음
              ↑
맛은 아쉽지만  |  맛도 좋고
경험이 좋은    |  경험도 좋은
              |
음식 아쉬움 ──┼── 음식 훌륭함
              |
전반적으로    |  경험은 아쉽지만
아쉬운       |  맛이 좋은
              ↓
           경험 가치 낮음
```

### 와인
| 축 | 0% | 100% | 의미 |
|----|-----|------|------|
| X축: 구조·완성도 | 낮음 | 높음 | "이 와인은 객관적으로 얼마나 잘 만들어졌나" |
| Y축: 즐거움·감성 | 낮음 | 높음 | "내가 실제로 마시면서 얼마나 만족했나, 가격 포함" |
| 만족도 | 1 | 100 | (axis_x + axis_y) / 2 자동 산출 |

```
         즐거움·감성 높음
              ↑
완성도는 아쉽지만|  잘 만들어졌고
마시면서 좋았던  |  마시면서도 좋은
              |
구조 낮음 ────┼──── 구조 높음
              |
전반적으로    |  잘 만들어졌지만
아쉬운       |  감흥이 적은
              ↓
         즐거움·감성 낮음
```

---

## 3. 조작 플로우

### 사분면 UI 레이아웃
좌측에 **세로 바 게이지 2개** (X축, Y축) + 총점 표시, 우측에 **사분면 영역** (1:1 비율).
바 게이지와 사분면 모두 인터랙티브하며, 어느 쪽을 조작해도 값이 동기화된다.

| 단계 | 행동 | 제스처 | 시간 |
|------|------|--------|------|
| 1. 탭/드래그 | 사분면에서 위치 선택·이동, 또는 바 게이지 터치 | 자유 드래그 | ~1초 |
| 2. 수치 확인 | 축 값 + 만족도((x+y)/2) 실시간 표시 | — | — |
| 3. 완료 | 저장 버튼 | 1-finger tap | ~0.3초 |

> 만족도는 (axis_x + axis_y) / 2로 자동 산출. 별도 만족도 조절 제스처 없음.

### 제스처 구분
- **사분면 위치 이동**: 점을 사분면 내에서 자유롭게 드래그 → X%, Y% 실시간 갱신
- **바 게이지 터치**: 좌측 세로 바를 터치/드래그하여 개별 축 값 조절
- **만족도**: 위치 이동 시 (x+y)/2로 자동 계산, 실시간 갱신
- 사분면 영역 탭 → 점이 해당 위치로 이동 (위치 재설정)
- `가이드` 버튼 → 사분면 영역 라벨(4분면 설명) 토글 표시

### 사분면 모드 (상세 페이지)
- **평균** / **최근** 모드 전환 가능 (상세 페이지에서 참조 점 표시 방식 변경)

---

## 4. 점(Dot) 비주얼 스펙

### 게이지 색상 (채널 기반 5단계)

DESIGN_SYSTEM "만족도 게이지 색상" 정의. 채널별 색상 계열로 분리.

| 채널 | 1단계 (0~20) | 2단계 (21~40) | 3단계 (41~60) | 4단계 (61~80) | 5단계 (81~100) | 계열 |
|------|-------------|---------------|---------------|---------------|----------------|------|
| 음식(food) | `#C4B5A8` | `#C8907A` | `#C17B5E` | `#B5603A` | `#A83E1A` | 코랄 계열 |
| 경험(experience) | `#B5B0BA` | `#A08DA8` | `#8B7396` | `#7A5A8E` | `#6B3FA0` | 보라 계열 |
| 종합(total, 식당) | `#C4BCA8` | `#D4B85C` | `#E0A820` | `#D49215` | `#C87A0A` | 골드 계열 |
| 종합(total, 와인) | `#D8D0E0` | `#D0B0E8` | `#C090E0` | `#B070D8` | `#A050D0` | 밝은 보라 계열 |

- 각 채널은 5단계 색상으로 구분 (getStepIndex로 결정)
- 사분면 점 색상 채널: 식당 → `total` (골드), 와인 → `wine-total` (밝은 보라)
- 좌측 바 게이지: X축 → `food` 채널, Y축 → `experience` 채널

**레벨별 게이지 색상** (CSS 변수 / Tailwind 매핑용, 채널 무관):
| 단계 | 범위 | 색상 | CSS 변수 |
|------|------|------|---------|
| 1 | 0~20 | `#C4B5A8` | `--gauge-1` |
| 2 | 21~40 | `#E8A87C` | `--gauge-2` |
| 3 | 41~60 | `#E8913A` | `--gauge-3` |
| 4 | 61~80 | `#E06B20` | `--gauge-4` |
| 5 | 81~100 | `#D4451A` | `--gauge-5` |

### 현재 점 크기 (고정)

사분면 내 현재 점 지름: **고정 20px** (만족도에 따른 가변 크기 없음)
- `quadrant-input.tsx`의 `DOT_SIZE = 20`
- `mini-quadrant.tsx`의 `CURRENT_DOT_SIZE = 20`

### 현재 점 Glow

```css
box-shadow: 0 0 ${6 + totalScore * 0.2}px ${3 + totalScore * 0.1}px ${totalColor}${totalScore > 60 ? 'B0' : '60'}
```
- 만족도가 높을수록 Glow 크기·투명도 증가
- 60점 초과: opacity `B0` (69%), 60점 이하: opacity `60` (38%)

### 참조 점 (기존 기록)

| 속성 | 값 |
|------|-----|
| 크기 | 고정 20px (`QuadrantRefDot`), 미니사분면에서는 14px |
| 색상 | `rgba(120, 113, 108, opacity)` — 회갈색 단일 색상 |
| opacity | 만족도 기반 가변: `0.15 + (satisfaction / 100) * 0.45` (범위 0.15~0.6) |
| 활성(선택) 시 | opacity 0.85, `box-shadow: 0 0 8px 3px rgba(120, 113, 108, 0.4)` |
| 이름 라벨 | 비활성: 8px, 활성: 10px, max-width 48px/120px, ellipsis |
| 포인터 이벤트 | dot 영역만 클릭 가능, 라벨은 pointer-events: none |
| 롱프레스 | 500ms → 상세페이지 이동 콜백 |
| 겹침 순환 | 5% 이내 겹친 점 → 탭 시 순환 선택 |
| 최대 개수 | 12개 (`referencePoints.slice(0, 12)`) |

---

## 5. 애니메이션 & 햅틱

| 이벤트 | 애니메이션 | 햅틱 |
|--------|----------|------|
| 사분면 탭 | 점이 해당 위치로 이동 (ease-out 0.08s) | `navigator.vibrate(10)` |
| 위치 드래그 | 점 따라감, X%/Y%/만족도 실시간 갱신 | — |
| 바 게이지 드래그 | 바 높이 실시간 변경, 사분면 점도 연동 | — |
| 상황 태그 선택 (식당) | 선택 시 `scale(1.05)` 확대 + 색상 전환 (200ms ease-in-out) | — |
| 아로마 섹터 탭 | fill-opacity 0.05→1.0 (0.15s ease-out) | — |
| 페어링 카테고리 탭 | `active:scale-[0.97]` 축소 피드백 | — |
| 참조 점 롱프레스 | — | `navigator.vibrate(20)` |

---

## 6. 배경 레퍼런스

사분면 배경에 참조 점으로 이전 기록/대표 식당·와인 표시:

**기록 플로우에서 (screen-rest-record, screen-wine-record)**:
- 내 과거 기록을 참조 점으로 표시
- 참조 점 크기 = 고정 20px
- 만족도 기반 가변 opacity (0.15~0.6)
- 이름 라벨 표시 (기본 비활성, 탭 시 활성)

**미니 사분면에서 (기록 상세·카드)**:
- 현재 기록: 고정 20px, 불투명
- 다른 기록: 고정 14px, opacity 0.3
- 축 라벨: 퀄리티↓/↑, 경험↑/↓ (식당) / 구조↓/↑, 감성↑/↓ (와인)

**데이터 소스 우선순위**:
1. 자신의 과거 기록 (primary — 기록 플로우·상세 공통)
2. 같은 지역 사용자 평균 좌표 (데이터 충분 시)
3. 미슐랭/블루리본 사전 배치 (콜드스타트)

**표시 규칙**:
- 최대 12개
- 겹침 감지: 5% 이내 → 탭 시 순환 선택

---

## 7. 상황 태그

### 식당 상황 태그 (6종)

식당 기록에서 사분면 평가 후 상황 태그를 선택한다.

| DB 값 | 표시 이름 | 색상 (hex) | CSS 변수 |
|--------|----------|-----------|----------|
| `solo` | 혼밥 | `#7A9BAE` | `--scene-solo` |
| `romantic` | 데이트 | `#B8879B` | `--scene-romantic` |
| `friends` | 친구 | `#7EAE8B` | `--scene-friends` |
| `family` | 가족 | `#C9A96E` | `--scene-family` |
| `business` | 회식 | `#8B7396` | `--scene-business` |
| `drinks` | 술자리 | `#B87272` | `--scene-drinks` |

- **단일 선택** (`scene VARCHAR(20)`), **선택 사항** (필수 아님 — 사분면 터치만 필수)
- **AI 추천**: 사진 분석, 시간대, 위치 기반으로 pre-select (`AI` 뱃지 표시)

### 와인 상황 태그 (7종)

엔티티 정의 완료. 와인 기록 폼에서는 아직 UI 미연결 (페어링이 대체 역할).
DB 스키마상 `scene` 필드는 공유하며, 와인 상세 타임라인에서 표시 가능.

| DB 값 | 표시 이름 | 색상 (hex) |
|--------|----------|-----------|
| `solo` | 혼술 | `#7A9BAE` |
| `romantic` | 데이트 | `#B8879B` |
| `gathering` | 모임 | `#7EAE8B` |
| `pairing` | 페어링 | `#C9A96E` |
| `gift` | 선물 | `#8B7396` |
| `tasting` | 테이스팅 | `#B87272` |
| `decanting` | 디캔팅 | `#7A9BAE` |

타입 정의: `src/domain/entities/scene.ts`

---

## 8. 와인 심화 평가

식당은 사분면 + 상황태그로 끝. 와인은 WSET 체계적 시음 기반 추가 단계:

| Step | 내용 | 필수 |
|------|------|------|
| 1 | 사분면 (구조·완성도 × 즐거움·감성) — 만족도 자동 산출 | 필수 |
| 2 | 아로마 팔레트 (WSET 3링 16섹터 휠) | 선택 |
| 3 | 품질 평가 (BLIC) — 균형 · 여운 · 강도 · 복합성 (슬라이더 4개) | 선택 |
| 4 | 페어링 (WSET 8카테고리 그리드) | 선택 |

> 검증: 사분면 터치만 필수. 아로마/품질평가/페어링은 선택.

### 아로마 팔레트 상세 스펙

**레이아웃**: 원형 (SVG 300×300, 중심점 150,150)
- **16섹터**, 3개 링 (1차향/2차향/3차향)
- AI가 품종/라벨 기반으로 pre-select (와인 target의 aromaPrimary/Secondary/Tertiary에서 초기값 로드)

**1차향 (포도 유래) — 바깥 링 Ring 1 (9섹터, 40° 간격, -90° 시작)**:
| 순서 | ID | 한국어명 | 영어명 | 색상 | hex |
|------|-----|---------|--------|------|-----|
| 1 | `citrus` | 시트러스 | Citrus | 밝은 노랑 | `#fde047` |
| 2 | `apple_pear` | 사과/배 | Apple/Pear | 연두 | `#a3e635` |
| 3 | `tropical` | 열대과일 | Tropical | 주황 | `#fb923c` |
| 4 | `stone_fruit` | 핵과 | Stone Fruit | 연분홍 | `#fda4af` |
| 5 | `red_berry` | 붉은베리 | Red Berry | 빨강 | `#f87171` |
| 6 | `dark_berry` | 검은베리 | Dark Berry | 보라 | `#a855f7` |
| 7 | `floral` | 꽃 | Floral | 핑크 | `#f472b6` |
| 8 | `white_floral` | 흰꽃 | White Floral | 크림 | `#fef3c7` |
| 9 | `herb` | 허브 | Herb/Vegetal | 초록 | `#4ade80` |

**2차향 (양조 유래) — 중간 링 Ring 2 (4섹터, 90° 간격, -67.5° 시작)**:
| 순서 | ID | 한국어명 | 영어명 | 색상 | hex |
|------|-----|---------|--------|------|-----|
| 1 | `butter` | 버터/크림 | Butter/Cream (MLF) | 베이지 | `#fde68a` |
| 2 | `vanilla` | 바닐라 | Vanilla/Cedar (Oak) | 갈색 | `#d97706` |
| 3 | `spice` | 오크/향신료 | Clove/Cinnamon (Oak) | 다크레드 | `#991b1b` |
| 4 | `toast` | 토스트 | Toast/Smoke (Lees/Oak) | 밤색 | `#b45309` |

**3차향 (숙성 유래) — 안쪽 링 Ring 3 (3섹터, 120° 간격, -90° 시작)**:
| 순서 | ID | 한국어명 | 영어명 | 색상 | hex |
|------|-----|---------|--------|------|-----|
| 1 | `leather` | 가죽/담배 | Leather/Tobacco | 다크브라운 | `#78350f` |
| 2 | `earth` | 흙/버섯 | Earth/Mushroom | 회색 | `#78716c` |
| 3 | `nut` | 견과/건과일 | Nut/Dried Fruit | 밤색 | `#92400e` |

**링 배치 (SVG 좌표)**:
| 링 | 외곽 반지름 | 내곽 반지름 | 섹터 수 | 시작 각도 | 간격 |
|----|-----------|-----------|---------|----------|------|
| Ring 1 | 140 | 100 | 9 | -90° | 40° |
| Ring 2 | 100 | 65 | 4 | -67.5° | 90° |
| Ring 3 | 65 | 20 | 3 | -90° | 120° |

**인터랙션**:
- 터치(PointerDown): 섹터 탭 → 해당 영역 활성화 (`active` 토글)
- 드래그(PointerEnter): 인접 섹터로 드래그하면 비활성 영역 연속 활성화 (이미 활성인 영역은 유지)
- PointerUp/Leave: 드래그 종료

**비주얼**:
- 비활성 섹터: fill-opacity 0.05, font-weight 500
- 활성 섹터: fill-opacity 1.0, font-weight 700, +1px 폰트 사이즈
- 텍스트 색상: 활성 시 배경 luminance > 0.55 → 검정(`#1a1a1a`), 아니면 흰색(`#ffffff`)
- 텍스트 줄바꿈: `/` 기준으로 `<tspan>` 줄바꿈
- 동적 폰트 사이즈: Ring1 기본 11px, Ring2 기본 10px, Ring3 기본 9px (긴 이름 -1px)
- 구분선: 섹터 간 `stroke: var(--bg-card)`, strokeWidth 1

**선택 결과 표시**:
- 휠 아래에 링별 그룹으로 선택된 향 이름 표시
- 형태: `1차 시트러스, 열대과일` / `2차 바닐라` 등
- 미선택 시: "탭하여 향을 선택하세요"

**DB 저장 형식**:
- `records.aroma_primary TEXT[]` — Ring 1 선택된 섹터 ID 배열
- `records.aroma_secondary TEXT[]` — Ring 2 선택된 섹터 ID 배열
- `records.aroma_tertiary TEXT[]` — Ring 3 선택된 섹터 ID 배열

### 품질 평가 (BLIC) — 선택

4개 슬라이더(LabeledGaugeSlider)로 구성. 모두 0~100 범위. accent 색상 `--accent-wine`.

**균형 (Balance)**:
| 속성 | 값 |
|------|-----|
| 범위 | 0~100 |
| 라벨 | `불균형` ← → `보통` ← → `완벽한 조화` |
| 0 | 불균형 (산미·타닌·알코올 등이 돌출) |
| 100 | 완벽한 조화 (모든 요소가 어우러짐) |

**여운 (Finish)**:
| 속성 | 값 |
|------|-----|
| 범위 | 0~100 (내부값) |
| 표시 | **초 환산**: `finishToSeconds(value)` = `Math.round(1 + (value / 100) * 14)` → 결과 1~15초 |
| 값 라벨 | `{N}초+` 형태 표시 |
| 라벨 | `짧음 (<3초)` ← → `보통 (5~8초)` ← → `긴 (10초+)` |

**강도 (Intensity)**:
| 속성 | 값 |
|------|-----|
| 범위 | 0~100 |
| 라벨 | `연한/희미` ← → `보통` ← → `강렬/집중` |
| 0 | 향과 맛이 연한/희미한 |
| 100 | 향과 맛이 강렬/집중된 |

**복합성 (Complexity)**:
| 속성 | 값 |
|------|-----|
| 범위 | 0~100 |
| 라벨 | `1차향 (과일/꽃)` ← → `2차향 (발효)` ← → `3차향 (숙성)` |
| AI 초기값 | 아로마 휠 선택 링 수 기반 (`getComplexityInitialValue`): |
| | 1링만 선택 → 30, 2링 선택 → 60, 3링 선택 → 85 |
| 자동 업데이트 | 아로마 링 수 변경 시 자동 갱신 (사용자가 수동 수정 전까지만) |

### 페어링 (WSET 8카테고리 그리드)

AI가 와인 특성 기반으로 pre-select (`AI` 뱃지 표시). 복수 선택 가능. 2열 그리드 레이아웃.

| 카테고리 DB값 | 표시 이름 | Lucide 아이콘 | 예시 음식 |
|-------------|----------|-------------|----------|
| `red_meat` | 적색육 | `Beef` | 스테이크 · 양갈비 · 오리 · 사슴 |
| `white_meat` | 백색육 | `Drumstick` | 닭 · 돼지 · 송아지 · 토끼 |
| `seafood` | 어패류 | `Fish` | 생선 · 갑각류 · 조개 · 굴 · 초밥 |
| `cheese` | 치즈·유제품 | `Milk` | 숙성치즈 · 블루 · 브리 · 크림소스 |
| `vegetable` | 채소·곡물 | `Leaf` | 버섯 · 트러플 · 리조또 · 파스타 |
| `spicy` | 매운·발효 | `Flame` | 커리 · 마라 · 김치 · 된장 |
| `dessert` | 디저트·과일 | `Candy` | 다크초콜릿 · 타르트 · 건과일 |
| `charcuterie` | 샤퀴트리·견과 | `Nut` | 하몽 · 살라미 · 아몬드 · 올리브 |

- 직접 입력 필드 추가 (예: "트러플 리조또")
- `pairing_categories TEXT[]`에 저장

### 만족도 산출

```
만족도 = Math.round((axis_x + axis_y) / 2)
```

- 사분면 위치(X, Y)에서 자동 산출. 별도 조작 없음.
- 식당/와인 동일 공식.
- DB CHECK 제약으로 1~100 범위 보장 (`chk_records_satisfaction`)

### Auto Score (와인 전용)

```typescript
// calculateAutoScore(activeRingCount, finish, balance)
complexityBonus = activeRingCount >= 3 ? 15 : activeRingCount >= 2 ? 7 : 0
autoScore = Math.round(Math.max(1, Math.min(100, 50 + complexityBonus + (finish * 0.1) + (balance * 0.15))))
```

- 아로마 링 수 + 여운 + 균형으로 산출
- `records.auto_score`에 저장
- 아로마/품질평가 변경 시 실시간 재계산

---

## 9. 부가 입력 (통합 기록 화면)

사분면 + 핵심 평가 이후 같은 화면에서 입력하는 부가 정보.
사진은 카메라 촬영 단계에서 이미 확보 (record_photos 테이블에 별도 저장).

### 식당

| 항목 | 입력 방식 | AI 지원 |
|------|----------|---------|
| 장르 | 장르 선택 (전체 장르 목록) | 사진/위치 기반 추천 |
| 한줄 코멘트 | 텍스트 200자 | — |
| 동반자 | 사용자 태그 + 추가 버튼 (최근 동반자 제안) | — |
| 비공개 메모 | 텍스트 (자물쇠 아이콘 표시) | — |
| 메뉴 태그 | 인라인 태그 추가/삭제 | — |
| 가격대 | 3단계 선택 (PriceLevelSelector) | — |
| 1인 가격 | 금액 입력 | — |
| 방문일 | 날짜 선택 (기본값: 오늘) | — |
| 같이 마신 와인 | 인라인 와인 검색 → 연결 (LinkSearchSheet) | — |

- 동반자: `companions TEXT[]` (⚠️ 비공개 — 본인만 열람), `companion_count INT` (필터/통계용)
- 와인 연결: `linked_wine_id UUID` — 내 기록/DB 와인/신규 등록 3가지 경로

### 와인

| 항목 | 입력 방식 | AI 지원 |
|------|----------|---------|
| 와인 메타데이터 | 확인/수정 (producer, vintage, region 등 전체) | AI 인식 결과 pre-fill |
| 한줄 코멘트 | 텍스트 200자 | — |
| 동반자 | 사용자 태그 + 추가 버튼 | — |
| 비공개 메모 | 텍스트 (자물쇠 아이콘 표시) | — |
| 가격 (병) | 금액 입력 | — |
| 방문일 | 날짜 선택 (기본값: 오늘) | — |
| 어디서 마셨나요? | 인라인 식당 검색 → 연결 (LinkSearchSheet) | — |

- 식당 연결: `linked_restaurant_id UUID`
- 와인 메타데이터 업데이트: `wineMetaUpdate` 객체로 wines 테이블에 반영
  - vintage, producer, region, subRegion, appellation, country, variety
  - abv, bodyLevel, acidityLevel, sweetnessLevel
  - classification, servingTemp, decanting
  - referencePriceMin/Max, drinkingWindowStart/End
  - vivinoRating, criticScores (RP, WS)
  - tastingNotes

---

## 10. DB 스키마 (records 테이블 관련 필드)

```sql
-- 사분면 평가
axis_x        DECIMAL(5,2)   -- 0~100
axis_y        DECIMAL(5,2)   -- 0~100
satisfaction  INT             -- 1~100, (axis_x + axis_y) / 2

-- 경험 데이터
scene         VARCHAR(20)     -- 상황 태그
comment       VARCHAR(200)    -- 한줄 코멘트
total_price   INT             -- 식당: 1인 가격
purchase_price INT            -- 와인: 병 가격
visit_date    DATE            -- 방문/시음일
meal_time     VARCHAR(20)     -- breakfast|lunch|dinner|snack

-- 와인 아로마 (TEXT[] 배열)
aroma_primary   TEXT[]        -- Ring 1 섹터 ID 배열
aroma_secondary TEXT[]        -- Ring 2 섹터 ID 배열
aroma_tertiary  TEXT[]        -- Ring 3 섹터 ID 배열

-- 와인 품질 평가 (BLIC)
balance     DECIMAL(5,2)      -- 0~100
finish      DECIMAL(5,2)      -- 0~100 (초 환산 표시)
intensity   INT               -- 0~100
complexity  INT               -- 0~100
auto_score  INT               -- 자동 산출 만족도

-- 페어링 & 메뉴
pairing_categories TEXT[]     -- 와인: WSET 8카테고리
menu_tags          TEXT[]     -- 식당: 메뉴 태그

-- 동반자
companion_count INT           -- 필터/통계용
companions      TEXT[]        -- 비공개, 본인만 열람

-- 연결
linked_restaurant_id UUID     -- 와인→식당 연결
linked_wine_id       UUID     -- 식당→와인 연결
```

---

## 11. 코드 구조 참조

| 분류 | 파일 경로 |
|------|----------|
| 아로마 엔티티 | `src/domain/entities/aroma.ts` |
| 아로마 상수 | `src/shared/constants/aroma-sectors.ts` |
| 사분면 엔티티 | `src/domain/entities/quadrant.ts` |
| 품질 평가 엔티티 | `src/domain/entities/wine-structure.ts` |
| 기록 엔티티 | `src/domain/entities/record.ts` |
| 상황 태그 엔티티 | `src/domain/entities/scene.ts` |
| 페어링 엔티티 | `src/domain/entities/pairing.ts` |
| 게이지 색상 유틸 | `src/shared/utils/gauge-color.ts` |
| 사분면 입력 UI | `src/presentation/components/record/quadrant-input.tsx` |
| 사분면 참조 점 | `src/presentation/components/record/quadrant-ref-dot.tsx` |
| 미니 사분면 | `src/presentation/components/record/mini-quadrant.tsx` |
| 아로마 휠 | `src/presentation/components/record/aroma-wheel.tsx` |
| 아로마 섹터 | `src/presentation/components/record/aroma-sector.tsx` |
| 품질 평가 UI | `src/presentation/components/record/wine-structure-eval.tsx` |
| 페어링 그리드 | `src/presentation/components/record/pairing-grid.tsx` |
| 식당 기록 폼 | `src/presentation/components/record/restaurant-record-form.tsx` |
| 와인 기록 폼 | `src/presentation/components/record/wine-record-form.tsx` |
| 기록 리포지토리 (인터페이스) | `src/domain/repositories/record-repository.ts` |
| 기록 리포지토리 (구현) | `src/infrastructure/repositories/supabase-record-repository.ts` |
