# 06: 페어링 카테고리 (Pairing Grid)

> WSET 8카테고리 그리드에서 복수 선택 + 직접 입력으로 와인과 함께한 음식 페어링을 기록하는 필수 단계.

---

## SSOT 출처

| 문서 | 섹션 | 내용 |
|------|------|------|
| `systems/RATING_ENGINE.md` | §8 페어링 (WSET 8카테고리 그리드) | 8개 카테고리 목록, 아이콘, 예시, AI 추천, 직접 입력 |
| `systems/DATA_MODEL.md` | records 테이블 | `pairing_categories TEXT[]` — 와인 기록 전용 |
| `systems/DATA_MODEL.md` | 페어링 카테고리 ENUM | 8개 값: `red_meat`, `white_meat`, `seafood`, `cheese`, `vegetable`, `spicy`, `dessert`, `charcuterie` |
| `pages/05_RECORD_FLOW.md` | §4 와인 통합 기록 화면 | screen-wine-record 내 페어링 그리드 섹션 |
| `prototype/01_home.html` | screen-wine-record | `.pairing-grid`, `.pairing-cell`, `.pairing-cell-icon`, `.pairing-cell-name`, `.pairing-cell-examples` |

---

## 선행 조건

- S1: DB 스키마 완료 (`records.pairing_categories TEXT[]` 컬럼 존재)
- `domain/entities/record.ts`에 `PairingCategory` 타입 정의 완료

---

## 구현 범위

### 생성할 파일

| 파일 | 레이어 | 역할 |
|------|--------|------|
| `src/domain/entities/pairing.ts` | domain | 카테고리 메타데이터 상수 정의 (PairingCategory 타입은 record.ts에서 import) |
| `src/presentation/components/record/pairing-grid.tsx` | presentation | 2x4 그리드 UI + 직접 입력 |

### 스코프 외

- AI 페어링 추천 로직 (Gemini 연동 — S3에서 구현, 여기서는 `aiSuggestions` props로 주입)
- 와인 상세 페이지 페어링 표시 (S4)
- wines 테이블의 `food_pairings` (외부 데이터 — records의 사용자 경험과 독립)

---

## 상세 구현 지침

### 1. Domain 타입

**파일**: `src/domain/entities/pairing.ts`

```typescript
// PairingCategory 타입은 record.ts에서 정의 — 중복 정의 금지
import type { PairingCategory } from '@/domain/entities/record'

/** 카테고리별 메타데이터. UI 렌더링에 사용. */
export interface PairingCategoryMeta {
  value: PairingCategory
  label: string
  icon: string
  examples: string
}

/**
 * 8카테고리 정의. 순서 = 그리드 배치 순서.
 * RATING_ENGINE.md §8 + RECORD_FLOW.md §4 기준.
 *
 * 그리드 배치:
 * Row 1: red_meat(적색육)  | white_meat(백색육)
 * Row 2: seafood(어패류)   | cheese(치즈·유제품)
 * Row 3: vegetable(채소·곡물) | spicy(매운·발효)
 * Row 4: dessert(디저트·과일) | charcuterie(샤퀴트리·견과)
 */
export const PAIRING_CATEGORIES: readonly PairingCategoryMeta[] = [
  { value: 'red_meat', label: '적색육', icon: '🥩', examples: '스테이크 · 양갈비 · 오리 · 사슴' },
  { value: 'white_meat', label: '백색육', icon: '🍗', examples: '닭 · 돼지 · 송아지 · 토끼' },
  { value: 'seafood', label: '어패류', icon: '🦐', examples: '생선 · 갑각류 · 조개 · 굴 · 초밥' },
  { value: 'cheese', label: '치즈·유제품', icon: '🧀', examples: '숙성치즈 · 블루 · 브리 · 크림소스' },
  { value: 'vegetable', label: '채소·곡물', icon: '🌿', examples: '버섯 · 트러플 · 리조또 · 파스타' },
  { value: 'spicy', label: '매운·발효', icon: '🌶️', examples: '커리 · 마라 · 김치 · 된장' },
  { value: 'dessert', label: '디저트·과일', icon: '🍫', examples: '다크초콜릿 · 타르트 · 건과일' },
  { value: 'charcuterie', label: '샤퀴트리·견과', icon: '🥜', examples: '하몽 · 살라미 · 아몬드 · 올리브' },
] as const
```

### 2. Presentation 컴포넌트

**파일**: `src/presentation/components/record/pairing-grid.tsx`

```typescript
interface PairingGridProps {
  /** 현재 선택된 페어링 카테고리 배열 */
  value: PairingCategory[]
  /** 선택 변경 콜백 (복수 선택 — 토글 방식) */
  onChange: (value: PairingCategory[]) => void
  /** AI가 추천한 카테고리 (pre-select 표시용). 없으면 빈 배열. */
  aiSuggestions?: PairingCategory[]
  /** 직접 입력 텍스트 */
  customInput?: string
  /** 직접 입력 변경 콜백 */
  onCustomInputChange?: (value: string) => void
}
```

#### 렌더링 구조

```
<div className="pairing-section">
  <div className="rest-record-section-title">
    페어링
    {aiSuggestions.length > 0 && <span className="ai-tag wine">AI 추천</span>}
  </div>

  <div className="pairing-grid">
    {/* 8개 셀 — PAIRING_CATEGORIES 순서대로 */}
    {PAIRING_CATEGORIES.map((cat) => (
      <button
        key={cat.value}
        className={cn('pairing-cell', isSelected(cat.value) && 'selected')}
        onClick={() => toggleCategory(cat.value)}
      >
        <div className="pairing-cell-icon">{cat.icon}</div>
        <div className="pairing-cell-name">{cat.label}</div>
        <div className="pairing-cell-examples">{cat.examples}</div>
        {isAiSuggested(cat.value) && (
          <span className="pairing-ai-badge">AI</span>
        )}
      </button>
    ))}
  </div>

  {/* 직접 입력 */}
  <input
    type="text"
    placeholder="직접 입력 (예: 트러플 리조또)"
    value={customInput}
    onChange={(e) => onCustomInputChange?.(e.target.value)}
    className="pairing-custom-input"
  />
</div>
```

#### 내부 로직

```typescript
// 토글 선택 (복수 허용)
function toggleCategory(category: PairingCategory) {
  if (value.includes(category)) {
    onChange(value.filter((v) => v !== category))
  } else {
    onChange([...value, category])
  }
}

// AI 추천 확인
function isAiSuggested(category: PairingCategory): boolean {
  return aiSuggestions?.includes(category) ?? false
}

// 선택 상태 확인
function isSelected(category: PairingCategory): boolean {
  return value.includes(category)
}
```

#### AI 추천 초기화

- 컴포넌트 마운트 시 `aiSuggestions`가 비어있지 않고 `value`가 빈 배열이면 → `aiSuggestions`를 `value`로 자동 설정
- 이미 사용자가 선택한 상태(`value.length > 0`)면 AI 추천으로 덮어쓰기 금지
- `useEffect`로 1회 실행, deps: `[aiSuggestions]`

---

## 목업 매핑

### 프로토타입 CSS 클래스 → Tailwind 매핑

| 프로토타입 클래스 | CSS 정의 | Tailwind 구현 |
|-----------------|---------|--------------|
| `.pairing-grid` | `display:grid; grid-template-columns:1fr 1fr; gap:8px` | `grid grid-cols-2 gap-2` |
| `.pairing-cell` | `padding:10px; border-radius:10px; border:1.5px solid var(--border); background:var(--bg-card); cursor:pointer; transition:all 0.15s; text-align:center` | `p-2.5 rounded-[10px] border-[1.5px] border-border bg-card cursor-pointer transition-all duration-150 text-center` |
| `.pairing-cell:active` | `transform:scale(0.97)` | `active:scale-[0.97]` |
| `.pairing-cell.selected` | `border-color:var(--accent-wine); background:var(--accent-wine-light)` | `border-[var(--accent-wine)] bg-[var(--accent-wine-light)]` |
| `.pairing-cell-icon` | `font-size:22px; margin-bottom:2px` | `text-[22px] mb-0.5` |
| `.pairing-cell-name` | `font-size:12px; font-weight:700; color:var(--text)` | `text-xs font-bold text-foreground` |
| `.pairing-cell.selected .pairing-cell-name` | `color:var(--accent-wine)` | `text-[var(--accent-wine)]` |
| `.pairing-cell-examples` | `font-size:9px; color:var(--text-hint); margin-top:3px; line-height:1.3` | `text-[9px] text-muted-foreground/60 mt-0.5 leading-tight` |
| `.pairing-cell.selected .pairing-cell-examples` | `color:var(--accent-wine); opacity:0.7` | `text-[var(--accent-wine)] opacity-70` |

### 직접 입력 필드 스타일

```css
/* 프로토타입에 명시적 클래스 없음. rest-rec-textarea 패턴 차용. */
.pairing-custom-input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: 13px;
  color: var(--text);
  background: var(--bg-card);
  margin-top: 8px;
}
.pairing-custom-input::placeholder {
  color: var(--text-hint);
}
.pairing-custom-input:focus {
  border-color: var(--accent-wine);
  outline: none;
}
```

### AI 뱃지 스타일

```css
/* RECORD_FLOW.md §10 ai-tag 참조 */
.pairing-ai-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 8px;
  font-weight: 700;
  color: white;
  background: var(--accent-wine);
  padding: 1px 4px;
  border-radius: 4px;
}
```

### 프로토타입 HTML 참조 (screen-wine-record 페어링 섹션)

```html
<div class="rest-record-section">
  <div class="rest-record-section-title">페어링 <span class="ai-tag wine">AI 추천</span></div>
  <div class="pairing-grid">
    <div class="pairing-cell selected" onclick="togglePairingCell(this)">
      <div class="pairing-cell-icon">🥩</div>
      <div class="pairing-cell-name">적색육</div>
      <div class="pairing-cell-examples">스테이크 · 양갈비 · 오리 · 사슴</div>
    </div>
    <!-- ... 7개 더 ... -->
  </div>
  <input placeholder="직접 입력 (예: 트러플 리조또)" />
</div>
```

---

## 데이터 흐름

```
[AI 와인 분석 결과] ─── aiSuggestions: PairingCategory[]
    │                    (예: ['red_meat', 'cheese'])
    ▼
[PairingGrid 마운트]
    │
    ├─ aiSuggestions → value 자동 설정 (최초 1회, value 비어있을 때만)
    │
    ▼ 사용자 그리드 셀 탭
    │
    ├─ toggleCategory() → onChange(updatedCategories)
    │   복수 선택: 이미 선택된 항목 탭 → 해제
    │   미선택 항목 탭 → 추가
    │
    ├─ 직접 입력 변경 → onCustomInputChange(text)
    │
    ▼ 저장 시
    │
    ├─ records.pairing_categories = value   (TEXT[], 예: ['red_meat','cheese'])
    │   직접 입력은 pairing_categories에 포함하지 않음 (별도 저장 방식은 통합 기록 화면에서 결정)
    │
    └─ 빈 배열 허용: 아무것도 선택하지 않아도 저장 가능
       (RATING_ENGINE.md §8 Step 4는 필수이나, 빈 선택도 유효 — "안 먹음/기억 안남" 시나리오)
```

### DB 저장 형식

```sql
-- records.pairing_categories TEXT[]
-- 예시:
UPDATE records
SET pairing_categories = ARRAY['red_meat', 'cheese']::TEXT[]
WHERE id = '{record_id}';

-- 조회 시 (와인 상세 페이지):
SELECT pairing_categories FROM records WHERE id = '{record_id}';
-- 결과: {red_meat,cheese}
```

### wines.food_pairings와의 관계

- `wines.food_pairings`: 와인 DB에 사전 등록된 추천 페어링 (외부 데이터)
- `records.pairing_categories`: 사용자가 실제 경험한 페어링 (기록별)
- 두 필드는 **완전히 독립적**. DB 추천 ≠ 사용자 경험.
- AI 추천(`aiSuggestions`)은 `wines.food_pairings` + 와인 특성에서 도출하되, 최종 저장은 `records.pairing_categories`에만.

---

## 검증 체크리스트

```
□ pnpm build — 에러 없음
□ pnpm lint — 경고 0개
□ TypeScript strict — any/as any/@ts-ignore/! 0개
□ R1 준수 — pairing.ts에 React/Supabase/Next import 없음
□ R4 준수 — pairing-grid.tsx에 infrastructure/Supabase import 없음
□ 그리드 배치 — 2열 4행, 8개 셀 전부 표시
□ 카테고리 값 — DB ENUM과 정확히 일치 (red_meat, white_meat, seafood, cheese, vegetable, spicy, dessert, charcuterie)
□ 복수 선택 — 여러 셀 동시 선택/해제 동작
□ AI 추천 — aiSuggestions로 전달된 카테고리 pre-select + AI 뱃지 표시
□ 직접 입력 — placeholder "직접 입력 (예: 트러플 리조또)" 표시
□ 색상 — selected 상태에서 var(--accent-wine) 사용, 하드코딩 금지
□ CSS 클래스명 — 프로토타입과 일치 (pairing-grid, pairing-cell, pairing-cell-icon, pairing-cell-name, pairing-cell-examples)
□ 모바일 360px — 2열 그리드 깨짐 없음, 터치 타겟 충분
□ 빈 상태 — 아무것도 선택 안 해도 에러 없음
□ 디자인 토큰 — bg-white/text-black 하드코딩 없음
```
