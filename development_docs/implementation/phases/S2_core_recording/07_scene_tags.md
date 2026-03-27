# 07: 씬태그 + 동행자 (Scene Tags & Companions)

> 식당 기록 시 상황(혼밥/데이트/친구 등) 단일 선택 칩 + 동행자 이름 입력 컴포넌트. AI가 사진/시간/위치 기반으로 pre-select.

---

## SSOT 출처

| 문서 | 섹션 | 내용 |
|------|------|------|
| `systems/RATING_ENGINE.md` | §7 상황 태그 (식당 전용) | 6개 태그 목록, 단일 선택, AI 추천, DB 값 |
| `systems/DATA_MODEL.md` | records 테이블 | `scene VARCHAR(20)`, `companions TEXT[]`, `companion_count INT` |
| `pages/04_RECORD_DETAIL.md` | 씬태그 색상 | `--scene-solo` ~ `--scene-drinks` 6개 CSS 변수 |
| `pages/05_RECORD_FLOW.md` | §3 식당 통합 기록 화면 | screen-rest-record 상황/동반자 섹션 |
| `systems/AUTH.md` | 프라이버시 | companions 무조건 비공개 |
| `prototype/01_home.html` | screen-rest-record | `.rest-rec-scene-chips`, `.rest-rec-scene-chip`, `.rest-rec-companion` |

---

## 선행 조건

- S1: DB 스키마 완료 (`records.scene`, `records.companions`, `records.companion_count` 컬럼 존재)
- S1: 디자인 토큰 완료 (`--scene-*` CSS 변수 6개 정의)

---

## 구현 범위

### 생성할 파일

| 파일 | 레이어 | 역할 |
|------|--------|------|
| `src/domain/entities/scene.ts` | domain | SceneTag 타입 + 6개 상수 정의 |
| `src/presentation/components/record/scene-tag-selector.tsx` | presentation | 씬태그 6개 칩 UI (단일 선택) |
| `src/presentation/components/record/companion-input.tsx` | presentation | 동행자 입력/표시 UI |

### 스코프 외

- 와인 씬태그 (와인 기록 플로우에서는 씬태그 입력 UI 없음 — RATING_ENGINE.md §7 명시)
- AI 사진/시간/위치 분석 로직 (S3에서 구현, 여기서는 `aiSuggestion` props로 주입)
- AI 얼굴 인식 로직 (S3에서 구현, 여기서는 `aiCompanions` props로 주입)

---

## 상세 구현 지침

### 1. Domain 타입

**파일**: `src/domain/entities/scene.ts`

```typescript
/**
 * 식당 기록 상황 태그. DB VARCHAR(20).
 * RATING_ENGINE.md §7 참조.
 */
export type SceneTag = 'solo' | 'romantic' | 'friends' | 'family' | 'business' | 'drinks'

/** 씬태그 메타데이터. UI 렌더링에 사용. */
export interface SceneTagMeta {
  value: SceneTag
  label: string
  /** CSS 변수명 (예: '--scene-solo') */
  colorVar: string
  /** hex 색상 (CSS 변수 폴백용) */
  hex: string
}

/**
 * 6개 씬태그 정의.
 * RATING_ENGINE.md §7 + RECORD_DETAIL.md 색상 참조.
 */
export const SCENE_TAGS: readonly SceneTagMeta[] = [
  { value: 'solo', label: '혼밥', colorVar: '--scene-solo', hex: '#7A9BAE' },
  { value: 'romantic', label: '데이트', colorVar: '--scene-romantic', hex: '#B8879B' },
  { value: 'friends', label: '친구', colorVar: '--scene-friends', hex: '#7EAE8B' },
  { value: 'family', label: '가족', colorVar: '--scene-family', hex: '#C9A96E' },
  { value: 'business', label: '회식', colorVar: '--scene-business', hex: '#8B7396' },
  { value: 'drinks', label: '술자리', colorVar: '--scene-drinks', hex: '#B87272' },
] as const
```

### 2. SceneTagSelector 컴포넌트

**파일**: `src/presentation/components/record/scene-tag-selector.tsx`

```typescript
interface SceneTagSelectorProps {
  /** 현재 선택된 씬태그. null이면 미선택. */
  value: SceneTag | null
  /** 선택 변경 콜백 */
  onChange: (value: SceneTag | null) => void
  /** AI 추천 씬태그. pre-select + ai-tag 뱃지 표시. */
  aiSuggestion?: SceneTag
}
```

#### 렌더링 구조

```
<div className="scene-tag-section">
  <div className="rest-record-section-title">
    상황
    {aiSuggestion && <span className="ai-tag">AI 추천</span>}
  </div>

  <div className="rest-rec-scene-chips">
    {SCENE_TAGS.map((tag) => (
      <button
        key={tag.value}
        className={cn('rest-rec-scene-chip', value === tag.value && 'selected')}
        onClick={() => handleSelect(tag.value)}
        style={{
          // selected 상태: 해당 씬태그 색상 적용
          ...(value === tag.value && {
            borderColor: `var(${tag.colorVar})`,
            backgroundColor: `var(${tag.colorVar})20`,  // 20 = 12% opacity
            color: `var(${tag.colorVar})`,
          }),
        }}
      >
        {tag.label}
      </button>
    ))}
  </div>
</div>
```

#### 내부 로직

```typescript
// 단일 선택: 이미 선택된 항목 탭 → 해제 (null), 다른 항목 탭 → 교체
function handleSelect(tag: SceneTag) {
  if (value === tag) {
    onChange(null)  // 같은 태그 재탭 → 해제
  } else {
    onChange(tag)
  }
}
```

#### AI 추천 초기화

- 마운트 시 `aiSuggestion`이 있고 `value`가 null이면 → `aiSuggestion`을 `value`로 자동 설정
- 이미 사용자가 선택한 상태면 AI 추천 무시
- `useEffect`로 1회 실행

#### 칩 애니메이션

- RATING_ENGINE.md §5: "태그 선택 → 커지며 강조색 전환 (0.2s)"
- `transition: all 0.2s ease` + selected 상태에서 `transform: scale(1.05)`

### 3. CompanionInput 컴포넌트

**파일**: `src/presentation/components/record/companion-input.tsx`

```typescript
interface CompanionInputProps {
  /** 현재 동행자 이름 배열 */
  value: string[]
  /** 변경 콜백 */
  onChange: (value: string[]) => void
  /** AI 얼굴 인식으로 감지된 동행자 이름 */
  aiCompanions?: string[]
}
```

#### 렌더링 구조

```
<div className="companion-section">
  <div className="rest-record-section-title">
    동반자
    {aiCompanions?.length > 0 && <span className="ai-tag">사진 인식</span>}
  </div>

  {/* 등록된 동행자 목록 */}
  {value.map((name, index) => (
    <div key={index} className="rest-rec-companion">
      <div
        className="rest-rec-comp-avatar"
        style={{ background: getAvatarGradient(name) }}
      >
        {name.charAt(0)}
      </div>
      <div className="rest-rec-comp-name">{name}</div>
      <button
        className="rest-rec-comp-remove"
        onClick={() => removeCompanion(index)}
      >
        <X size={14} />  {/* lucide-react */}
      </button>
    </div>
  ))}

  {/* 동행자 추가 입력 */}
  <div className="rest-rec-comp-add" onClick={showAddInput}>
    <Plus size={14} />
    동반자 추가
  </div>

  {/* 추가 모드: 인라인 입력 필드 */}
  {isAdding && (
    <div className="companion-add-input-wrap">
      <input
        ref={inputRef}
        type="text"
        placeholder="이름 입력"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && addCompanion()}
        className="companion-add-input"
        maxLength={20}
      />
      <button onClick={addCompanion} className="companion-add-btn">
        추가
      </button>
    </div>
  )}
</div>
```

#### 내부 로직

```typescript
const [isAdding, setIsAdding] = useState(false)
const [inputValue, setInputValue] = useState('')
const inputRef = useRef<HTMLInputElement>(null)

function addCompanion() {
  const trimmed = inputValue.trim()
  if (trimmed.length === 0) return
  if (value.includes(trimmed)) return  // 중복 방지
  onChange([...value, trimmed])
  setInputValue('')
  // 입력 필드 유지 (연속 추가 가능)
}

function removeCompanion(index: number) {
  onChange(value.filter((_, i) => i !== index))
}

function showAddInput() {
  setIsAdding(true)
  // 다음 렌더 후 포커스
  requestAnimationFrame(() => inputRef.current?.focus())
}

/**
 * 아바타 그라디언트 생성.
 * 이름의 첫 글자 charCode 기반으로 일관된 색상 생성.
 */
function getAvatarGradient(name: string): string {
  const code = name.charCodeAt(0)
  const hue = (code * 37) % 360
  return `linear-gradient(135deg, hsl(${hue}, 40%, 55%), hsl(${hue}, 40%, 40%))`
}
```

#### AI 동행자 초기화

- 마운트 시 `aiCompanions`가 비어있지 않고 `value`가 빈 배열이면 → `aiCompanions`를 `value`로 자동 설정
- 이미 사용자가 수동 입력한 상태면 AI 결과 무시
- AI 감지된 항목에는 별도 시각적 표시 없음 (뱃지는 섹션 타이틀에만)

#### companion_count 계산

- 부모 컴포넌트(통합 기록 화면)에서 `value.length`를 기반으로 `companion_count` 계산
- 규칙: 0명 → `companion_count = 1` (혼자), 1명 → 2, ... , 4명 이상 → 5
- CompanionInput은 `companion_count` 계산 책임 없음 (순수 UI)

---

## 목업 매핑

### SceneTagSelector 프로토타입 CSS

| 프로토타입 클래스 | CSS 정의 | Tailwind 구현 |
|-----------------|---------|--------------|
| `.rest-rec-scene-chips` | `display:flex; flex-wrap:wrap; gap:8px` | `flex flex-wrap gap-2` |
| `.rest-rec-scene-chip` | `display:flex; align-items:center; gap:6px; padding:8px 16px; border-radius:50px; border:1.5px solid var(--border); font-size:13px; font-weight:600; color:var(--text-sub); background:var(--bg-card); cursor:pointer; transition:all 0.15s` | `flex items-center gap-1.5 px-4 py-2 rounded-full border-[1.5px] border-border text-[13px] font-semibold text-muted-foreground bg-card cursor-pointer transition-all duration-150` |
| `.rest-rec-scene-chip.selected` | (기본) `border-color:var(--accent-food); background:var(--accent-food-light); color:var(--accent-food)` | 인라인 스타일로 씬태그별 색상 적용 (위 렌더링 구조 참조) |

> 주의: 프로토타입의 `.selected` 상태는 `--accent-food`를 사용하나, 설계 문서(RECORD_DETAIL.md, RECOMMENDATION.md)에서는 씬태그별 고유 색상(`--scene-*`)을 명시함. **씬태그별 고유 색상을 적용한다.**

### CompanionInput 프로토타입 CSS

| 프로토타입 클래스 | CSS 정의 | Tailwind 구현 |
|-----------------|---------|--------------|
| `.rest-rec-companion` | `display:flex; align-items:center; gap:8px; padding:8px 12px; border:1px solid var(--border); border-radius:10px; background:var(--bg-card)` | `flex items-center gap-2 px-3 py-2 border border-border rounded-[10px] bg-card` |
| `.rest-rec-comp-avatar` | `width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:white; flex-shrink:0` | `w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0` |
| `.rest-rec-comp-name` | `font-size:13px; color:var(--text); font-weight:600; flex:1` | `text-[13px] text-foreground font-semibold flex-1` |
| `.rest-rec-comp-remove` | `color:var(--text-hint); cursor:pointer` | `text-muted-foreground/60 cursor-pointer` |
| `.rest-rec-comp-add` | `display:flex; align-items:center; gap:6px; color:var(--text-hint); font-size:13px; cursor:pointer; padding:8px 0` | `flex items-center gap-1.5 text-muted-foreground/60 text-[13px] cursor-pointer py-2` |

### 프로토타입 HTML 참조 (screen-rest-record)

```html
<!-- 상황 태그 -->
<div class="rest-record-section">
  <div class="rest-record-section-title">상황 <span class="ai-tag">AI 추천</span></div>
  <div class="rest-rec-scene-chips" id="restRecScenes">
    <div class="rest-rec-scene-chip" onclick="toggleRestRecScene(this)" data-scene="혼밥">혼밥</div>
    <div class="rest-rec-scene-chip selected" onclick="toggleRestRecScene(this)" data-scene="데이트">데이트</div>
    <div class="rest-rec-scene-chip" onclick="toggleRestRecScene(this)" data-scene="친구">친구</div>
    <div class="rest-rec-scene-chip" onclick="toggleRestRecScene(this)" data-scene="가족">가족</div>
    <div class="rest-rec-scene-chip" onclick="toggleRestRecScene(this)" data-scene="회식">회식</div>
    <div class="rest-rec-scene-chip" onclick="toggleRestRecScene(this)" data-scene="술자리">술자리</div>
  </div>
</div>

<!-- 동반자 -->
<div class="rest-record-section">
  <div class="rest-record-section-title">동반자 <span class="ai-tag">사진 인식</span></div>
  <div class="rest-rec-companion">
    <div class="rest-rec-comp-avatar" style="background:linear-gradient(135deg,#7A9BAE,#5a7b8e);">김</div>
    <div class="rest-rec-comp-name">김영수</div>
    <div class="rest-rec-comp-remove">
      <i data-lucide="x" style="width:14px;height:14px;"></i>
    </div>
  </div>
</div>
```

---

## 데이터 흐름

### 씬태그

```
[AI 사진 분석] ─── aiSuggestion: SceneTag (예: 'romantic')
    │
    ▼
[SceneTagSelector 마운트]
    │
    ├─ aiSuggestion → value 자동 설정 (최초 1회, value null일 때만)
    │
    ▼ 사용자 칩 탭
    │
    ├─ handleSelect(tag) → onChange(tag | null)
    │   같은 칩 재탭 → null (해제)
    │   다른 칩 탭 → 교체
    │
    ▼ 저장 시
    │
    └─ records.scene = value    (VARCHAR(20), 예: 'romantic')
       null이면 scene 컬럼 NULL
```

### 동행자

```
[AI 얼굴 인식] ─── aiCompanions: string[] (예: ['김영수'])
    │
    ▼
[CompanionInput 마운트]
    │
    ├─ aiCompanions → value 자동 설정 (최초 1회, value 비어있을 때만)
    │
    ▼ 사용자 입력/삭제
    │
    ├─ addCompanion() → onChange([...value, newName])
    ├─ removeCompanion(i) → onChange(value.filter(...))
    │
    ▼ 저장 시 (부모 컴포넌트에서 처리)
    │
    ├─ records.companions = value               (TEXT[], 예: ['김영수', '이수진'])
    │   ⚠️ 무조건 비공개 — 본인만 열람
    │   API 응답, 버블 피드, 프로필 등 외부 노출 절대 금지
    │
    └─ records.companion_count = calculateCount(value.length)
       (INT: 0명→1, 1명→2, 2명→3, 3명→4, 4명이상→5)
       필터/통계용 — 비공개가 아님
```

### companion_count 계산 로직 (부모에서 실행)

```typescript
/**
 * 동행자 수 → companion_count 변환.
 * 본인 포함 인원수: 동행자 0명 = 혼자(1), 동행자 1명 = 2명, ...
 * 5 이상은 5로 클램프.
 */
function calculateCompanionCount(companionsLength: number): number {
  return Math.min(companionsLength + 1, 5)
}
```

### 프라이버시 규칙 (AUTH.md)

| 필드 | 공개 범위 | 용도 |
|------|----------|------|
| `companions TEXT[]` | **무조건 비공개** — 본인만 열람 | 기록 상세(내 것만), 검색 필터 |
| `companion_count INT` | 비공개 아님 | 홈 필터/소팅, 통계 집계 |

- RLS 정책에서 `companions` 컬럼은 `auth.uid() = user_id`인 경우만 SELECT 허용
- 버블 피드 뷰(`bubble_feed_view`)에서 `companions` 컬럼 제외 확인

---

## 검증 체크리스트

```
□ pnpm build — 에러 없음
□ pnpm lint — 경고 0개
□ TypeScript strict — any/as any/@ts-ignore/! 0개
□ R1 준수 — scene.ts에 React/Supabase/Next import 없음
□ R4 준수 — scene-tag-selector.tsx, companion-input.tsx에 infrastructure/Supabase import 없음
□ 씬태그 6개 — solo, romantic, friends, family, business, drinks 모두 표시
□ 단일 선택 — 하나 선택 시 이전 선택 해제
□ 재탭 해제 — 같은 칩 다시 탭하면 null로 해제
□ 씬태그 색상 — 각 태그별 고유 색상(--scene-*) 적용, 선택 시 배경+텍스트 변경
□ AI 추천 — aiSuggestion으로 전달된 태그 pre-select + ai-tag 뱃지
□ 동행자 추가 — 이름 입력 + Enter/추가 버튼으로 등록
□ 동행자 삭제 — X 버튼으로 개별 삭제
□ 중복 방지 — 같은 이름 중복 추가 불가
□ 아바타 — 이름 첫 글자 + 그라디언트 배경
□ 프라이버시 — companions는 외부 노출 경로 없음 확인 (코드 리뷰)
□ companion_count — value.length 기반 1~5 범위 계산 정확
□ CSS 클래스명 — 프로토타입과 일치 (rest-rec-scene-chips, rest-rec-scene-chip, rest-rec-companion 등)
□ 애니메이션 — 칩 선택 시 0.2s transition + scale(1.05)
□ 모바일 360px — 칩 flex-wrap 정상, 터치 타겟 44x44px 이상
□ 디자인 토큰 — bg-white/text-black 하드코딩 없음
□ 아이콘 — lucide-react X, Plus 사용
```
