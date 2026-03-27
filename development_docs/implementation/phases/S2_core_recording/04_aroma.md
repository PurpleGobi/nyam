# S2-T04: 아로마 팔레트 — AromaWheel, AromaSector

> WSET 체계적 시음 기반 15섹터 3링 원형 아로마 팔레트. 탭/드래그로 향 영역을 선택하면 선택된 섹터의 가중 평균 hex가 자동 계산되어 와인 사분면 점 색상으로 사용된다.

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `systems/RATING_ENGINE.md` | §8 아로마 팔레트 상세 스펙 | 15섹터 3링 정의, hex, 인터랙션 |
| `systems/RATING_ENGINE.md` | §8 자동 라벨 | aroma_labels 자동 추출 |
| `systems/RATING_ENGINE.md` | §8 aroma_color 계산 | 가중 평균 hex |
| `systems/DATA_MODEL.md` | records 테이블 | aroma_regions (JSONB), aroma_labels (TEXT[]), aroma_color (VARCHAR(7)) |
| `systems/DESIGN_SYSTEM.md` | §2 타이포그래피 | Sub 13px, Caption 11px |
| `prototype/01_home.html` | screen-wine-record | 아로마 팔레트 비주얼 레퍼런스 |

---

## 선행 조건

- S2-T01 (Domain 엔티티) 완료 — `AromaSectorId`, `AromaRing`, `AromaSectorMeta`, `AromaSelection` 타입 사용 가능
- S1-T03 (디자인 토큰) 완료 — `--bg-card`, `--border`, `--text`, `--text-sub`, `--text-hint` CSS 변수 존재

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/shared/constants/aroma-sectors.ts` | shared | 15섹터 정적 메타데이터 (SSOT) |
| `src/shared/utils/aroma-color.ts` | shared | 가중 평균 hex 계산 알고리즘 |
| `src/presentation/components/record/aroma-wheel.tsx` | presentation | 원형 아로마 팔레트 메인 컴포넌트 |
| `src/presentation/components/record/aroma-sector.tsx` | presentation | 개별 섹터 (SVG path + 인터랙션) |

### 스코프 외

- AI pre-select 로직 (품종/라벨 기반 자동 선택) — S3 카메라/OCR 연동
- 셰이크 undo — 네이티브 shake event (PWA 제한, 우선순위 낮음)
- 와인 기록 플로우 전체 통합 — S2-T06

---

## 상세 구현 지침

### 1. `src/shared/constants/aroma-sectors.ts`

15섹터의 정적 메타데이터. RATING_ENGINE.md §8 정의를 1:1 매핑.

```typescript
// src/shared/constants/aroma-sectors.ts

import type { AromaSectorId, AromaRing, AromaSectorMeta } from '@/domain/entities/aroma'

/**
 * 15 아로마 섹터 정적 메타데이터
 * RATING_ENGINE.md §8 아로마 팔레트 상세 스펙
 *
 * 배열 순서 = 시계 방향 12시부터
 * Ring 1 (1차향, 바깥): index 0~7
 * Ring 2 (2차향, 중간): index 8~11
 * Ring 3 (3차향, 안쪽): index 12~14
 */
export const AROMA_SECTORS: readonly AromaSectorMeta[] = [
  // ─── Ring 1: 1차향 (과일/꽃) — 바깥 링, 8섹터 ───
  { id: 'citrus',       ring: 1, position: '12시', nameKo: '시트러스',   nameEn: 'Citrus',       hex: '#fde047' },
  { id: 'apple_pear',   ring: 1, position: '1시',  nameKo: '사과/배',    nameEn: 'Apple/Pear',   hex: '#a3e635' },
  { id: 'tropical',     ring: 1, position: '2시',  nameKo: '열대과일',   nameEn: 'Tropical',     hex: '#fb923c' },
  { id: 'stone_fruit',  ring: 1, position: '3시',  nameKo: '핵과',       nameEn: 'Stone Fruit',  hex: '#fda4af' },
  { id: 'red_berry',    ring: 1, position: '4시',  nameKo: '붉은베리',   nameEn: 'Red Berry',    hex: '#f87171' },
  { id: 'dark_berry',   ring: 1, position: '5시',  nameKo: '검은베리',   nameEn: 'Dark Berry',   hex: '#a855f7' },
  { id: 'floral',       ring: 1, position: '6시',  nameKo: '꽃',         nameEn: 'Floral',       hex: '#f472b6' },
  { id: 'white_floral', ring: 1, position: '7시',  nameKo: '흰꽃',       nameEn: 'White Floral', hex: '#fef3c7' },

  // ─── Ring 2: 2차향 (발효/숙성) — 중간 링, 4섹터 ───
  { id: 'butter',  ring: 2, position: '8시',  nameKo: '버터',     nameEn: 'Butter/Brioche',  hex: '#fde68a' },
  { id: 'vanilla', ring: 2, position: '9시',  nameKo: '바닐라',   nameEn: 'Vanilla/Toast',   hex: '#d97706' },
  { id: 'spice',   ring: 2, position: '10시', nameKo: '향신료',   nameEn: 'Spice',           hex: '#991b1b' },
  { id: 'herb',    ring: 2, position: '11시', nameKo: '허브',     nameEn: 'Herb',            hex: '#4ade80' },

  // ─── Ring 3: 3차향 (숙성) — 안쪽 링, 3섹터 ───
  { id: 'leather', ring: 3, position: '중앙-좌', nameKo: '가죽',   nameEn: 'Leather/Tobacco',   hex: '#78350f' },
  { id: 'earth',   ring: 3, position: '중앙-우', nameKo: '흙',     nameEn: 'Earth/Mineral',     hex: '#78716c' },
  { id: 'nut',     ring: 3, position: '중앙-하', nameKo: '견과',   nameEn: 'Nut/Chocolate',     hex: '#92400e' },
] as const

/**
 * ID로 섹터 메타데이터 조회
 */
export function getAromaSectorById(id: AromaSectorId): AromaSectorMeta {
  const sector = AROMA_SECTORS.find(s => s.id === id)
  if (!sector) throw new Error(`Unknown aroma sector: ${id}`)
  return sector
}

/**
 * 링 번호로 섹터 목록 조회
 */
export function getAromaSectorsByRing(ring: AromaRing): AromaSectorMeta[] {
  return AROMA_SECTORS.filter(s => s.ring === ring)
}

/**
 * 링별 섹터 개수
 */
export const RING_SECTOR_COUNTS: Record<AromaRing, number> = {
  1: 8,
  2: 4,
  3: 3,
} as const

/**
 * 링별 라벨
 */
export const RING_LABELS: Record<AromaRing, string> = {
  1: '1차향 (과일/꽃)',
  2: '2차향 (발효/숙성)',
  3: '3차향 (숙성)',
} as const
```

### 2. `src/shared/utils/aroma-color.ts`

선택된 섹터들의 가중 평균 hex 색상 계산. RATING_ENGINE.md §8 "aroma_color 계산" 정의.

```typescript
// src/shared/utils/aroma-color.ts

import type { AromaSectorId } from '@/domain/entities/aroma'
import { AROMA_SECTORS } from '@/shared/constants/aroma-sectors'

/**
 * hex 색상 → RGB 분해
 * @param hex '#fde047' 형태 (# 포함)
 * @returns [r, g, b] 각 0~255
 */
function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '')
  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)
  return [r, g, b]
}

/**
 * RGB → hex 색상
 * @param r 0~255
 * @param g 0~255
 * @param b 0~255
 * @returns '#fde047' 형태
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n)))
    .toString(16)
    .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * 활성화된 섹터들의 가중 평균 hex 색상 계산
 * RATING_ENGINE.md §8: "선택된 모든 섹터 hex의 가중 평균 (활성화된 섹터 면적 비례)"
 *
 * 가중치 = 1 (모든 섹터 동일 가중치, 면적 비례는 섹터 개수로 반영)
 * 계산: RGB 채널별 산술 평균 → hex 변환
 *
 * @param activeSectors 활성화된 섹터 ID 배열
 * @returns hex 색상 문자열 (예: '#e5b84a') 또는 null (선택 없음)
 */
export function calculateAromaColor(activeSectors: AromaSectorId[]): string | null {
  if (activeSectors.length === 0) return null

  let totalR = 0
  let totalG = 0
  let totalB = 0

  for (const sectorId of activeSectors) {
    const sector = AROMA_SECTORS.find(s => s.id === sectorId)
    if (!sector) continue

    const [r, g, b] = hexToRgb(sector.hex)
    totalR += r
    totalG += g
    totalB += b
  }

  const count = activeSectors.length
  return rgbToHex(totalR / count, totalG / count, totalB / count)
}

/**
 * 활성화된 섹터 ID → 한국어 라벨 배열 추출
 * RATING_ENGINE.md §8 자동 라벨
 *
 * @param activeSectors 활성화된 섹터 ID 배열
 * @returns 한국어 이름 배열 (예: ['시트러스', '열대과일', '바닐라'])
 */
export function extractAromaLabels(activeSectors: AromaSectorId[]): string[] {
  return activeSectors
    .map(id => AROMA_SECTORS.find(s => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined)
    .map(s => s.nameKo)
}

/**
 * 활성화된 섹터에서 사용된 링 번호 추출
 * 복합성 AI 초기값 계산용 (getComplexityInitialValue)
 *
 * @param activeSectors 활성화된 섹터 ID 배열
 * @returns 고유 링 번호 Set
 */
export function getActiveRings(activeSectors: AromaSectorId[]): Set<number> {
  const rings = new Set<number>()
  for (const sectorId of activeSectors) {
    const sector = AROMA_SECTORS.find(s => s.id === sectorId)
    if (sector) rings.add(sector.ring)
  }
  return rings
}
```

### 3. `src/presentation/components/record/aroma-wheel.tsx`

**Props 인터페이스**:

```typescript
interface AromaWheelProps {
  /** 현재 아로마 선택 상태 */
  value: {
    regions: Record<string, unknown>
    labels: string[]
    color: string | null
  }

  /** 값 변경 콜백 */
  onChange: (value: {
    regions: Record<string, unknown>
    labels: string[]
    color: string
  }) => void
}
```

**레이아웃 구조**:

```
┌───────────────────────────────────┐
│  "향을 느껴보세요"  (13px, --text-sub)  │
│                                   │
│         ┌─────────────┐          │
│       /   Ring 1 (8)   \         │
│      |  ┌───────────┐  |        │
│      | |  Ring 2 (4) | |        │
│      | | ┌─────────┐ | |        │
│      | | | Ring 3(3)| | |        │
│      | | └─────────┘ | |        │
│      |  └───────────┘  |        │
│       \               /         │
│         └─────────────┘          │
│                                   │
│  선택된 향: 시트러스, 열대과일, 바닐라  │
│  ● 대표 색상 미리보기                  │
└───────────────────────────────────┘
```

**SVG 원형 레이아웃 스펙**:

| 요소 | 값 |
|------|-----|
| SVG viewBox | `0 0 300 300` |
| 중심 (cx, cy) | `150, 150` |
| Ring 1 (바깥) 외반경 | 140px |
| Ring 1 (바깥) 내반경 | 100px |
| Ring 2 (중간) 외반경 | 100px |
| Ring 2 (중간) 내반경 | 65px |
| Ring 3 (안쪽) 외반경 | 65px |
| Ring 3 (안쪽) 내반경 | 20px |
| 섹터 간 gap | 1px (stroke-width: 1, stroke: `var(--bg-card)`) |

**섹터 각도 계산**:

```
Ring 1: 8섹터, 각 45° (360° / 8)
  - 시작 각도: -90° (12시 방향이 0번 섹터)
  - citrus: -90° ~ -45°
  - apple_pear: -45° ~ 0°
  - tropical: 0° ~ 45°
  - stone_fruit: 45° ~ 90°
  - red_berry: 90° ~ 135°
  - dark_berry: 135° ~ 180°
  - floral: 180° ~ 225°
  - white_floral: 225° ~ 270°

Ring 2: 4섹터, 각 90° (360° / 4)
  - 시작 각도: -90° + 22.5° = -67.5° (Ring 1과 어긋나게 배치)
  - butter: -67.5° ~ 22.5°  (≈8시 방향 중심)
  - vanilla: 22.5° ~ 112.5° (≈9시 방향 중심)
  - spice: 112.5° ~ 202.5° (≈10시 방향 중심)
  - herb: 202.5° ~ 292.5° (≈11시 방향 중심)

Ring 3: 3섹터, 각 120° (360° / 3)
  - 시작 각도: -90°
  - leather: -90° ~ 30°   (중앙-좌)
  - earth: 30° ~ 150°     (중앙-우)
  - nut: 150° ~ 270°      (중앙-하)
```

**SVG arc path 생성 함수**:

```typescript
/**
 * 원호 섹터의 SVG path 데이터 생성
 * @param cx 중심 X
 * @param cy 중심 Y
 * @param outerR 외반경
 * @param innerR 내반경
 * @param startAngle 시작 각도 (도)
 * @param endAngle 종료 각도 (도)
 * @returns SVG path d 속성 문자열
 */
function describeArc(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number,
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const outerStart = {
    x: cx + outerR * Math.cos(toRad(startAngle)),
    y: cy + outerR * Math.sin(toRad(startAngle)),
  }
  const outerEnd = {
    x: cx + outerR * Math.cos(toRad(endAngle)),
    y: cy + outerR * Math.sin(toRad(endAngle)),
  }
  const innerStart = {
    x: cx + innerR * Math.cos(toRad(endAngle)),
    y: cy + innerR * Math.sin(toRad(endAngle)),
  }
  const innerEnd = {
    x: cx + innerR * Math.cos(toRad(startAngle)),
    y: cy + innerR * Math.sin(toRad(startAngle)),
  }

  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ')
}
```

**섹터 라벨 위치 계산**:

```typescript
/**
 * 섹터 중앙 좌표 계산 (라벨 배치용)
 */
function getSectorCenter(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number,
): { x: number; y: number } {
  const midAngle = (startAngle + endAngle) / 2
  const midR = (outerR + innerR) / 2
  const rad = (midAngle * Math.PI) / 180
  return {
    x: cx + midR * Math.cos(rad),
    y: cy + midR * Math.sin(rad),
  }
}
```

**섹터 비주얼 스타일**:

| 상태 | fill | opacity | stroke | 효과 |
|------|------|---------|--------|------|
| 비활성 | 섹터 hex 색상 | 0.25 | `var(--bg-card)` 1px | — |
| 활성 | 섹터 hex 색상 | 1.0 | `var(--bg-card)` 1px | — |
| 호버/터치 | 섹터 hex 색상 | 0.6 | `var(--bg-card)` 1px | transition 0.15s |

**섹터 라벨 스타일**:

| 상태 | font-size | font-weight | color |
|------|-----------|-------------|-------|
| 비활성 | 9px | 400 | `var(--text-hint)` (#B5AFA8) |
| 활성 | 10px | 600 | `var(--text)` (#3D3833) |

**인터랙션**:

| 행동 | 결과 |
|------|------|
| 섹터 탭 | 해당 섹터 active 토글 |
| 섹터 위에서 드래그 시작 | 시작 섹터 활성화 |
| 인접 섹터로 드래그 진입 | 진입한 섹터도 활성화 (연속 칠하기) |
| 멀티터치 | 비연속 영역도 동시 선택 가능 |

**드래그 연속 칠하기 구현**:

```typescript
// 포인터 이벤트로 구현 (SVG 위에서)
const [isDragging, setIsDragging] = useState(false)

function handleSectorPointerDown(sectorId: AromaSectorId) {
  setIsDragging(true)
  toggleSector(sectorId)
}

function handleSectorPointerEnter(sectorId: AromaSectorId) {
  if (isDragging) {
    // 드래그 중 진입 시 활성화만 (비활성화하지 않음)
    activateSector(sectorId)
  }
}

function handlePointerUp() {
  setIsDragging(false)
}

function toggleSector(sectorId: AromaSectorId) {
  const currentRegions = value.regions as Record<string, boolean>
  const isActive = currentRegions[sectorId] ?? false
  const newRegions = { ...currentRegions, [sectorId]: !isActive }

  // 비활성화된 키 제거 (깔끔한 JSONB)
  if (isActive) {
    delete newRegions[sectorId]
  }

  updateValue(newRegions)
}

function activateSector(sectorId: AromaSectorId) {
  const currentRegions = value.regions as Record<string, boolean>
  if (currentRegions[sectorId]) return // 이미 활성화

  const newRegions = { ...currentRegions, [sectorId]: true }
  updateValue(newRegions)
}

function updateValue(newRegions: Record<string, boolean>) {
  const activeSectorIds = Object.keys(newRegions).filter(
    k => newRegions[k]
  ) as AromaSectorId[]

  const labels = extractAromaLabels(activeSectorIds)
  const color = calculateAromaColor(activeSectorIds) ?? ''

  onChange({
    regions: newRegions,
    labels,
    color,
  })
}
```

**선택 요약 표시 (아로마 휠 하단)**:

```
선택된 향: 시트러스, 열대과일, 바닐라    (13px, --text-sub)
● #e5b84a                               (대표 색상 원 12px + hex)
```

| 요소 | 스타일 |
|------|--------|
| "선택된 향:" 라벨 | 11px, font-weight 500, color `var(--text-hint)` |
| 향 이름 나열 | 13px, font-weight 400, color `var(--text-sub)`, 쉼표 구분 |
| 대표 색상 원 | width 12px, height 12px, border-radius 50%, background = aroma_color |
| 아무것도 미선택 시 | "탭하여 향을 선택하세요" 11px, `var(--text-hint)` |

---

### 4. `src/presentation/components/record/aroma-sector.tsx`

**Props 인터페이스**:

```typescript
interface AromaSectorProps {
  /** 섹터 메타데이터 */
  sector: AromaSectorMeta

  /** SVG path d 속성 */
  pathData: string

  /** 라벨 좌표 { x, y } */
  labelPosition: { x: number; y: number }

  /** 활성화 여부 */
  isActive: boolean

  /** 포인터 다운 */
  onPointerDown: () => void

  /** 포인터 진입 (드래그 칠하기) */
  onPointerEnter: () => void
}
```

**렌더링**:

```tsx
export function AromaSector({
  sector,
  pathData,
  labelPosition,
  isActive,
  onPointerDown,
  onPointerEnter,
}: AromaSectorProps) {
  return (
    <g
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      style={{ cursor: 'pointer', touchAction: 'none' }}
    >
      {/* 섹터 영역 */}
      <path
        d={pathData}
        fill={sector.hex}
        fillOpacity={isActive ? 1.0 : 0.25}
        stroke="var(--bg-card)"
        strokeWidth={1}
        style={{
          transition: 'fill-opacity 0.15s ease-out',
        }}
      />

      {/* 라벨 */}
      <text
        x={labelPosition.x}
        y={labelPosition.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={isActive ? 'var(--text)' : 'var(--text-hint)'}
        fontSize={isActive ? 10 : 9}
        fontWeight={isActive ? 600 : 400}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          transition: 'fill 0.15s ease-out, font-size 0.15s ease-out',
        }}
      >
        {sector.nameKo}
      </text>
    </g>
  )
}
```

---

## 목업 매핑

| 목업 화면 | 구현 컴포넌트 | 대응 요소 |
|-----------|-------------|----------|
| `prototype/01_home.html` screen-wine-record | `AromaWheel` | 아로마 팔레트 원형 UI |
| `prototype/00_design_system.html` | 없음 (디자인 시스템에 별도 정의 없음) | — |

---

## 데이터 흐름

```
AromaWheel (state 관리는 부모 컴포넌트에서)
  │
  ├─ value.regions → 각 AromaSector의 isActive 결정
  │
  ├─ 사용자 탭/드래그
  │   ├─ toggleSector(sectorId) 또는 activateSector(sectorId)
  │   ├─ activeSectorIds 추출
  │   ├─ extractAromaLabels(activeSectorIds) → labels[]
  │   ├─ calculateAromaColor(activeSectorIds) → color (hex)
  │   └─ onChange({ regions, labels, color })
  │
  └─ 부모 컴포넌트에서
      ├─ regions → records.aroma_regions (JSONB)
      ├─ labels → records.aroma_labels (TEXT[])
      └─ color → records.aroma_color (VARCHAR(7))
          └─ 사분면 와인 점 색상으로 사용

가중 평균 hex 계산:
  activeSectors[].hex → hexToRgb → RGB 채널별 합산 → / count → rgbToHex
  예: [citrus(#fde047), tropical(#fb923c)] → R:(253+251)/2=252, G:(224+146)/2=185, B:(71+60)/2=66 → #fcb942

복합성 AI 초기값 연동:
  getActiveRings(activeSectorIds) → ring 개수
    → getComplexityInitialValue(ringCount) → complexity 슬라이더 초기값
    (이 연동은 S2-T06 기록 플로우에서 구현)
```

---

## 검증 체크리스트

```
□ R4 검증: Supabase/infrastructure import 없음
□ AROMA_SECTORS 15개 정확 (Ring1: 8 + Ring2: 4 + Ring3: 3)
□ 각 섹터 hex 값 RATING_ENGINE.md §8과 1:1 일치:
  □ citrus: #fde047
  □ apple_pear: #a3e635
  □ tropical: #fb923c
  □ stone_fruit: #fda4af
  □ red_berry: #f87171
  □ dark_berry: #a855f7
  □ floral: #f472b6
  □ white_floral: #fef3c7
  □ butter: #fde68a
  □ vanilla: #d97706
  □ spice: #991b1b
  □ herb: #4ade80
  □ leather: #78350f
  □ earth: #78716c
  □ nut: #92400e
□ Ring 1 시작: 12시 방향 (-90°), 각 45°
□ Ring 2: 각 90°
□ Ring 3: 각 120°
□ SVG viewBox: 0 0 300 300
□ Ring 반경: 바깥(140/100), 중간(100/65), 안쪽(65/20)
□ 비활성 opacity: 0.25
□ 활성 opacity: 1.0
□ 섹터 간 gap: stroke var(--bg-card) 1px
□ 탭 → 토글 동작 정확
□ 드래그 → 연속 칠하기 동작 정확 (비활성화하지 않음, 활성화만)
□ calculateAromaColor: RGB 채널별 산술 평균 → hex
□ extractAromaLabels: 선택 섹터 → 한국어 이름 배열
□ 선택 요약: 향 이름 쉼표 구분 + 대표 색상 원 12px
□ 미선택 시: "탭하여 향을 선택하세요"
□ touch-action: none (스크롤 방지)
□ 360px 뷰포트에서 레이아웃 깨짐 없음 (SVG 300px → 320px 컨테이너 내 중앙)
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ any, as any, @ts-ignore, ! 단언 0개
```
