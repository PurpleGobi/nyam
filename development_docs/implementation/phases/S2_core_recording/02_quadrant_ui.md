# S2-T02: 사분면 UI — QuadrantInput, QuadrantRefDot

> 식당(음식 퀄리티×경험 가치)과 와인(구조·완성도×즐거움·감성) 사분면을 터치/드래그로 조작하는 인터랙티브 컴포넌트.
> 만족도는 (x + y) / 2로 자동 계산된다 (독립 제스처가 아님).

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `systems/RATING_ENGINE.md` | §2 사분면 축 정의 | X/Y축 의미, 레이블 |
| `systems/RATING_ENGINE.md` | §3 조작 플로우 | 제스처, 힌트 텍스트 |
| `systems/RATING_ENGINE.md` | §4 점 비주얼 스펙 | 크기, 색상, 참조 점 |
| `systems/RATING_ENGINE.md` | §5 애니메이션 & 햅틱 | 햅틱 피드백 |
| `systems/RATING_ENGINE.md` | §6 배경 레퍼런스 | 참조 점 데이터 소스, 표시 규칙 |
| `systems/DESIGN_SYSTEM.md` | §1 게이지 색상 | gauge 색상 채널 |
| `prototype/01_home.html` | screen-rest-record, screen-wine-record | 비주얼 레퍼런스 |

---

## 선행 조건

- S2-T01 (Domain 엔티티) 완료 — `QuadrantPoint`, `QuadrantReferencePoint`, `getGaugeLevel` 사용 가능
- S1-T03 (디자인 토큰) 완료 — CSS 변수 존재
- `shared/utils/gauge-color.ts` 생성 (이 태스크에서 함께 생성)

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/shared/utils/gauge-color.ts` | shared | 점수 → gauge hex 변환 (채널별 색상 체계) |
| `src/presentation/components/record/quadrant-input.tsx` | presentation | 사분면 메인 컴포넌트 |
| `src/presentation/components/record/quadrant-ref-dot.tsx` | presentation | 참조 점 (읽기 전용, opacity 0.3) |
| `src/presentation/components/record/quadrant-dot.tsx` | presentation | Circle Rating 점 (레거시, QuadrantInput에서는 미사용) |

---

## 상세 구현 지침

### 1. `src/shared/utils/gauge-color.ts`

게이지 색상은 **채널별** 색상 체계를 사용한다:

```typescript
export type GaugeChannel = 'food' | 'experience' | 'total' | 'wine-total' | 'default'

const CHANNEL_STEPS: Record<GaugeChannel, string[]> = {
  food:         ['#C4B5A8', '#C8907A', '#C17B5E', '#B5603A', '#A83E1A'],
  experience:   ['#B5B0BA', '#A08DA8', '#8B7396', '#7A5A8E', '#6B3FA0'],
  total:        ['#C4BCA8', '#D4B85C', '#E0A820', '#D49215', '#C87A0A'],
  'wine-total': ['#D8D0E0', '#D0B0E8', '#C090E0', '#B070D8', '#A050D0'],
  default:      ['#C4B5A8', '#C8907A', '#C17B5E', '#B5603A', '#A83E1A'],
}

export function getGaugeColor(score: number, channel: GaugeChannel = 'default'): string
export function getGaugeCssVar(score: number): string
export function getGaugeTailwindClass(score: number): string
```

### 2. `src/presentation/components/record/quadrant-input.tsx`

**Props 인터페이스**:

```typescript
interface QuadrantInputProps {
  type: 'restaurant' | 'wine'
  value: { x: number; y: number; satisfaction?: number }
  onChange: (value: { x: number; y: number; satisfaction?: number }) => void
  referencePoints?: Array<{
    x: number; y: number; satisfaction: number; name: string; score: number
    targetId?: string; targetType?: 'restaurant' | 'wine'
  }>
  showHint?: boolean
  hideDot?: boolean           // 터치 전 상태에서 dot 숨김
  readOnly?: boolean          // 상세페이지 읽기 전용
  onRefNavigate?: (targetId: string, targetType: 'restaurant' | 'wine') => void
  onRefLongPress?: (refIndex: number) => void
  quadrantMode?: 'avg' | 'recent'
  onQuadrantModeChange?: (mode: 'avg' | 'recent') => void
}
```

**현재 점(Dot) 크기**: 고정 20px (`DOT_SIZE = 20`). 만족도에 따른 가변 크기 아님.

**축 라벨**:

| type | X축 | Y축 |
|------|-----|-----|
| `restaurant` | 맛,음식 완성도 → | 경험 만족도 → |
| `wine` | 구조 · 완성도 → | 즐거움 · 감성 → |

**사분면 라벨 (4분면)**:

| type | 우상 | 좌상 | 우하 | 좌하 |
|------|------|------|------|------|
| `restaurant` | 맛도 좋고 경험도 좋은 | 맛은 아쉽지만 경험이 좋은 | 경험은 아쉽지만 맛이 좋은 | 전반적으로 아쉬운 |
| `wine` | 잘 만들어졌고 마시면서도 좋은 | 완성도는 아쉽지만 마시면서 좋았던 | 잘 만들어졌지만 감흥이 적은 | 전반적으로 아쉬운 |

**만족도 계산**: `totalScore = Math.round((value.x + value.y) / 2)` — 자동 계산, 독립 드래그 없음.

**색상 채널**: X축은 `food` 채널, Y축은 `experience` 채널, 총점은 `total`(식당) 또는 `wine-total`(와인) 채널.

**제스처**: 사분면 영역 터치/드래그 → X, Y 좌표 업데이트. `setPointerCapture`로 영역 밖 드래그 추적.

**참조 점 겹침 순환**: 동일 위치(5% 이내)의 참조 점이 여러 개면 탭할 때마다 순환.

### 3. `src/presentation/components/record/quadrant-ref-dot.tsx`

**비주얼**: opacity 0.3, 고정 크기 20px, 탭 시 선택 표시.

### 4. `src/presentation/components/record/quadrant-dot.tsx`

**참고**: 이 컴포넌트는 Circle Rating 스타일의 가변 크기 점이다 (28px~120px).
`QuadrantInput`에서는 직접 사용하지 않으며, 고정 20px 인라인 div를 사용한다.
다른 컨텍스트(기록 상세 등)에서 사용될 수 있다.

---

## 검증 체크리스트

```
□ R4 검증: Supabase/infrastructure import 없음
□ QuadrantInput: restaurant/wine 타입별 축 라벨 정확
□ 만족도 자동 계산: (x + y) / 2
□ 현재 점 크기: 고정 20px
□ 게이지 색상: 채널별 (food/experience/total/wine-total) 정확
□ 사분면 라벨 4분면 정확
□ touch-action: none (스크롤 방지)
□ 참조 점 opacity 0.3, 겹침 순환 동작
□ readOnly, hideDot 모드 동작
□ 360px 뷰포트에서 레이아웃 깨짐 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
