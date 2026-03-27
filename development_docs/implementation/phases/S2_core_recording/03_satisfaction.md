# S2-T03: 만족도 게이지 + Circle Rating

> 수평 바 형태의 SatisfactionGauge(읽기 전용 표시)와 드래그로 조작하는 CircleRating(인터랙티브 입력) 2개 컴포넌트를 구현한다.

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `systems/RATING_ENGINE.md` | §3 조작 플로우 | 만족도 드래그 인터랙션 |
| `systems/RATING_ENGINE.md` | §4 점 비주얼 스펙 | Circle Rating 크기/색상/glow/숫자 |
| `systems/RATING_ENGINE.md` | §5 애니메이션 & 햅틱 | 만족도 드래그 햅틱, glow 레벨 변화 |
| `systems/DESIGN_SYSTEM.md` | §1 만족도 게이지 색상 | 5단계 gauge hex |
| `systems/DESIGN_SYSTEM.md` | §2 타이포그래피 | Display 36px/800 (큰 숫자) |
| `prototype/00_design_system.html` | §15b Circle Rating | 비주얼 레퍼런스 |

---

## 선행 조건

- S2-T01 (Domain 엔티티) 완료 — `getCircleRatingSize`, `getGaugeLevel` 함수 사용 가능
- S2-T02에서 `shared/utils/gauge-color.ts` 생성 완료 — `getGaugeColor`, `GAUGE_COLORS` 사용 가능
- S1-T03 (디자인 토큰) 완료 — `--gauge-1` ~ `--gauge-5`, `--bg`, `--border`, `--text-hint` CSS 변수 존재

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/presentation/components/record/satisfaction-gauge.tsx` | presentation | 수평 바 게이지 (읽기 전용) |
| `src/presentation/components/record/circle-rating.tsx` | presentation | 드래그 가능한 원형 레이팅 |

### 스코프 외

- QuadrantInput 내부의 만족도 조작 (S2-T02에서 이미 구현)
- 만족도 자동 산출 로직 (S2-T01 `calculateAutoScore`에서 정의 완료)
- 카드 인라인 점수 표시 — S4 상세 페이지

---

## 상세 구현 지침

### 1. `src/presentation/components/record/satisfaction-gauge.tsx`

**용도**: 기록 상세, 카드, 프로필 등에서 만족도를 수평 바로 표시하는 읽기 전용 컴포넌트.

**Props 인터페이스**:

```typescript
interface SatisfactionGaugeProps {
  /** 만족도: 1~100 */
  value: number

  /** 좌측 힌트 라벨 (기본값: "별로") */
  labelLeft?: string

  /** 우측 힌트 라벨 (기본값: "최고") */
  labelRight?: string

  /** 숫자 표시 여부 (기본값: true) */
  showNumber?: boolean
}
```

**비주얼 스펙**:

| 요소 | 속성 | 값 |
|------|------|-----|
| 전체 컨테이너 | width | 100% |
| 전체 컨테이너 | height | 32px |
| 트랙 (배경) | background | `var(--bg)` (#F8F6F3) |
| 트랙 (배경) | border | `1px solid var(--border)` (#E8E4DF) |
| 트랙 (배경) | border-radius | 9999px (rounded-full) |
| 트랙 (배경) | height | 32px |
| 게이지 (fill) | background | `getGaugeColor(value)` |
| 게이지 (fill) | width | `${value}%` |
| 게이지 (fill) | height | 100% |
| 게이지 (fill) | border-radius | 9999px |
| 게이지 (fill) | transition | `width 0.2s ease-out, background-color 0.15s ease-out` |
| 숫자 라벨 | font-size | 14px |
| 숫자 라벨 | font-weight | 700 |
| 숫자 라벨 | color | #FFFFFF |
| 숫자 라벨 | position | absolute, 게이지 fill 내부 중앙 |
| 좌측 힌트 | text | "별로" |
| 좌측 힌트 | font-size | 11px |
| 좌측 힌트 | color | `var(--text-hint)` (#B5AFA8) |
| 좌측 힌트 | position | 트랙 좌측 외부, margin-right 6px |
| 우측 힌트 | text | "최고" |
| 우측 힌트 | font-size | 11px |
| 우측 힌트 | color | `var(--text-hint)` (#B5AFA8) |
| 우측 힌트 | position | 트랙 우측 외부, margin-left 6px |

**렌더링**:

```tsx
import { getGaugeColor } from '@/shared/utils/gauge-color'

export function SatisfactionGauge({
  value,
  labelLeft = '별로',
  labelRight = '최고',
  showNumber = true,
}: SatisfactionGaugeProps) {
  const color = getGaugeColor(value)
  const clampedValue = Math.max(1, Math.min(100, value))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
      {/* 좌측 힌트 */}
      <span
        style={{
          fontSize: '11px',
          color: 'var(--text-hint)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {labelLeft}
      </span>

      {/* 트랙 */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          height: '32px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
      >
        {/* 게이지 fill */}
        <div
          style={{
            width: `${clampedValue}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: '9999px',
            transition: 'width 0.2s ease-out, background-color 0.15s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '32px',
          }}
        >
          {showNumber && (
            <span
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#FFFFFF',
                lineHeight: 1,
              }}
            >
              {clampedValue}
            </span>
          )}
        </div>
      </div>

      {/* 우측 힌트 */}
      <span
        style={{
          fontSize: '11px',
          color: 'var(--text-hint)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {labelRight}
      </span>
    </div>
  )
}
```

---

### 2. `src/presentation/components/record/circle-rating.tsx`

**용도**: 기록 플로우에서 만족도를 드래그로 입력하는 인터랙티브 원형 컴포넌트. 사분면 내부(`QuadrantDot`)와 독립적으로도 사용 가능.

**Props 인터페이스**:

```typescript
interface CircleRatingProps {
  /** 현재 만족도: 1~100 */
  value: number

  /** 값 변경 콜백 */
  onChange: (value: number) => void

  /** 비활성화 (기본값: false) */
  disabled?: boolean
}
```

**비주얼 스펙 (RATING_ENGINE.md §4 Circle Rating)**:

| 속성 | 값 | 공식 |
|------|-----|------|
| 크기 범위 | 28px (score 0) → 120px (score 100) | `size = 28 + (score / 100) * 92` |
| 색상 | 5단계 gauge | `getGaugeColor(score)` |
| Glow | box-shadow | `0 0 ${size * 0.3}px ${color}80` |
| 숫자 | weight 800, color #fff | font-size = `max(12, diameter * 0.3)` |
| transition (크기) | 0.08s ease-out | — |
| transition (색상/glow) | 0.15s ease-out | — |

**Glow 레벨 (RATING_ENGINE.md §4)**:

| 상태 | box-shadow | filter |
|------|-----------|--------|
| 기본 (glow-1) | `0 0 ${size*0.3}px ${color}80` | none |
| 드래그 중 (glow-2) | `0 0 ${size*0.3}px ${color}A6` | `brightness(1.1)` |
| 고점수 81+ AND 드래그 중 (glow-3) | `0 0 ${size*0.3}px ${color}CC` | `brightness(1.2)` |

**인터랙션 상세**:

| 단계 | 행동 | 결과 |
|------|------|------|
| 1 | 원 위에서 pointerdown | 드래그 시작, glow-2 전환 |
| 2 | 수직 드래그 (위=증가, 아래=감소) | 실시간 크기/색상/glow/숫자 업데이트 |
| 3 | 원 밖으로 드래그 계속 | pointerup까지 계속 추적 (setPointerCapture) |
| 4 | pointerup | 드래그 종료, glow-1 복귀 |

**sensitivity (감도)**: 1px 수직 이동당 만족도 0.5 변화 (200px 드래그 = 100 변화)

**햅틱 피드백**:

| 이벤트 | 햅틱 | 패턴 |
|--------|------|------|
| 드래그 시작 | light tap | `navigator.vibrate(10)` |
| 10점 단위 통과 | click | `navigator.vibrate(15)` |
| glow 레벨 변화 (20↔21, 40↔41, 60↔61, 80↔81) | medium tap | `navigator.vibrate(20)` |

**렌더링**:

```tsx
import { useRef, useState, useCallback } from 'react'
import { getGaugeColor } from '@/shared/utils/gauge-color'

export function CircleRating({ value, onChange, disabled = false }: CircleRatingProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ clientY: number; startValue: number } | null>(null)
  const prevValueRef = useRef(value)

  const size = 28 + (value / 100) * 92
  const color = getGaugeColor(value)
  const fontSize = Math.max(12, size * 0.3)

  // Glow 결정
  let boxShadow: string
  let filter: string

  const glowSize = size * 0.3

  if (isDragging && value >= 81) {
    boxShadow = `0 0 ${glowSize}px ${color}CC`
    filter = 'brightness(1.2)'
  } else if (isDragging) {
    boxShadow = `0 0 ${glowSize}px ${color}A6`
    filter = 'brightness(1.1)'
  } else {
    boxShadow = `0 0 ${glowSize}px ${color}80`
    filter = 'brightness(1.0)'
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = { clientY: e.clientY, startValue: value }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    // 햅틱: light tap
    navigator?.vibrate?.(10)
  }, [disabled, value])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return

    const deltaY = dragStartRef.current.clientY - e.clientY // 위=양수
    const sensitivity = 0.5
    const newValue = Math.max(1, Math.min(100, Math.round(
      dragStartRef.current.startValue + deltaY * sensitivity
    )))

    // 10점 단위 햅틱
    if (Math.floor(prevValueRef.current / 10) !== Math.floor(newValue / 10)) {
      navigator?.vibrate?.(15)
    }

    // glow 레벨 변화 햅틱 (gauge 경계: 20, 40, 60, 80)
    const prevLevel = getGaugeLevel(prevValueRef.current)
    const newLevel = getGaugeLevel(newValue)
    if (prevLevel !== newLevel) {
      navigator?.vibrate?.(20)
    }

    prevValueRef.current = newValue
    onChange(newValue)
  }, [isDragging, onChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false)
    dragStartRef.current = null
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }, [])

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow,
        filter,
        cursor: disabled ? 'default' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
        transition: 'width 0.08s ease-out, height 0.08s ease-out, background-color 0.15s ease-out, box-shadow 0.15s ease-out, filter 0.15s ease-out',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span
        style={{
          fontWeight: 800,
          color: '#FFFFFF',
          fontSize: `${fontSize}px`,
          lineHeight: 1,
          pointerEvents: 'none',
        }}
      >
        {value}
      </span>
    </div>
  )
}

// glow 레벨 판정용 (domain에서 import하지 않고 인라인 정의 가능)
function getGaugeLevel(score: number): number {
  if (score <= 20) return 1
  if (score <= 40) return 2
  if (score <= 60) return 3
  if (score <= 80) return 4
  return 5
}
```

---

## 목업 매핑

| 목업 화면 | 구현 컴포넌트 | 대응 요소 |
|-----------|-------------|----------|
| `prototype/00_design_system.html` §15b | `CircleRating` | Circle Rating 인터랙티브 원 |
| `prototype/01_home.html` screen-rest-record | `CircleRating` (사분면 내부) | 사분면 점 크기/색상 |
| `prototype/02_detail_restaurant.html` | `SatisfactionGauge` | 기록 카드 만족도 바 |
| `prototype/02_detail_wine.html` | `SatisfactionGauge` | 기록 카드 만족도 바 |

---

## 데이터 흐름

```
SatisfactionGauge (읽기 전용):
  value (1~100)
    ├─ getGaugeColor(value) → fill 색상
    ├─ ${value}% → fill 너비
    └─ 숫자 표시

CircleRating (인터랙티브):
  value (1~100) + onChange
    │
    ├─ pointerdown → isDragging = true
    │   └─ setPointerCapture (원 밖 추적)
    │
    ├─ pointermove (수직)
    │   ├─ deltaY × 0.5 → newValue
    │   ├─ 28 + (newValue/100) × 92 → size
    │   ├─ getGaugeColor(newValue) → color
    │   ├─ size × 0.3 → glow radius
    │   ├─ max(12, size × 0.3) → fontSize
    │   ├─ 10점 단위 체크 → 햅틱
    │   ├─ gauge 레벨 변화 체크 → 햅틱
    │   └─ onChange(newValue)
    │
    └─ pointerup → isDragging = false
        └─ releasePointerCapture
```

---

## 검증 체크리스트

```
□ R4 검증: Supabase/infrastructure import 없음
□ SatisfactionGauge
  □ 트랙 높이 32px, rounded-full
  □ 배경: var(--bg), 보더: var(--border)
  □ fill 색상: getGaugeColor(value) — 5단계 정확
  □ 숫자: 14px/700/white, fill 내부 중앙
  □ 좌측 힌트: "별로" 11px var(--text-hint)
  □ 우측 힌트: "최고" 11px var(--text-hint)
  □ fill transition: width 0.2s, background-color 0.15s
□ CircleRating
  □ 크기: 28 + (score/100) × 92 — 0→28px, 100→120px
  □ 색상: getGaugeColor(value) — 5단계 정확
  □ Glow 기본: 0 0 ${size*0.3}px ${color}80
  □ Glow 드래그: 0 0 ${size*0.3}px ${color}A6 + brightness(1.1)
  □ Glow 고점수+드래그: 0 0 ${size*0.3}px ${color}CC + brightness(1.2)
  □ 숫자: weight 800, white, fontSize = max(12, diameter×0.3)
  □ transition 크기: 0.08s ease-out
  □ transition 색상/glow: 0.15s ease-out
  □ 수직 드래그: 위=증가, 아래=감소
  □ 감도: 0.5/px (200px = 100 변화)
  □ pointerCapture: 원 밖 드래그 추적
  □ 햅틱: 시작 10ms, 10점 단위 15ms, gauge 경계 20ms
  □ touch-action: none
  □ disabled 상태 처리
□ gauge 색상 5단계 hex 정확
  □ gauge-1: #C4B5A8 (0~20)
  □ gauge-2: #B0ADA4 (21~40)
  □ gauge-3: #9FA5A3 (41~60)
  □ gauge-4: #889DAB (61~80)
  □ gauge-5: #7A9BAE (81~100)
□ 360px 뷰포트에서 레이아웃 깨짐 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ any, as any, @ts-ignore, ! 단언 0개
```
