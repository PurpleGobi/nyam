# S2-T02: 사분면 UI — QuadrantInput, QuadrantDot, QuadrantRefDot

> 식당(가격x분위기)과 와인(산미xBody) 사분면을 터치/드래그로 조작하는 인터랙티브 컴포넌트. 위치 이동과 만족도(크기) 조절을 모드 전환 없이 드래그 방향으로 구분한다.

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `systems/RATING_ENGINE.md` | §2 사분면 축 정의 | X/Y축 의미, 레이블 |
| `systems/RATING_ENGINE.md` | §3 조작 플로우 | 제스처, 힌트 텍스트 |
| `systems/RATING_ENGINE.md` | §4 점 비주얼 스펙 | 크기, 색상, glow, 참조 점 |
| `systems/RATING_ENGINE.md` | §5 애니메이션 & 햅틱 | 햅틱 피드백 |
| `systems/RATING_ENGINE.md` | §6 배경 레퍼런스 | 참조 점 데이터 소스, 표시 규칙 |
| `systems/DESIGN_SYSTEM.md` | §1 만족도 게이지 색상 | 5단계 gauge hex |
| `systems/DESIGN_SYSTEM.md` | §15b Circle Rating | 크기 공식, glow |
| `prototype/01_home.html` | screen-rest-record, screen-wine-record | 비주얼 레퍼런스 |

---

## 선행 조건

- S2-T01 (Domain 엔티티) 완료 — `QuadrantPoint`, `QuadrantReferencePoint`, `getCircleRatingSize`, `getRefDotSize`, `getGaugeLevel` 사용 가능
- S1-T03 (디자인 토큰) 완료 — `--gauge-1` ~ `--gauge-5`, `--bg`, `--border`, `--text-hint` CSS 변수 존재
- `shared/utils/gauge-color.ts` 생성 (이 태스크에서 함께 생성)

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/shared/utils/gauge-color.ts` | shared | 만족도 → gauge hex 변환 유틸 |
| `src/presentation/components/record/quadrant-input.tsx` | presentation | 사분면 메인 컴포넌트 (캔버스 영역 + 축 라벨 + 힌트) |
| `src/presentation/components/record/quadrant-dot.tsx` | presentation | 현재 점 (드래그 가능, Circle Rating) |
| `src/presentation/components/record/quadrant-ref-dot.tsx` | presentation | 참조 점 (읽기 전용, opacity 0.3) |

### 스코프 외

- 사분면 데이터 저장 로직 (application hook) — S2-T06
- 참조 점 데이터 fetch (application hook) — S2-T06
- 상황 태그 선택 UI — S2-T06 기록 플로우에서 통합
- 상세 페이지의 "내 식당/와인 지도" 사분면 — S4

---

## 상세 구현 지침

### 1. `src/shared/utils/gauge-color.ts`

```typescript
// src/shared/utils/gauge-color.ts

/**
 * 만족도 게이지 5단계 hex 색상
 * DESIGN_SYSTEM.md §1 만족도 게이지 색상
 * RATING_ENGINE.md §4 게이지 색상
 */
export const GAUGE_COLORS = {
  1: '#C4B5A8', // 0~20:  웜그레이
  2: '#B0ADA4', // 21~40: 쿨그레이
  3: '#9FA5A3', // 41~60: 세이지
  4: '#889DAB', // 61~80: 스틸블루
  5: '#7A9BAE', // 81~100: 슬레이트
} as const

/**
 * 만족도 점수(0~100) → gauge hex 색상
 * @param score 0~100
 * @returns hex 색상 문자열 (예: '#7A9BAE')
 */
export function getGaugeColor(score: number): string {
  if (score <= 20) return GAUGE_COLORS[1]
  if (score <= 40) return GAUGE_COLORS[2]
  if (score <= 60) return GAUGE_COLORS[3]
  if (score <= 80) return GAUGE_COLORS[4]
  return GAUGE_COLORS[5]
}

/**
 * 만족도 점수(0~100) → CSS 변수명
 * @param score 0~100
 * @returns CSS 변수명 (예: '--gauge-5')
 */
export function getGaugeCssVar(score: number): string {
  if (score <= 20) return '--gauge-1'
  if (score <= 40) return '--gauge-2'
  if (score <= 60) return '--gauge-3'
  if (score <= 80) return '--gauge-4'
  return '--gauge-5'
}
```

### 2. `src/presentation/components/record/quadrant-input.tsx`

**Props 인터페이스**:

```typescript
interface QuadrantInputProps {
  /** 'restaurant': X=가격, Y=분위기 / 'wine': X=산미, Y=바디 */
  type: 'restaurant' | 'wine'

  /** 현재 값 */
  value: { x: number; y: number; satisfaction: number }

  /** 값 변경 콜백 */
  onChange: (value: { x: number; y: number; satisfaction: number }) => void

  /**
   * 참조 점 (과거 기록, 최대 8~12개)
   * opacity 0.3, pointer-events: none
   */
  referencePoints?: Array<{
    x: number
    y: number
    satisfaction: number
    name: string
    score: number
  }>
}
```

**레이아웃 구조**:

```
┌─────────────────────────────────────────┐
│  [Y축 상단 라벨]                          │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ [X축 좌 라벨]   QUADRANT     [X축 우] │    │
│  │                                 │    │
│  │   (ref dots)                    │    │
│  │         ● (current dot)         │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Y축 하단 라벨]                          │
│                                         │
│  [힌트 텍스트]                            │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────────┐        │
│  │ X: 45%│ │ Y: 62%│ │ 만족도: 78│        │
│  └──────┘ └──────┘ └──────────┘        │
└─────────────────────────────────────────┘
```

**축 라벨 (4 corners)**:

| type | X 좌(0%) | X 우(100%) | Y 상단(100%) | Y 하단(0%) |
|------|----------|-----------|-------------|-----------|
| `restaurant` | 저렴 | 고가 | 포멀 | 캐주얼 |
| `wine` | 산미 낮음 | 산미 높음 | Full Body | Light Body |

**축 라벨 스타일**:
- font-size: 11px
- font-weight: 500
- color: `var(--text-hint)` (#B5AFA8)

**사분면 영역 스타일**:
- 배경: `var(--bg-card)` (#FEFCFA)
- 보더: `1px solid var(--border)` (#E8E4DF)
- border-radius: `var(--r-lg)` (12px)
- 크기: width 100%, aspect-ratio 1/1 (정사각형)
- 최대 너비: 320px (모바일 360px - 좌우 패딩 20px)
- 십자선: 중앙 수평/수직 1px dashed `var(--border)` (#E8E4DF)

**힌트 텍스트**:
- 내용: "좌우 드래그: 위치 이동 · 원 위에서 상하 드래그: 만족도(크기) 변경"
- font-size: 11px
- color: `var(--text-hint)` (#B5AFA8)
- text-align: center
- margin-top: 8px

**수치 칩 (X%, Y%, 만족도)**:
- 3개 칩 가로 배치, gap: 8px
- 각 칩: padding 4px 10px, border-radius `var(--r-sm)` (6px)
- 배경: `var(--bg)` (#F8F6F3)
- 보더: `1px solid var(--border)` (#E8E4DF)
- font-size: 13px, font-weight: 600
- color: `var(--text)` (#3D3833)
- 만족도 칩의 배경색: `getGaugeColor(satisfaction)` + opacity 0.15

**제스처 처리 핵심 로직**:

```typescript
// 상태 관리
const [isDraggingPosition, setIsDraggingPosition] = useState(false)
const [isDraggingSatisfaction, setIsDraggingSatisfaction] = useState(false)
const dragStartRef = useRef<{ x: number; y: number; satisfaction: number } | null>(null)

// 포인터 이벤트 핸들러 (사분면 영역)
function handlePointerDown(e: React.PointerEvent) {
  const rect = quadrantRef.current.getBoundingClientRect()
  const relX = (e.clientX - rect.left) / rect.width  // 0~1
  const relY = 1 - (e.clientY - rect.top) / rect.height  // 0~1, Y축 반전 (위가 100%)

  // 현재 점과의 거리 계산
  const dotX = value.x / 100
  const dotY = value.y / 100
  const distance = Math.sqrt((relX - dotX) ** 2 + (relY - dotY) ** 2)

  // 점 위 터치 (반경 내): 만족도 드래그 모드
  const dotRadius = getCircleRatingSize(value.satisfaction) / 2 / rect.width
  if (distance < dotRadius * 1.5) {
    setIsDraggingSatisfaction(true)
    dragStartRef.current = { x: e.clientY, y: value.satisfaction, satisfaction: value.satisfaction }
    // 햅틱: light tap
    navigator?.vibrate?.(10)
  } else {
    // 점 바깥 탭: 위치 이동
    setIsDraggingPosition(true)
    const newX = Math.max(0, Math.min(100, Math.round(relX * 100)))
    const newY = Math.max(0, Math.min(100, Math.round(relY * 100)))
    onChange({ x: newX, y: newY, satisfaction: value.satisfaction })
    // 햅틱: light tap
    navigator?.vibrate?.(10)
  }

  e.currentTarget.setPointerCapture(e.pointerId)
}

function handlePointerMove(e: React.PointerEvent) {
  if (isDraggingPosition) {
    const rect = quadrantRef.current.getBoundingClientRect()
    const relX = (e.clientX - rect.left) / rect.width
    const relY = 1 - (e.clientY - rect.top) / rect.height
    const newX = Math.max(0, Math.min(100, Math.round(relX * 100)))
    const newY = Math.max(0, Math.min(100, Math.round(relY * 100)))

    // 50% 중심선 지날 때 햅틱
    if ((value.x < 50 && newX >= 50) || (value.x >= 50 && newX < 50) ||
        (value.y < 50 && newY >= 50) || (value.y >= 50 && newY < 50)) {
      navigator?.vibrate?.(15)
    }

    onChange({ x: newX, y: newY, satisfaction: value.satisfaction })
  }

  if (isDraggingSatisfaction && dragStartRef.current) {
    // 상하 드래그: 위=증가, 아래=감소
    const deltaY = dragStartRef.current.x - e.clientY  // 위로 가면 양수
    const sensitivity = 0.5  // px당 만족도 변화량
    const newSat = Math.max(1, Math.min(100, Math.round(
      dragStartRef.current.satisfaction + deltaY * sensitivity
    )))

    // 10점 단위 햅틱
    if (Math.floor(value.satisfaction / 10) !== Math.floor(newSat / 10)) {
      navigator?.vibrate?.(15)
    }

    onChange({ x: value.x, y: value.y, satisfaction: newSat })
  }
}

function handlePointerUp(e: React.PointerEvent) {
  setIsDraggingPosition(false)
  setIsDraggingSatisfaction(false)
  dragStartRef.current = null
  e.currentTarget.releasePointerCapture(e.pointerId)
}
```

**touch-action**: `none` (브라우저 기본 스크롤 방지)

### 3. `src/presentation/components/record/quadrant-dot.tsx`

**Props 인터페이스**:

```typescript
interface QuadrantDotProps {
  /** X 위치: 0~100 */
  x: number
  /** Y 위치: 0~100 */
  y: number
  /** 만족도: 1~100 (크기, 색상, glow 결정) */
  satisfaction: number
  /** 만족도 드래그 중 여부 (glow 강화) */
  isDragging: boolean
}
```

**비주얼 스펙 (RATING_ENGINE.md §4 Circle Rating)**:

| 속성 | 값 | 공식/출처 |
|------|-----|----------|
| 지름 | 28px ~ 120px | `28 + (score / 100) * 92` |
| 색상 (fill) | 5단계 gauge | `getGaugeColor(satisfaction)` |
| Glow | `box-shadow` | `0 0 ${size * 0.3}px ${color}80` |
| 숫자 | font-weight 800, color #fff | font-size = `max(12, diameter * 0.3)` |
| transition (크기) | 0.08s ease-out | — |
| transition (색상/glow) | 0.15s ease-out | — |

**Glow (RATING_ENGINE.md §4, DESIGN_SYSTEM.md §15b)**:

동적 glow 공식 (SSOT 기준):
```typescript
const glowSize = size * 0.3
style={{ boxShadow: `0 0 ${glowSize}px ${color}80` }}
```

드래그 중이면 glow 강화:
```typescript
const glowSize = isDragging ? size * 0.5 : size * 0.3
const glowOpacity = isDragging ? 'A6' : '80'
style={{ boxShadow: `0 0 ${glowSize}px ${color}${glowOpacity}` }}
```

**렌더링**:

```typescript
export function QuadrantDot({ x, y, satisfaction, isDragging }: QuadrantDotProps) {
  const size = 28 + (satisfaction / 100) * 92
  const color = getGaugeColor(satisfaction)
  const fontSize = Math.max(12, size * 0.3)

  // 동적 Glow 공식 (SSOT: size * 0.3)
  const glowSize = isDragging ? size * 0.5 : size * 0.3
  const glowOpacity = isDragging ? 'A6' : '80'
  const glowShadow = `0 0 ${glowSize}px ${color}${glowOpacity}`

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        bottom: `${y}%`,
        transform: 'translate(-50%, 50%)',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: glowShadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'width 0.08s ease-out, height 0.08s ease-out, background-color 0.15s ease-out, box-shadow 0.15s ease-out',
        cursor: 'grab',
        touchAction: 'none',
        zIndex: 10,
      }}
    >
      <span
        style={{
          fontWeight: 800,
          color: '#FFFFFF',
          fontSize: `${fontSize}px`,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {satisfaction}
      </span>
    </div>
  )
}
```

### 4. `src/presentation/components/record/quadrant-ref-dot.tsx`

**Props 인터페이스**:

```typescript
interface QuadrantRefDotProps {
  /** X 위치: 0~100 */
  x: number
  /** Y 위치: 0~100 */
  y: number
  /** 만족도 (크기 결정): 1~100 */
  satisfaction: number
  /** 식당/와인 이름 */
  name: string
  /** 표시 점수 */
  score: number
}
```

**비주얼 스펙 (RATING_ENGINE.md §4 참조 점)**:

| 속성 | 값 |
|------|-----|
| opacity | 0.3 |
| pointer-events | none |
| 숫자 | 9px, font-weight 700, color white |
| 이름 라벨 | 9px, color `var(--text-hint)` (#B5AFA8), 점 아래 배치 |

**만족도 → 참조 점 크기 매핑 (RATING_ENGINE.md §4)**:

| 만족도 | 지름 |
|--------|------|
| 1~20 | 14px |
| 21~40 | 20px |
| 41~60 | 26px |
| 61~80 | 36px |
| 81~100 | 48px |

**렌더링**:

```typescript
import { getRefDotSize } from '@/domain/entities/quadrant'
import { getGaugeColor } from '@/shared/utils/gauge-color'

export function QuadrantRefDot({ x, y, satisfaction, name, score }: QuadrantRefDotProps) {
  const size = getRefDotSize(satisfaction)
  const color = getGaugeColor(satisfaction)

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        bottom: `${y}%`,
        transform: 'translate(-50%, 50%)',
        opacity: 0.3,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 1,
      }}
    >
      {/* 점 */}
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1,
          }}
        >
          {score}
        </span>
      </div>

      {/* 이름 라벨 (점 아래) */}
      <span
        style={{
          fontSize: '9px',
          color: 'var(--text-hint)',
          marginTop: '2px',
          whiteSpace: 'nowrap',
          maxWidth: '48px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </span>
    </div>
  )
}
```

---

## 목업 매핑

| 목업 화면 | 구현 컴포넌트 | 대응 요소 |
|-----------|-------------|----------|
| `prototype/01_home.html` screen-rest-record | `QuadrantInput type="restaurant"` | 사분면 + 참조 점 + 축 라벨 |
| `prototype/01_home.html` screen-wine-record | `QuadrantInput type="wine"` | 사분면 + 참조 점 + 축 라벨 |
| `prototype/00_design_system.html` §15 | `QuadrantRefDot` | 참조 점 크기/색상 5단계 |
| `prototype/00_design_system.html` §15b | `QuadrantDot` | Circle Rating 크기/glow |

---

## 데이터 흐름

```
QuadrantInput (state: { x, y, satisfaction })
  │
  ├─ 포인터 이벤트 → 위치 계산 / 만족도 계산
  │   └─ onChange({ x, y, satisfaction }) → 부모 컴포넌트
  │
  ├─ QuadrantDot (현재 점)
  │   ├─ x, y → position (absolute, left %, bottom %)
  │   ├─ satisfaction → size (28~120px), color (gauge), glow, fontSize
  │   └─ isDragging → glow 레벨 (glow-1 / glow-2)
  │
  └─ QuadrantRefDot × N (참조 점, 최대 12개)
      ├─ x, y → position
      ├─ satisfaction → size (14~48px), color (gauge)
      ├─ score → 9px 숫자 표시
      └─ name → 9px 라벨 표시
```

---

## 검증 체크리스트

```
□ R4 검증: Supabase/infrastructure import 없음
□ QuadrantInput: restaurant/wine 타입별 축 라벨 4개 정확
  - restaurant: 저렴/고가/포멀/캐주얼
  - wine: 산미 낮음/산미 높음/Full Body/Light Body
□ 힌트 텍스트: "좌우 드래그: 위치 이동 · 원 위에서 상하 드래그: 만족도(크기) 변경"
□ QuadrantDot 크기 공식: 28 + (score/100) * 92 — 0→28px, 100→120px
□ QuadrantDot 색상: getGaugeColor 5단계 정확 (#C4B5A8 ~ #7A9BAE)
□ QuadrantDot glow: 동적 공식 `0 0 ${size*0.3}px ${color}80` (드래그 시 size*0.5, opacity A6)
□ QuadrantDot 숫자: weight 800, white, fontSize = max(12, diameter*0.3)
□ QuadrantDot transition: 크기 0.08s, 색상/glow 0.15s
□ QuadrantRefDot opacity: 0.3
□ QuadrantRefDot pointer-events: none
□ QuadrantRefDot 크기: 14/20/26/36/48px 5단계
□ QuadrantRefDot 숫자: 9px, 700, white
□ QuadrantRefDot 라벨: 9px, --text-hint
□ 사분면 영역 정사각형 (aspect-ratio 1/1)
□ 사분면 최대 너비 320px
□ 십자선: 중앙 1px dashed --border
□ touch-action: none (스크롤 방지)
□ 참조 점 최대 12개
□ 햅틱: 탭 시 light tap, 50% 중심선 딸깍, 10점 단위 딸깍
□ 수치 칩 3개 (X%, Y%, 만족도) 실시간 업데이트
□ 360px 뷰포트에서 레이아웃 깨짐 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ any, as any, @ts-ignore, ! 단언 0개
```
