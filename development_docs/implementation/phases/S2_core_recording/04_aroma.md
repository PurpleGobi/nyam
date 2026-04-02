# S2-T04: 아로마 휠 — AromaWheel, AromaSector

> WSET Level 3 기반 16섹터 3링 원형 아로마 휠. 탭/드래그로 향 영역을 선택하면 링별(primary/secondary/tertiary) 배열로 저장된다.

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `systems/RATING_ENGINE.md` | §8 아로마 팔레트 상세 스펙 | 16섹터 3링 정의, hex, 인터랙션 |
| `systems/DATA_MODEL.md` | records 테이블 | aroma_primary (TEXT[]), aroma_secondary (TEXT[]), aroma_tertiary (TEXT[]) |
| `prototype/01_home.html` | screen-wine-record | 아로마 휠 비주얼 레퍼런스 |

---

## 선행 조건

- S2-T01 (Domain 엔티티) 완료 — `AromaSectorId`, `AromaRing`, `AromaSectorMeta`, `AromaSelection` 타입 사용 가능

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/shared/constants/aroma-sectors.ts` | shared | 16섹터 정적 메타데이터 |
| `src/shared/utils/aroma-color.ts` | shared | 라벨 추출 + 활성 링 조회 |
| `src/presentation/components/record/aroma-wheel.tsx` | presentation | 원형 아로마 휠 메인 컴포넌트 |
| `src/presentation/components/record/aroma-sector.tsx` | presentation | 개별 섹터 (SVG path + 인터랙션) |
| `src/presentation/components/record/aroma-display.tsx` | presentation | 아로마 선택 결과 표시 컴포넌트 |

---

## 상세 구현 지침

### 1. `src/shared/constants/aroma-sectors.ts`

16섹터의 정적 메타데이터. WSET Level 3 기준.

```typescript
export const AROMA_SECTORS: readonly AromaSectorMeta[] = [
  // Ring 1 — 1차향 (포도 유래), 9 sectors
  { id: 'citrus',       ring: 1, nameKo: '시트러스',  nameEn: 'Citrus',               hex: '#fde047' },
  { id: 'apple_pear',   ring: 1, nameKo: '사과/배',   nameEn: 'Apple/Pear',            hex: '#a3e635' },
  { id: 'tropical',     ring: 1, nameKo: '열대과일',  nameEn: 'Tropical',              hex: '#fb923c' },
  { id: 'stone_fruit',  ring: 1, nameKo: '핵과',      nameEn: 'Stone Fruit',           hex: '#fda4af' },
  { id: 'red_berry',    ring: 1, nameKo: '붉은베리',  nameEn: 'Red Berry',             hex: '#f87171' },
  { id: 'dark_berry',   ring: 1, nameKo: '검은베리',  nameEn: 'Dark Berry',            hex: '#a855f7' },
  { id: 'floral',       ring: 1, nameKo: '꽃',        nameEn: 'Floral',                hex: '#f472b6' },
  { id: 'white_floral', ring: 1, nameKo: '흰꽃',      nameEn: 'White Floral',          hex: '#fef3c7' },
  { id: 'herb',         ring: 1, nameKo: '허브',      nameEn: 'Herb/Vegetal',          hex: '#4ade80' },
  // Ring 2 — 2차향 (양조 유래), 4 sectors
  { id: 'butter',  ring: 2, nameKo: '버터/크림',  nameEn: 'Butter/Cream (MLF)',     hex: '#fde68a' },
  { id: 'vanilla', ring: 2, nameKo: '바닐라',    nameEn: 'Vanilla/Cedar (Oak)',    hex: '#d97706' },
  { id: 'spice',   ring: 2, nameKo: '오크/향신료', nameEn: 'Clove/Cinnamon (Oak)',  hex: '#991b1b' },
  { id: 'toast',   ring: 2, nameKo: '토스트',    nameEn: 'Toast/Smoke (Lees/Oak)', hex: '#b45309' },
  // Ring 3 — 3차향 (숙성 유래), 3 sectors
  { id: 'leather', ring: 3, nameKo: '가죽/담배',  nameEn: 'Leather/Tobacco',   hex: '#78350f' },
  { id: 'earth',   ring: 3, nameKo: '흙/버섯',    nameEn: 'Earth/Mushroom',    hex: '#78716c' },
  { id: 'nut',     ring: 3, nameKo: '견과/건과일', nameEn: 'Nut/Dried Fruit',   hex: '#92400e' },
]

export const RING_SECTOR_COUNTS: Record<AromaRing, number> = { 1: 9, 2: 4, 3: 3 }

export const RING_LABELS: Record<AromaRing, string> = {
  1: '1차향 (포도 유래)',
  2: '2차향 (양조 유래)',
  3: '3차향 (숙성 유래)',
}
```

**기존 설계 대비 변경사항**:
- 15섹터 → 16섹터: `herb`가 Ring 2에서 Ring 1로 이동, `toast` 추가 (Ring 2)
- Ring 1: 8섹터 → 9섹터 (herb 추가)
- Ring 2: 4섹터 유지 (butter, vanilla, spice + 신규 toast)
- `AromaSectorMeta`에서 `position` 필드 제거
- Ring 라벨: "과일/꽃" → "포도 유래", "발효/숙성" → "양조 유래"
- 일부 nameKo 변경: "버터" → "버터/크림", "바닐라" → "바닐라", "향신료" → "오크/향신료", "흙" → "흙/버섯", "견과" → "견과/건과일"

### 2. `src/shared/utils/aroma-color.ts`

**기존 설계 대비 변경**: `calculateAromaColor` (가중 평균 hex) 함수가 제거됨.
현재 코드는 다음 2개 함수만 제공:

```typescript
/** 활성 섹터 ID → 한국어 라벨 배열 추출 */
export function extractAromaLabels(activeIds: AromaSectorId[]): string[]

/** 활성 섹터가 걸쳐 있는 링(1/2/3) 집합 반환 */
export function getActiveRings(activeIds: AromaSectorId[]): Set<AromaRing>
```

### 3. 아로마 저장 구조

기존 설계의 `aromaRegions(JSONB) + aromaLabels(TEXT[]) + aromaColor(VARCHAR)` 3필드 구조에서
현재는 `aromaPrimary(TEXT[]) + aromaSecondary(TEXT[]) + aromaTertiary(TEXT[])` 3배열 구조로 변경됨.

각 배열에는 해당 링의 선택된 섹터 ID가 저장된다.

---

## 검증 체크리스트

```
□ R4 검증: Supabase/infrastructure import 없음
□ AROMA_SECTORS 16개 정확 (Ring1: 9 + Ring2: 4 + Ring3: 3)
□ 각 섹터 hex 값 정확
□ Ring 1: 9섹터 (citrus ~ herb), 각 40°
□ Ring 2: 4섹터 (butter, vanilla, spice, toast), 각 90°
□ Ring 3: 3섹터 (leather, earth, nut), 각 120°
□ 탭 → 토글 동작 정확
□ 드래그 → 연속 칠하기 동작 정확
□ 선택 결과가 primary/secondary/tertiary 배열로 올바르게 분류
□ extractAromaLabels: 선택 섹터 → 한국어 이름 배열
□ touch-action: none (스크롤 방지)
□ 360px 뷰포트에서 레이아웃 깨짐 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
