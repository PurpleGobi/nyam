<!-- updated: 2026-04-20 -->
<!-- last-change: §7 Phase 용어 충돌 주석, §7.3/§10.3 MIN_OVERLAP 구체화, §5.4 와인 scene 7종 분해 명시, prototype 경로 _archive/prototype/ 정정 -->

# RECORD_SYSTEM — 기록 도메인 통합 SSOT

---
depends_on:
  - DATA_MODEL.md
  - DESIGN_SYSTEM.md
  - XP_SYSTEM.md
affects:
  - RECOMMENDATION.md
  - MAP_LOCATION.md
---

> 기록(Record) 도메인 전체의 단일 진실 공급원. 평가 축(사분면/아로마/BLIC/페어링) + 3-Phase 캡처 시스템 + 카메라 3모드 + AI 블로그 리뷰 + 유사 리뷰 매칭 + 검색/dedup 로직을 통합적으로 다룬다.
> 비주얼 레퍼런스: `_archive/prototype/01_home.html` (screen-rest-record, screen-wine-record), `_archive/prototype/00_design_system.html` (§15, §15b)
> DB 스키마 상세는 DATA_MODEL.md 참조. 컬러/토큰은 DESIGN_SYSTEM.md 참조. XP 산출 공식은 XP_SYSTEM.md 참조.

---

## §1. 핵심 개념

기록(record)은 Nyam의 중심 도메인 객체다. **하나의 기록 = 한 사용자가 한 대상(식당/와인)에 대해 남긴 1회의 경험**.

- `records` 테이블은 flat 구조 (Phase 5 리팩토링 이후 `visits_jsonb` 제거)
- `target_type`이 `'restaurant'` 또는 `'wine'`으로 식당/와인 도메인 분기
- 같은 대상에 재방문하면 새 row가 추가됨 (rc01, rc02, ...)

### 1.1 식당 기록 (Quick)

**하나의 기록 = 최소 target(식당) + 사분면(X%, Y%, 만족도) / 상황 태그는 선택**
- 사분면 위치(음식 퀄리티 × 경험 가치) + 만족도((x+y)/2 자동 산출). 상황 태그는 선택 항목.
- 이름만 등록한 **플레이스홀더 기록**도 허용 (사분면 없이 target만 연결). XP_SYSTEM §4-1 기준: 이름만 = XP 0, +사분면 = +3.
- ~3초 안에 완료 가능한 경량 캡처.

### 1.2 와인 기록 (Deep)

**하나의 기록 = (X%, Y%, 만족도, 아로마, 품질평가(BLIC), 페어링)**
- WSET 체계적 시음 기반
- 사분면(구조·완성도 × 즐거움·감성) + 아로마 팔레트 16섹터 3링 + 품질평가(균형·여운·강도·복합성) + 페어링 카테고리 8종
- 사분면만 필수, 나머지는 모두 선택

### 1.3 3개 테이블의 역할 분리

```
restaurants / wines  →  장소·와인 정보 (이름, 산지, 카테고리 등 — 공유 자원)
records              →  개인의 방문·시음 기록 (평가, 한줄평, 가격 등 — 개인 소유)
bubble_items         →  버블에 큐레이션된 대상 (bubble_id, target_id, target_type)
```

- `restaurants`/`wines`는 **공유 자원**: 누가 몇 번 방문해도 행은 1개
- `records`는 **개인 소유**: 한 대상에 사용자 × 방문 수만큼 row 생성, RLS로 보호
- `bubble_items`는 **큐레이션 큐**: 누가 기록했는지는 `records` + `bubble_members` JOIN으로 파악 (source/record_id/added_by 컬럼 없음)

동일 상세 페이지라도 **보는 사람마다 내용이 달라진다** (합성 뷰): `restaurants`/`wines` 기본 정보 + 본인 `records` + 버블/팔로잉 `records` 결합.

---

## §2. 사분면 평가 축

### 2.1 식당 축

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

### 2.2 와인 축

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

### 2.3 만족도 산출

```
satisfaction = Math.round((axis_x + axis_y) / 2)
```

- 사분면 위치(X, Y)에서 자동 산출. 별도 만족도 조작 제스처 없음.
- 식당/와인 동일 공식.
- DB CHECK 제약으로 1~100 범위 보장 (`chk_records_satisfaction`).
- ※ 타입 주석: `axis_x`/`axis_y`는 DB에서 `NUMERIC(5,2)`로 소수 허용, `satisfaction`은 반올림 후 `INT`로 저장 (`Math.round((axis_x + axis_y) / 2)`).

---

## §3. 조작 플로우

### 3.1 사분면 UI 레이아웃

좌측에 **세로 바 게이지 2개** (X축, Y축) + 총점 표시, 우측에 **사분면 영역** (1:1 비율).
바 게이지와 사분면 모두 인터랙티브하며, 어느 쪽을 조작해도 값이 동기화된다.

| 단계 | 행동 | 제스처 | 시간 |
|------|------|--------|------|
| 1. 탭/드래그 | 사분면에서 위치 선택·이동, 또는 바 게이지 터치 | 자유 드래그 | ~1초 |
| 2. 수치 확인 | 축 값 + 만족도((x+y)/2) 실시간 표시 | — | — |
| 3. 완료 | 저장 버튼 | 1-finger tap | ~0.3초 |

### 3.2 제스처 구분

- **사분면 위치 이동**: 점을 사분면 내에서 자유롭게 드래그 → X%, Y% 실시간 갱신
- **바 게이지 터치**: 좌측 세로 바를 터치/드래그하여 개별 축 값 조절
- **만족도**: 위치 이동 시 (x+y)/2로 자동 계산, 실시간 갱신
- 사분면 영역 탭 → 점이 해당 위치로 이동
- `가이드` 버튼 → 4분면 설명 라벨 토글

### 3.3 사분면 모드 (상세 페이지)

배타적 토글 (radio), 기본 = **방문기록**:

| 모드 | 값 | 내용 |
|------|-----|------|
| **방문기록** | `visits` | 해당 대상의 나(20px) + 타인 dot(~2px, 분포 파악용). 4종 점수 카드로 그룹 선택 |
| **다른 대상 비교** | `compare` | 내가 리뷰한 다른 대상의 ref dots (기존 방식) |

### 3.4 점(Dot) 비주얼 스펙 요약

| 속성 | 현재 점 | 참조 점 | 미니 사분면(다른 기록) |
|------|---------|---------|---------------------|
| 크기 | 20px 고정 | 20px 고정 (미니 14px) | 14px |
| 색상 | total 채널 | `rgba(120,113,108, opacity)` | 동일 |
| opacity | 불투명 | `0.15 + (satisfaction/100) × 0.45` (0.15~0.6) | 0.3 |
| Glow | `0 0 ${6+total×0.2}px ${3+total×0.1}px totalColor` | 활성 시 `0 0 8px 3px rgba(120,113,108,0.4)` | — |
| 활성 | — | opacity 0.85 | — |
| 라벨 | — | 비활성 8px / 활성 10px, ellipsis | — |
| 롱프레스 | — | 500ms → 상세페이지 이동 | — |
| 겹침 순환 | — | 5% 이내 겹친 점 → 탭 시 순환 | — |
| 최대 개수 | — | 12개 | — |

### 3.5 게이지 색상 (채널 5단계)

| 채널 | 1단계 (0~20) | 2단계 (21~40) | 3단계 (41~60) | 4단계 (61~80) | 5단계 (81~100) | 계열 |
|------|-------------|---------------|---------------|---------------|----------------|------|
| food | `#C4B5A8` | `#C8907A` | `#C17B5E` | `#B5603A` | `#A83E1A` | 코랄 |
| experience | `#B5B0BA` | `#A08DA8` | `#8B7396` | `#7A5A8E` | `#6B3FA0` | 보라 |
| total (식당) | `#C4BCA8` | `#D4B85C` | `#E0A820` | `#D49215` | `#C87A0A` | 골드 |
| total (와인) | `#D8D0E0` | `#D0B0E8` | `#C090E0` | `#B070D8` | `#A050D0` | 밝은 보라 |

`gauge-color.ts` `getStepIndex`로 단계 결정. 채널별 5단계 색상은 DESIGN_SYSTEM.md §1 `CHANNEL_STEPS` 참조 (실제 구현은 `gauge-color.ts`).

### 3.6 애니메이션 & 햅틱

| 이벤트 | 애니메이션 | 햅틱 |
|--------|----------|------|
| 사분면 탭 | 점 이동 (ease-out 0.08s) | `navigator.vibrate(10)` |
| 위치 드래그 | 점 따라감, X/Y/만족도 실시간 | — |
| 바 게이지 드래그 | 바 높이 실시간, 사분면 점도 연동 | — |
| 상황 태그 선택 | `scale(1.05)` + 색상 전환 (200ms ease-in-out) | — |
| 아로마 섹터 탭 | fill-opacity 0.05→1.0 (0.15s ease-out) | — |
| 페어링 카테고리 탭 | `active:scale-[0.97]` | — |
| 참조 점 롱프레스 | — | `navigator.vibrate(20)` |

---

## §4. 아로마 16섹터 3링 (와인 전용)

원형 휠 SVG 300×300, 중심 (150, 150). **16섹터** (Ring1 9 + Ring2 4 + Ring3 3), AI가 품종/라벨 기반으로 pre-select.

### 4.1 Ring 1 — 1차향 (포도 유래, 9섹터, 바깥 링)

외곽 r=140, 내곽 r=100, 40° 간격, 시작 -90°.

| ID | 한국어 | 영어 | hex |
|-----|--------|------|------|
| `citrus` | 시트러스 | Citrus | `#fde047` |
| `apple_pear` | 사과/배 | Apple/Pear | `#a3e635` |
| `tropical` | 열대과일 | Tropical | `#fb923c` |
| `stone_fruit` | 핵과 | Stone Fruit | `#fda4af` |
| `red_berry` | 붉은베리 | Red Berry | `#f87171` |
| `dark_berry` | 검은베리 | Dark Berry | `#a855f7` |
| `floral` | 꽃 | Floral | `#f472b6` |
| `white_floral` | 흰꽃 | White Floral | `#fef3c7` |
| `herb` | 허브 | Herb/Vegetal | `#4ade80` |

### 4.2 Ring 2 — 2차향 (양조 유래, 4섹터, 중간 링)

외곽 r=100, 내곽 r=65, 90° 간격, 시작 -67.5°.

| ID | 한국어 | 영어 | hex |
|-----|--------|------|------|
| `butter` | 버터/크림 | Butter/Cream (MLF) | `#fde68a` |
| `vanilla` | 바닐라 | Vanilla/Cedar (Oak) | `#d97706` |
| `spice` | 오크/향신료 | Clove/Cinnamon (Oak) | `#991b1b` |
| `toast` | 토스트 | Toast/Smoke (Lees/Oak) | `#b45309` |

### 4.3 Ring 3 — 3차향 (숙성 유래, 3섹터, 안쪽 링)

외곽 r=65, 내곽 r=20, 120° 간격, 시작 -90°.

| ID | 한국어 | 영어 | hex |
|-----|--------|------|------|
| `leather` | 가죽/담배 | Leather/Tobacco | `#78350f` |
| `earth` | 흙/버섯 | Earth/Mushroom | `#78716c` |
| `nut` | 견과/건과일 | Nut/Dried Fruit | `#92400e` |

### 4.4 인터랙션

- **PointerDown**: 섹터 탭 → `active` 토글
- **PointerEnter (드래그 중)**: 인접 섹터로 이동 시 비활성 영역 연속 활성화 (이미 활성인 영역은 유지)
- **PointerUp/Leave**: 드래그 종료
- 비활성: fill-opacity 0.05, font-weight 500
- 활성: fill-opacity 1.0, font-weight 700, +1px 폰트
- 텍스트 색상: 활성 시 배경 luminance > 0.55 → 검정 `#1a1a1a`, 아니면 흰색
- 구분선: 섹터 간 `stroke: var(--bg-card)`, strokeWidth 1
- 선택 결과: 휠 아래 링별 그룹 이름 표시 (예: `1차 시트러스, 열대과일 · 2차 바닐라`)

### 4.5 DB 저장

```sql
aroma_primary   TEXT[]  -- Ring 1 섹터 ID 배열
aroma_secondary TEXT[]  -- Ring 2 섹터 ID 배열
aroma_tertiary  TEXT[]  -- Ring 3 섹터 ID 배열
```

---

## §5. 평가 상세 (BLIC · Auto Score · 4종 점수 · 상황 태그)

### 5.1 BLIC = Balance / Length(=Finish) / Intensity / Complexity — 본 문서는 'Finish'로 통일 기재 (와인 품질 평가, 선택)

4개 슬라이더(`LabeledGaugeSlider`), 모두 0~100, accent `--accent-wine`.

**균형 (Balance)** — 0=불균형, 100=완벽한 조화. 라벨: `불균형 ← 보통 ← 완벽한 조화`.

**여운 (Finish)** — 내부값 0~100. 표시는 초 환산: `finishToSeconds(v) = Math.round(1 + (v/100)×14)` → 1~15초. 라벨: `짧음 (<3초) ← 보통 (5~8초) ← 긴 (10초+)`, 값 라벨 `{N}초+`.

**강도 (Intensity)** — 0=연함, 100=강렬. 라벨: `연한/희미 ← 보통 ← 강렬/집중`.

**복합성 (Complexity)** — 0~100. 라벨: `1차향 (과일/꽃) ← 2차향 (발효) ← 3차향 (숙성)`. AI 초기값 (아로마 링 수 기반, 사용자 수정 전까지 자동 업데이트):

```
1링 선택 → 30, 2링 선택 → 60, 3링 선택 → 85
```

### 5.2 Auto Score (와인 전용)

```typescript
// calculateAutoScore(activeRingCount, finish, balance)
complexityBonus = activeRingCount >= 3 ? 15 : activeRingCount >= 2 ? 7 : 0
autoScore = Math.round(
  Math.max(1, Math.min(100, 50 + complexityBonus + (finish * 0.1) + (balance * 0.15))),
)
```

- 아로마 링 수 + 여운 + 균형으로 산출
- `records.auto_score`에 저장
- 아로마/품질평가 변경 시 실시간 재계산

### 5.3 4종 점수 시스템

하나의 대상에 대해 4가지 점수 소스:

| 점수 | 소스 | 산출 |
|------|------|------|
| 나의 점수 | 내 records | satisfaction 평균 |
| 팔로잉 점수 | follows accepted 유저들의 records | satisfaction 평균 |
| 버블 점수 | 내 버블 멤버들의 records (bubble_items × records JOIN) | satisfaction 평균 |
| nyam 점수 | is_public=true 유저들의 records | satisfaction 평균 |

> `calcNyamScore()` (외부 평점 가중평균 — 네이버/카카오/구글)과 "nyam 점수"는 별개 개념.

**신뢰도 폴백 (홈 리스트)**: `나 → 팔로잉 → 버블 → nyam` (첫 번째 non-null). 출처 뱃지로 종류 구분.

**상세 페이지 점수 카드**: 4카드가 토글 버튼 — 탭하면 사분면에 해당 그룹 dot 표시. 선택: accent border. 점수 없음: `—` + 비활성.

### 5.4 상황 태그 (Scene)

**식당 (6종)** — 단일 선택 (`scene VARCHAR(20)`), 선택 사항. AI pre-select (사진/시간대/위치 기반, `AI` 뱃지 표시).

| DB | 표시 | hex | CSS 변수 |
|----|------|-----|----------|
| `solo` | 혼밥 | `#7A9BAE` | `--scene-solo` |
| `romantic` | 데이트 | `#B8879B` | `--scene-romantic` |
| `friends` | 친구 | `#7EAE8B` | `--scene-friends` |
| `family` | 가족 | `#C9A96E` | `--scene-family` |
| `business` | 회식 | `#8B7396` | `--scene-business` |
| `drinks` | 술자리 | `#B87272` | `--scene-drinks` |

**와인 (7종)** — 엔티티 정의, UI 부분 연결 (decanting/pairing 등은 `.tag-chip`으로 표시). `scene` 필드 공유.

`solo(혼술) · romantic(데이트) · gathering(모임) · pairing(페어링) · gift(선물) · tasting(테이스팅) · decanting(디캔팅)`

> 7종 = pairing/gathering/gift/tasting/decanting (5종) + solo/romantic (식당 재사용 2종). DATA_MODEL §8 SSOT

> DB `scene` 컬럼의 CHECK 제약 여부(식당 6종 ENUM만 허용 vs 와인 값 포함)는 **DATA_MODEL.md §records**를 SSOT로 참조. 본 문서는 UI 노출 범위만 정의.

---

## §6. 페어링 8종 (식당·와인 공통)

`records.pairing_categories TEXT[]` — 와인 기록은 복수 선택 가능. AI가 와인 특성 기반으로 pre-select. 2열 그리드 레이아웃. 직접 입력 필드 추가 (예: "트러플 리조또").

| DB 값 | 표시 | Lucide | 예시 |
|-------|------|--------|------|
| `red_meat` | 적색육 | `Beef` | 스테이크 · 양갈비 · 오리 · 사슴 |
| `white_meat` | 백색육 | `Drumstick` | 닭 · 돼지 · 송아지 · 토끼 |
| `seafood` | 어패류 | `Fish` | 생선 · 갑각류 · 조개 · 굴 · 초밥 |
| `cheese` | 치즈·유제품 | `Milk` | 숙성치즈 · 블루 · 브리 · 크림소스 |
| `vegetable` | 채소·곡물 | `Leaf` | 버섯 · 트러플 · 리조또 · 파스타 |
| `spicy` | 매운·발효 | `Flame` | 커리 · 마라 · 김치 · 된장 |
| `dessert` | 디저트·과일 | `Candy` | 다크초콜릿 · 타르트 · 건과일 |
| `charcuterie` | 샤퀴트리·견과 | `Nut` | 하몽 · 살라미 · 아몬드 · 올리브 |

식당 기록에는 `menu_tags TEXT[]`가 별도로 존재 (메뉴명 태그 입력용, 페어링과는 다른 개념).

---

## §7. 기록 3-Phase 시스템

> ※ 본 문서의 Phase는 한 기록의 **캡처 시간 단계** (빠른 캡처→AI 리뷰→CF 매칭)이며, PRD의 **제품 릴리스 Phase**와 무관함

기록은 **시간적으로 분리된 3단계**로 구성된다. 각 Phase가 독립적으로 XP에 기여하며, Phase 1만으로도 유효한 기록이 성립한다.

```
Phase 1 (빠른 캡처)  →  Phase 2 (AI 블로그 리뷰)  →  Phase 3 (유사 리뷰 매칭·스케일링)
   ~15초 이내           방문 후 몇 분~몇 시간            백그라운드, 상시
   필수                 선택(후속 확장)                비동기 (CF 트리거)
```

### 7.1 Phase 1 — 빠른 캡처

**목적**: 즉시 기록 생성. UX상 마찰 최소화.

**최소 필수**: `target_id`, `target_type` (이름만 등록한 **플레이스홀더 기록**도 허용 — §1.1 참조)
**권장(XP 유인)**: 사분면 터치 1회 (`axis_x`, `axis_y`, `satisfaction`) — XP_SYSTEM §4-1 기준 +3 XP (이름만 = XP 0)

**플로우**:
1. 카메라/앨범으로 사진 촬영 → `imageService.resizeImage()` (800px width, WebP, quality 0.7)
2. `imageService.uploadImage(userId, 'pending', blob, uuid)` → `record-photos/{userId}/pending/{uuid}.webp`
3. 리사이즈 blob → base64 변환 (Phase 2 검색용)
4. 병렬로 대상 식별 (GPS 기반 카카오 근처 식당, 또는 AI 와인 라벨 인식 — §8 참조)
5. 사용자는 사분면 터치 + 필요 시 상황 태그 선택 → 저장
6. 기록 미완료로 이탈 시 cleanup: unmount → `imageService.deleteImage(tempUrl)`

**Phase 1 완료 시점의 DB 상태**:
- `records` row 생성 (`axis_x`, `axis_y`, `satisfaction` 세팅)
- `record_photos`에 사진 N행 (EXIF GPS 컬럼 포함)
- XP 지급: Phase 1 완료 시 → `record_quality_xp` + 세부 축 XP(+5×2) + 카테고리 XP 갱신 (XP_SYSTEM.md §13 Step 4~5 참조)

### 7.2 Phase 2 — AI 블로그 리뷰

**목적**: 기록 후 자연스러운 후속 확장으로 기록 품질·재미를 점진적으로 높임. Phase 1이 끝난 기록에 대해 비동기로 부가 정보를 누적.

**AI가 확장하는 필드** (와인 기준):
- 메타 보강: `producer`, `vintage`, `region`, `sub_region`, `appellation`, `variety`, `grape_varieties`, `abv`, `critic_scores`, `reference_price_min/max`, `price_review`, `drinking_window`
- 시음 추정: `aroma_primary/secondary/tertiary`, `balance`, `finish`, `intensity`, `auto_score` 초기값
- 서술 생성: `tasting_notes` (한국어 1문장 포지셔닝)
- `pairing_categories` pre-select

**식당**:
- 장르 추정 (`detected_genre`)
- 상황 태그 추정 (시간대 + 사진 → AI pre-select)
- `search_keywords` (검색 보조)

**원칙**:
- AI 결과는 **초기값으로만** 삽입되며, 사용자가 이후 수정 가능
- AI로 채운 필드에는 `AI` 뱃지 노출
- AI 응답은 엄격한 JSON. `safeJsonParse`로 방어 (```json 코드블록 제거 후 파싱).
- 인식 실패 → 검색 플로우로 폴백 (`NOT_FOOD`, `NOT_WINE_LABEL` 에러)

### 7.3 Phase 3 — 유사 리뷰 매칭 / 스케일링

**목적**: 개별 기록을 집합 수준으로 끌어올려 추천·소셜에 활용. 기록이 늘어날수록 값어치가 자동 상승.

**트리거**: `records` INSERT/UPDATE/DELETE → `trg_notify_cf_update` → pg_net으로 `compute-similarity` Edge Function 비동기 호출.
- **078 `078_cf_trigger_with_pg_net.sql`**: 구 052(`052_cf_trigger.sql`)를 대체. pg_net 기반으로 트리거를 재구성.
- **082 GUC 전환**: `current_setting('app.service_role_key', true)` + `app.supabase_url` GUC 패턴으로 재작성. 하드코딩 JWT 제거, 키 회전 대응. **GUC 미설정 시 CF 동기화 스킵**(트리거는 경고 후 NEW/OLD 반환, 본 기록 저장은 영향 없음).

**실행 내용**:
1. `user_score_means` 갱신: 해당 유저의 `mean_x`, `mean_y`, `record_count`
2. `user_similarities` 증분 갱신: 같은 대상을 기록한 유저 쌍의 유사도·신뢰도·`n_overlap` 재계산 (`user_a < user_b` CHECK)
3. 카테고리별 (`restaurant`/`wine`) 분리 계산

**활용처** (기록 → 자동 전파):
- 홈 리스트의 4종 점수 (§5.3) `나 → 팔로잉 → 버블 → nyam` 폴백
- `bubble_items` 자동 동기화 (`use-bubble-auto-sync`: 필터 기반 소급/정리/수정반영)
- CF 기반 Nyam Score 예측 (`predict-score`, `batch-predict` Edge Function)
- 홈 추천 7종 (세부 알고리즘은 RECOMMENDATION.md 담당)

**기록 → CF 적합도 갱신 트리거**:
```
INSERT records (axis_x NOT NULL)   → CF 재계산 INSERT 액션
UPDATE records (axis_x 유효화)     → CF 재계산 UPDATE 액션
UPDATE records (axis_x → NULL)     → DELETE 액션 (기록 무효화)
DELETE records                     → DELETE 액션
```

> Phase 3의 동작은 "기록 생성 → 집합 전파"라는 방향만 RECORD 도메인 관심사다. 유사도 공식·예측 스케일링·추천 7종의 세부 알고리즘은 **RECOMMENDATION.md**를 SSOT로 삼는다.

---

## §8. 카메라 3모드

와인 기록 전용 3모드 (`records.camera_mode`: `'individual' | 'shelf' | 'receipt'`). 식당 기록은 단일 모드(사진 촬영 + GPS 기반 후보).

### 8.1 식당 모드 (단일)

**진입**: `/add?type=restaurant`

**플로우**:
```
사진 촬영/앨범 선택
  └─ 리사이즈 + 업로드 (Phase 1 공통)
사용자 GPS (lat, lng)
  └─ POST /api/records/identify (targetType='restaurant')
     → Kakao Local "음식점" 검색 (반경 100m, size 15)
     → 거리순 정렬된 `RestaurantCandidate[]` 반환
     → (AI 이미지 인식은 현재 사용 안 함 — GPS만으로 후보 제시)
사용자가 후보 선택
  └─ 후보가 kakao_xxx prefix면 POST /api/restaurants (신규 등록)
     └─ 카카오 데이터 + Google Places Detail 보강 (영업시간/전화/rating) — MAP_LOCATION.md 참조
  └─ 기존 DB 식당이면 바로 기록 폼
```

### 8.2 와인 모드 — Individual (라벨 촬영)

**진입**: `/add?type=wine`, `cameraMode='individual'`

**플로우**:
```
라벨 사진 촬영/앨범 선택
  └─ 리사이즈 + 업로드 (Phase 1 공통)
  └─ POST /api/records/identify (targetType='wine', cameraMode='individual')
     → Gemini Vision + WINE_LABEL_PROMPT (25개 필드 JSON 추출)
     → upsertWineFromAI (§11.2 3단계 퍼지 매칭)
     → 후보 1개 반환 (`isConfidentMatch = confidence >= 0.5`)
  └─ 인식 실패 시 `NOT_WINE_LABEL` → 이름 검색(텍스트) 폴백
기록 폼 이동 (AI 데이터 pre-fill)
```

### 8.3 와인 모드 — Shelf (진열장)

**진입**: 카메라 화면에서 "진열장" 버튼 → `cameraMode='shelf'`

**목적**: 와인숍/셀러 진열장을 한 번에 촬영 → 여러 와인 일괄 기록 (Wishlist용).

**플로우**:
```
진열장 사진 촬영
  └─ POST /api/records/identify (cameraMode='shelf')
     → Gemini Vision + WINE_SHELF_PROMPT
     → `{ wines: [{ name, price }, ...] }` 반환
  └─ 사용자가 와인 다중 선택 → 각 와인마다 개별 기록 (또는 관심 목록 등록)
ocrData: ShelfOcrData → records.ocr_data JSONB에 저장
```

### 8.4 와인 모드 — Receipt (영수증)

**진입**: 카메라 화면에서 "영수증" 버튼 → `cameraMode='receipt'`

**목적**: 와인 구매 영수증 → 구매 기록 일괄 생성, `purchasePrice` 자동 입력.

**플로우**:
```
영수증 사진 촬영
  └─ POST /api/records/identify (cameraMode='receipt')
     → Gemini Vision + WINE_RECEIPT_PROMPT
     → `{ items: [{ name, price, qty }], total }` 반환
  └─ 사용자가 와인 항목 필터링 → 각 항목 개별 기록
ocrData: ReceiptOcrData → records.ocr_data JSONB에 저장
```

### 8.5 OCR 데이터 구조

`records.ocr_data JSONB`에 cameraMode별 구조로 저장:

```typescript
type OcrData = IndividualOcrData | ShelfOcrData | ReceiptOcrData

interface IndividualOcrData { wine_name: string; vintage: string | null; producer: string | null }
interface ShelfOcrData      { wines: Array<{ name: string; price: number | null }> }
interface ReceiptOcrData    { items: Array<{ name: string; price: number | null; qty: number }>; total: number | null }
```

---

## §9. AI 블로그 리뷰 시스템

### 9.1 LLM 중앙 설정

LLM provider/model을 **한 곳에서** 관리. 교체 시 `llm-config.ts` 한 줄만 수정.

```typescript
// src/shared/constants/llm-config.ts
export const LLM_CONFIG: Record<string, LlmModelConfig> = {
  vision: { provider: 'gemini', model: 'gemini-2.5-flash' },
  text:   { provider: 'gemini', model: 'gemini-2.5-flash' },
}
```

**호출 흐름**:
```
API Route
  → ai-recognition.ts (프롬프트 조립 + 응답 파싱, provider 무관)
    → llm.ts (callVision / callText)
      → llm-config.ts 읽어서 provider 결정
        → providers/gemini.ts (실제 API 호출)
```

**파일 역할**:

| 파일 | 역할 | 수정 시점 |
|------|------|-----------|
| `shared/constants/llm-config.ts` | 사용처별 provider + model | 모델 교체 시 |
| `infrastructure/api/llm.ts` | config → provider 라우팅 | 새 provider 추가 시 |
| `infrastructure/api/providers/gemini.ts` | Gemini REST API 호출 | Gemini API 스펙 변경 시 |
| `infrastructure/api/ai-recognition.ts` | 프롬프트 정의 + JSON 응답 파싱 | 프롬프트 수정 시 |

**새 provider 추가 4단계**:
1. `infrastructure/api/providers/<name>.ts` 작성 (vision/text 2개 함수)
2. `llm.ts`의 switch에 case 추가
3. `llm-config.ts` 변경
4. `.env.local`에 API 키 추가 (서버 전용, 클라이언트 노출 금지)

### 9.2 사용처 정리

| 용도 | config key | 호출 함수 | 엔드포인트 |
|------|-----------|----------|-----------|
| 음식 사진 인식 | `vision` | `recognizeRestaurant` | `/api/records/identify` |
| 와인 라벨 인식 | `vision` | `recognizeWineLabel` | `/api/records/identify` |
| 와인 진열장 인식 | `vision` | `recognizeWineShelf` | `/api/records/identify` |
| 와인 영수증 인식 | `vision` | `recognizeWineReceipt` | `/api/records/identify` |
| 와인 이름 검색 | `text` | `searchWineByName` | `/api/wines/search-ai` |
| 와인 상세 조회 | `text` | `getWineDetailByName` | `/api/wines/detail-ai` |

### 9.3 프롬프트 전략

**공통 원칙**:
- `temperature: 0` (결정론적 응답)
- Vision `maxOutputTokens: 2048`, Text `4096`
- 이미지: WebP 800px width, quality 0.7, mime_type 자동 감지
- 응답은 JSON만. 코드블록 래핑 허용 → `safeJsonParse`가 제거
- **엄격 제약조건**을 프롬프트에 명시 (ENUM, cascade 허용값, 범위). 위반 시 "시스템 오류 발생" 경고 → LLM이 자기검열

**식당 프롬프트 (RESTAURANT_PROMPT)** — 음식/식당 단서 최대 추출. 음식과 무관하면 `{"error":"not_food"}`:
```json
{
  "food_type": "...",
  "genre": "한식/일식/중식/태국/...",
  "restaurant_name": "...",
  "search_keywords": ["..."],
  "confidence": 0.0~1.0
}
```

**와인 라벨 프롬프트 (WINE_LABEL_PROMPT)** — 25+ 필드. 주요 제약:
- `wine_type` ENUM 7종: `red|white|rose|sparkling|orange|fortified|dessert`
- `country` 15개국 화이트리스트
- `region`/`sub_region`/`appellation` country-region-subregion cascade 허용값
- `variety` 정확한 품종명 (조합명 `Merlot Blend` 금지)
- `body_level` 1~5, `acidity_level` 1~3, `sweetness_level` 1~3
- `grape_varieties` `[{name, pct}]`, pct 합계 100
- `critic_scores` `{RP?: 50~100, WS?: 50~100, JR?: 12.0~20.0, JH?: 50~100}`
- `reference_price_min/max` KRW 정수 (레스토랑/호텔 과도한 마진 제외)
- `price_review` `{verdict: 'buy'|'conditional_buy'|'avoid', summary, alternatives[2]}`
- `tasting_notes` 한국어 1문장 (포지셔닝 + 핵심 향·맛)

**와인 이름 검색 프롬프트 (WINE_SEARCH_PROMPT)** — 최대 5개 후보, **공식 영어 와인명 필수**. 쿼리 단어가 이름·생산자에 직접 나타나야 함. 한국 입수 가능 와인 우선. 한국어 쿼리 → 영어 매칭 (예: "오퍼스" → "Opus One").

**와인 상세 프롬프트 (WINE_DETAIL_PROMPT)** — 라벨 프롬프트와 동일 제약 + 아로마/BLIC 추정 추가:
- `aroma_primary`: Ring1 ID 화이트리스트만
- `aroma_secondary`: Ring2 ID 화이트리스트만
- `aroma_tertiary`: Ring3 ID 화이트리스트만 (영 와인은 `[]`)
- `balance`, `finish`, `intensity` 0~100 정수

**진열장 프롬프트 (WINE_SHELF_PROMPT)** / **영수증 프롬프트 (WINE_RECEIPT_PROMPT)** — 단순 구조, 항목 배열.

### 9.4 응답 파싱 방어

```typescript
function safeJsonParse(text: string): Record<string, unknown> | Record<string, unknown>[] {
  const cleaned = text.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim()
  try { return JSON.parse(cleaned) }
  catch { throw new Error('AI_PARSE_ERROR') }
}
```

- 코드블록 fence 제거
- 파싱 실패 시 `AI_PARSE_ERROR` → 호출부는 기본값 폴백 (recognizeRestaurant의 경우 `genreHints` 키워드 매칭으로 추정)
- `parsed.error === 'not_food' | 'not_wine_label'` → 명시적 에러 throw

### 9.5 제약사항

- **vision provider**: 이미지 URL을 직접 받을 수 있어야 함 (Supabase Storage public URL)
- **응답 형식**: 모든 provider가 JSON 텍스트 반환 (프롬프트로 강제)
- **API 키**: `.env.local`에 서버 전용 (`GEMINI_API_KEY`, `OPENAI_API_KEY` 등)
- **이미지 포맷**: 현재 WebP로 통일

---

## §10. 유사 리뷰 매칭

### 10.1 목적

"같은 대상을 비슷한 방식으로 평가한 유저"를 찾아내는 것이 목적. 개별 기록은 데이터 포인트 하나지만, 집합으로 보면 **취향 유사도 벡터**가 된다.

### 10.2 저장 구조

```sql
user_similarities (
  user_a UUID, user_b UUID,
  category TEXT CHECK (category IN ('restaurant', 'wine')),
  similarity REAL DEFAULT 0,
  confidence REAL DEFAULT 0,
  n_overlap INT DEFAULT 0,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (user_a, user_b, category),
  CHECK (user_a < user_b)   -- 중복 방지
)

user_score_means (
  user_id UUID, category TEXT,
  mean_x REAL DEFAULT 50, mean_y REAL DEFAULT 50,
  record_count INT DEFAULT 0,
  PRIMARY KEY (user_id, category)
)
```

### 10.3 갱신 파이프라인

```
records INSERT/UPDATE/DELETE
  └─ AFTER trigger: trg_notify_cf_update (SECURITY DEFINER)
     └─ pg_net net.http_post → compute-similarity Edge Function
        └─ 해당 유저의 mean_x/mean_y 재계산
        └─ 같은 대상을 기록한 유저 쌍(user_a, user_b) 유사도·confidence 재계산
        └─ n_overlap ≥ MIN_OVERLAP (현행 1, RECOMMENDATION §3.6 SSOT) 인 쌍만 기록
```

- INSERT에서 `axis_x`/`axis_y`가 NULL이면 skip
- UPDATE에서 `axis_x → NULL`이면 DELETE 액션으로 전파
- 카테고리(`restaurant`/`wine`)별 분리 계산 → 취향 분리 (식당 vs 와인)

**마이그레이션 이력**:
- `052_cf_trigger.sql` → `078_cf_trigger_with_pg_net.sql`이 대체 (pg_net 기반 재구성)
- `082`: `current_setting('app.service_role_key', true)` + `app.supabase_url` GUC 패턴으로 재작성 (하드코딩 JWT 제거, 키 회전 대응). GUC 미설정 시 CF 동기화 스킵, 본 기록 저장은 무영향.

### 10.4 활용

- **CF 적합도 조회**: `use-similarity` (팔로우 목록 enrichment)
- **CF 예측 점수**: `use-nyam-score` (단건), `use-feed-scores` (배치, 최대 50건) → `predict-score` / `batch-predict` Edge Function
- **홈 4종 점수 폴백**: §5.3
- **버블 자동 큐레이션**: 필터 + CF로 bubble_items 자동 동기화 (`use-bubble-auto-sync`)

**세부 알고리즘·임베딩 공식·CF 수식은 RECOMMENDATION.md를 SSOT로 삼는다.** 본 문서는 "기록 → CF 적합도 갱신 트리거" 방향만 정의.

---

## §11. 기록 검색 / dedup 로직

### 11.1 식당 검색 (통합 검색 — `/api/restaurants/search`)

**3-API 통합 구조**:
```
사용자 검색어 입력
       ↓
① Nyam DB 검색 (restaurants 테이블, name/address ILIKE)
       ├─ 1글자: `q%` (인덱스 활용)
       └─ 2글자+: `%q%` (부분 포함)
       ↓
② DB 내부 dedup (이름+좌표 그룹핑, 기록 있는 행 우선)
       ↓
③ DB 결과 ≥ 5개 → 외부 API 스킵 / < 5개 → 폴백
       ↓
④ 외부 3개 API 동시 호출 (Promise.allSettled)
       ├─ Kakao Local (/v2/local/search/keyword)
       ├─ Naver Local
       └─ Google Places (searchText)
       ↓
⑤ 외부 결과 dedup (accepted 누적 비교)
       ↓
⑥ 최종 정렬: 거리 > 이름
```

**사용자의 satisfaction 평균 일괄 조회**: DB 결과에 대해 `records`에서 `target_id IN (...)` 집계 → `myScore` 주입.

### 11.2 식당 dedup 판정 (SSOT)

**동일 식당 판정 로직**:

| 조건 | 결과 | 예시 |
|------|------|------|
| 이름 완전 일치 + 200m 이내 | 같은 식당 | "이문설농탕" = "이문설농탕" |
| 이름 완전 일치 + 좌표 없음 | 같은 식당 (폴백) | — |
| 이름 완전 일치 + 200m 초과 | 다른 식당 | 동명이점 (다른 지역) |
| 이름 유사 + 100m 이내 | 같은 식당 | "이문설농탕" ↔ "이문설렁탕" |
| 이름 유사 + 100m 초과 | 다른 식당 | 안전하게 분리 |

**이름 유사 판정** (두 조건 모두 충족):
- 편집 거리(Levenshtein) ≤ 2 (최대 2글자 차이)
- 차이 비율 ≤ 30% (`editDistance / max(len)`)
- 좌표 100m 이내 필수 (타이트)

**이름 정규화** (`normalizeForDedup`): 공백 제거 + 소문자화. 접미사 패턴(`점|역|호|지점|본점|매장|가게|식당|맛집`)은 `fuzzy-match.ts`의 `normalizeQuery`에서 제거.

**구현 위치**:
- `src/app/api/restaurants/search/route.ts` `isSameRestaurant` + `editDistance`
- `src/shared/utils/fuzzy-match.ts` `normalizeQuery`, `fuzzyMatch`, `calculateSearchRelevance`

### 11.3 식당 등록 플로우

```
사용자 검색 결과에서 선택 (externalId prefix 'kakao_'/'naver_'/'google_')
       ↓
POST /api/restaurants
  body: { externalIds: { kakao?, naver?, google? }, name, address, lat, lng, genre, ... }
       ↓
externalIds에 google placeId가 있는가?
  ├─ YES → Google Place Detail 호출
  │         X-Goog-FieldMask: nationalPhoneNumber,regularOpeningHours,rating
  │         ├─ regularOpeningHours.periods → BusinessHours 파싱
  │         ├─ weekdayDescriptions → periods 없을 때 폴백
  │         ├─ nationalPhoneNumber → phone (카카오 누락 시 폴백)
  │         └─ rating → google_rating
  └─ NO → 카카오 데이터만으로 저장
       ↓
restaurants INSERT (cached_at = now(), next_refresh_at = now() + 30일)
```

**재선택 시 캐시 갱신**:
```
DB에 이미 존재 (이름+좌표 중복 체크로 기존 id 반환)
  ├─ next_refresh_at > now() → DB 데이터 그대로 사용
  └─ 만료 → 카카오 API 재호출 → UPDATE + cached_at 갱신
```

> 위치 dedup의 상세 (구/군 추출, area_zones 매핑, 영업권역 등)는 **MAP_LOCATION.md** 담당.

### 11.4 와인 dedup (upsertWineFromAI 3단계 퍼지 매칭)

```
1단계: 정확한 이름 매칭 (+ vintage)
  wines.name ILIKE recognition.wineName [AND wines.vintage = recognition.vintage]
       ↓ 없음
2단계: 핵심 단어 포함 매칭 (2개 이상 단어 매칭 시 동일)
  접두어 제거: /^(Château|Chateau|Domaine|Clos|Maison)\s+/i
  분리: split(/[\s,·-]+/) → 3글자 이상 단어 3개까지
  패턴: `name.ilike.%word1%,name.ilike.%word2%,...` (OR)
  매칭 점수: 핵심 단어 일치 수 → 2개 이상이면 동일 와인
       ↓ 없음
3단계: 생산자 + 빈티지 매칭 (이름이 달라도)
  producer ILIKE %recognition.producer% AND vintage = recognition.vintage
       ↓ 없음
새 와인 INSERT (AI 추정 25+ 필드 전체 저장)
```

### 11.5 와인 이름 검색 (텍스트)

```
사용자가 검색창에 와인 이름 입력
       ↓
[1차] DB 검색 — GET /api/wines/search?q=검색어
  → wines.name/producer ILIKE, 기록 있는 와인 우선 정렬
       ↓
[2차] AI 검색 — POST /api/wines/search-ai
  → Gemini Text: WINE_SEARCH_PROMPT (최대 5개 후보, 공식 영어 와인명)
       ↓
유저가 DB 결과 선택 → 바로 기록 폼
유저가 AI 후보 선택
  → POST /api/wines/detail-ai → 25필드 상세 + upsert → 기록 폼
```

### 11.6 와인 산지 4단계 Cascade

```
country → region → sub_region → appellation
```

- 15개국, 73 region, 198 sub_region (WSET Level 3 공식 Specification 기준)
- 4단계(appellation)는 Burgundy, California, South Australia, Cape South Coast 4곳만
- 상수: `src/shared/constants/wine-meta.ts` (`WINE_COUNTRIES`, `WINE_REGIONS`, `WINE_SUB_REGIONS`, `WINE_APPELLATIONS`, `WINE_VARIETIES_BY_TYPE`)
- SSOT cascade 선택지는 **DATA_MODEL.md** 참조

### 11.7 진입점 3가지 (와인 `/add?type=wine`)

| 경로 | 트리거 | 동작 |
|------|--------|------|
| 카메라 촬영 | 라벨 촬영 | Phase 1 (업로드) → Phase 2 (Gemini Vision + upsert) |
| 앨범에서 추가 | 갤러리 선택 | Phase 1 → Phase 2 (동일) |
| 이름으로 검색 | 검색창 입력 | 텍스트 검색 (DB + AI), 사진 없음 |

---

## §12. 부가 입력 (통합 기록 화면)

사분면 + 핵심 평가 이후 같은 화면에서 입력하는 부가 정보. 사진은 카메라 촬영 단계에서 이미 확보 (`record_photos` 테이블에 별도 저장).

### 12.1 식당

| 항목 | 입력 방식 | AI 지원 |
|------|----------|---------|
| 장르 | 장르 선택 (전체 장르 목록) | 사진/위치 기반 추천 |
| 한줄 코멘트 | 텍스트 200자 | — |
| 동반자 | 사용자 태그 + 추가 버튼 (최근 동반자 제안) | — |
| 비공개 메모 | 텍스트 (자물쇠 아이콘 표시) | — |
| 메뉴 태그 | 인라인 태그 추가/삭제 | — |
| 가격대 | 3단계 선택 (`PriceLevelSelector`) | — |
| 1인 가격 | 금액 입력 | — |
| 방문일 | 날짜 선택 (기본: 오늘) | — |
| 같이 마신 와인 | 인라인 와인 검색 → 연결 (`LinkSearchSheet`) | — |

- 동반자: `companions TEXT[]` (**비공개 — 본인만 열람**), `companion_count INT` (필터/통계용)
- 와인 연결: `linked_wine_id UUID`

### 12.2 와인

| 항목 | 입력 방식 | AI 지원 |
|------|----------|---------|
| 와인 메타데이터 | 확인/수정 (producer, vintage, region 등 전체) | AI 인식 결과 pre-fill |
| 한줄 코멘트 | 텍스트 200자 | — |
| 동반자 | 사용자 태그 + 추가 버튼 | — |
| 비공개 메모 | 텍스트 (자물쇠 아이콘 표시) | — |
| 가격 (병) | 금액 입력 | — |
| 방문일 | 날짜 선택 (기본: 오늘) | — |
| 어디서 마셨나요? | 인라인 식당 검색 → 연결 (`LinkSearchSheet`) | — |

- 식당 연결: `linked_restaurant_id UUID`
- 와인 메타데이터 업데이트: `wineMetaUpdate` → `wines` 테이블 반영 (vintage, producer, region 계층, ABV, body/acidity/sweetness, classification, servingTemp, decanting, reference_price_min/max, drinking_window, vivino, critic_scores, tasting_notes)

---

## §13. DB 스키마 (records 주요 필드)

> 전체 스키마는 DATA_MODEL.md SSOT. 본 섹션은 평가·플로우에 직접 관련된 필드만.

```sql
-- 대상
target_id          UUID NOT NULL
target_type        TEXT NOT NULL CHECK (target_type IN ('restaurant','wine'))
camera_mode        TEXT CHECK (camera_mode IN ('individual','shelf','receipt'))  -- 와인 전용
ocr_data           JSONB  -- cameraMode별 OCR 원본

-- 사분면 평가
axis_x             DECIMAL(5,2)  -- 0~100
axis_y             DECIMAL(5,2)  -- 0~100
satisfaction       INT           -- 1~100, (axis_x + axis_y) / 2 (chk_records_satisfaction)

-- 경험 데이터
scene              VARCHAR(20)
comment            VARCHAR(200)
total_price        INT           -- 식당: 1인 가격
purchase_price     INT           -- 와인: 병 가격
visit_date         DATE
meal_time          VARCHAR(10)   -- breakfast|lunch|dinner|snack

-- 와인 아로마 (3링)
aroma_primary      TEXT[]
aroma_secondary    TEXT[]
aroma_tertiary     TEXT[]

-- 와인 BLIC
balance            DECIMAL(5,2)  -- 0~100
finish             DECIMAL(5,2)  -- 0~100 (초 환산 표시)
intensity          INT           -- 0~100
complexity         INT           -- 0~100
auto_score         INT           -- 자동 산출 만족도

-- 페어링·메뉴
pairing_categories TEXT[]        -- 와인: WSET 8카테고리
menu_tags          TEXT[]        -- 식당: 메뉴 태그

-- 메모·동반자
private_note       TEXT          -- 비공개
companion_count    INT
companions         TEXT[]        -- 비공개

-- 연결
linked_restaurant_id UUID        -- 와인 → 식당
linked_wine_id       UUID        -- 식당 → 와인

-- GPS & 메타
has_exif_gps       BOOLEAN
is_exif_verified   BOOLEAN
record_quality_xp  INT
score_updated_at   TIMESTAMPTZ

created_at, updated_at
```

---

## §14. 코드 구조 참조

### 14.1 도메인

| 분류 | 파일 |
|------|------|
| 기록 엔티티 | `src/domain/entities/record.ts` |
| 카메라/AI 결과 엔티티 | `src/domain/entities/camera.ts` |
| 아로마 엔티티 | `src/domain/entities/aroma.ts` |
| 사분면 엔티티 | `src/domain/entities/quadrant.ts` |
| 품질 평가 엔티티 | `src/domain/entities/wine-structure.ts` |
| 상황 태그 엔티티 | `src/domain/entities/scene.ts` |
| 페어링 엔티티 | `src/domain/entities/pairing.ts` |
| 점수 엔티티 | `src/domain/entities/score.ts` |
| 유사도 엔티티 | `src/domain/entities/similarity.ts` |
| AI 매칭 서비스 | `src/domain/services/ai-recognition.ts` |
| 점수 폴백 서비스 | `src/domain/services/score-fallback.ts` |
| CF 계산 서비스 | `src/domain/services/cf-calculator.ts` |
| 기록 리포지토리 (IF) | `src/domain/repositories/record-repository.ts` |

### 14.2 인프라스트럭처

| 분류 | 파일 |
|------|------|
| 기록 리포 구현 | `src/infrastructure/repositories/supabase-record-repository.ts` |
| 와인 리포 구현 | `src/infrastructure/repositories/supabase-wine-repository.ts` |
| 식당 리포 구현 | `src/infrastructure/repositories/supabase-restaurant-repository.ts` |
| LLM 라우터 | `src/infrastructure/api/llm.ts` |
| Gemini provider | `src/infrastructure/api/providers/gemini.ts` |
| AI 프롬프트/파싱 | `src/infrastructure/api/ai-recognition.ts` |
| Kakao 검색 | `src/infrastructure/api/kakao-local.ts` |
| Naver 검색 | `src/infrastructure/api/naver-local.ts` |
| Google Places | `src/infrastructure/api/google-places.ts` |

### 14.3 애플리케이션

| 훅 | 파일 |
|----|------|
| 기록 생성 | `src/application/hooks/use-create-record.ts` |
| 기록 수정/삭제 | `src/application/hooks/use-record-update.ts`, `use-delete-record.ts`, `use-record-editor.ts` |
| 기록 상세/목록 | `src/application/hooks/use-record-detail.ts`, `use-records.ts` |
| 카메라 캡처 | `src/application/hooks/use-camera-capture.ts` |
| 기록 플로우 | `src/application/hooks/use-add-flow.ts` |
| 와인 검색 | `src/application/hooks/use-wine-search.ts` |
| 검색 | `src/application/hooks/use-search.ts` |
| CF 점수 | `src/application/hooks/use-nyam-score.ts`, `use-feed-scores.ts`, `use-similarity.ts` |
| 4종 점수 카드 | `src/application/hooks/use-target-scores.ts` |

### 14.4 프레젠테이션

| 컴포넌트 | 파일 |
|----------|------|
| 사분면 입력 | `src/presentation/components/record/quadrant-input.tsx` |
| 사분면 참조 점 | `src/presentation/components/record/quadrant-ref-dot.tsx` |
| 미니 사분면 | `src/presentation/components/record/mini-quadrant.tsx` |
| 아로마 휠 | `src/presentation/components/record/aroma-wheel.tsx` |
| 아로마 섹터 | `src/presentation/components/record/aroma-sector.tsx` |
| 품질 평가 UI | `src/presentation/components/record/wine-structure-eval.tsx` |
| 페어링 그리드 | `src/presentation/components/record/pairing-grid.tsx` |
| 식당 기록 폼 | `src/presentation/components/record/restaurant-record-form.tsx` |
| 와인 기록 폼 | `src/presentation/components/record/wine-record-form.tsx` |
| 카메라 캡처 | `src/presentation/components/camera/camera-capture.tsx` |
| 와인 컨펌 카드 | `src/presentation/components/camera/wine-confirm-card.tsx` |
| 점수 카드 | `src/presentation/components/detail/score-cards.tsx` |
| 출처 뱃지 | `src/presentation/components/home/score-source-badge.tsx` |
| 기록 플로우 컨테이너 | `src/presentation/containers/record-flow-container.tsx` |
| 추가 플로우 컨테이너 | `src/presentation/containers/add-flow-container.tsx` |
| 검색 컨테이너 | `src/presentation/containers/search-container.tsx` |

### 14.5 API / Edge Functions

| 경로 | 역할 |
|------|------|
| `src/app/api/records/identify/route.ts` | AI 인식 통합 진입점 (식당 GPS + 와인 3모드) |
| `src/app/api/restaurants/search/route.ts` | 3-API 통합 검색 + dedup |
| `src/app/api/restaurants/route.ts` | 식당 CRUD (+ Google Place Detail 보강) |
| `src/app/api/wines/search/route.ts` | 와인 DB 검색 |
| `src/app/api/wines/search-ai/route.ts` | 와인 AI 후보 검색 |
| `src/app/api/wines/detail-ai/route.ts` | 와인 AI 상세 + upsert |
| `supabase/functions/compute-similarity` | CF 적합도 증분 갱신 |
| `supabase/functions/predict-score` | 단건 CF 예측 |
| `supabase/functions/batch-predict` | 배치 CF 예측 (최대 50건) |

### 14.6 DB 마이그레이션 주요 지점

| 마이그레이션 | 내용 |
|-------------|------|
| `005_records.sql` | records 기본 스키마 |
| `028_records_visits_jsonb.sql` → Phase 5에서 flat 전환 | visits JSONB 구조(제거됨) |
| `040_records_add_intensity.sql` | intensity 컬럼 추가 |
| `041_aroma_wset_restructure.sql` | WSET 3링 16섹터 구조 |
| `045_record_photos_exif_columns.sql` | EXIF GPS |
| `051_cf_tables.sql` | user_similarities, user_score_means |
| `052_cf_trigger.sql` → `078_cf_trigger_with_pg_net.sql` | CF 자동 갱신 트리거 |
| `082_security_hardening.sql` | GUC 전환 (`app.service_role_key`/`app.supabase_url` 기반, 키 회전 대응) |

---

## §15. 상호 참조

| 주제 | SSOT 문서 |
|------|-----------|
| DB 스키마·제약·RLS | DATA_MODEL.md |
| CSS 변수·토큰·컴포넌트 스타일 | DESIGN_SYSTEM.md |
| XP 산출 공식·레벨·어뷰징 | XP_SYSTEM.md |
| 추천 7종·CF 수식·스케일링 | RECOMMENDATION.md |
| 위치 dedup·생활권·area_zones·지도 | MAP_LOCATION.md |
| 소셜 (버블/팔로우/리액션/댓글) | SOCIAL_SYSTEM.md |
| 쿼리 최적화 (RPC/인덱스) | QUERY_OPTIMIZATION.md |
| 인증·권한·프라이버시 | AUTH.md |
