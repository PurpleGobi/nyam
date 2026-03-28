# S3-T07: 검색→선택→기록 풀플로우 연결

> 3가지 진입 경로 통합. 상태 머신으로 step 관리. status 결정 로직. 성공 화면.

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `pages/05_RECORD_FLOW.md` | §1 핵심 원칙 | 3가지 경로 (카메라/검색/상세 FAB), status 구분 |
| `pages/05_RECORD_FLOW.md` | §2 진입점 | FAB(+) → 현재 탭 기반 직접 진입 (바텀시트 없음) |
| `pages/05_RECORD_FLOW.md` | §5 이미 있는 항목 처리 | 기록 없음/찜만/기록 있음 분기 |
| `pages/05_RECORD_FLOW.md` | §7 성공 화면 | screen-add-success 레이아웃 |
| `pages/05_RECORD_FLOW.md` | §8 풍성화 | checked → rated 전환 |
| `pages/05_RECORD_FLOW.md` | §9 데이터 저장 | 저장 시퀀스 (records INSERT → photos → wishlists → XP) |
| `pages/01_SEARCH_REGISTER.md` | §3 선택 시 동작 | 새 식당 → 성공화면 (checked), 기록 있음 → 토스트+상세 |
| `prototype/01_home.html` | `screen-add-success` | 성공 화면 비주얼 레퍼런스 |

---

## 선행 조건

- S3-T01~T06 모두 완료
- S2 (Core Recording) 완료 — 기록 화면 (screen-rest-record, screen-wine-record) 구현 완료

---

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 레이어 | 설명 |
|-----------|--------|------|
| `src/domain/entities/add-flow.ts` | domain | 풀플로우 상태 머신 타입 |
| `src/application/hooks/use-add-flow.ts` | application | 풀플로우 상태 관리 (step 전환, 데이터 전달) |
| `src/application/hooks/use-create-record.ts` | application | 기록 저장 (records INSERT + wishlists 방문 처리, XP는 S6 위임) |
| `src/presentation/components/add-flow/success-screen.tsx` | presentation | 성공 화면 (screen-add-success) |
| `src/presentation/components/record/record-nav.tsx` | presentation | 기록 네비게이션 헤더 (뒤로/타이틀/닫기) — add-flow와 record-flow 공용으로 `record/` 폴더에 통합 |
| `src/presentation/containers/add-flow-container.tsx` | presentation | 풀플로우 루트 컨테이너 |
| `src/app/(main)/add/page.tsx` | app | 기록 추가 페이지 라우트 |

### 스코프 외

- 기록 화면 UI (S2 구현체 재사용)
- XP 적립 DB 기록 — S6에서 구현 (여기서는 record_quality_xp 필드만 설정)
- 버블 공유 — Phase 2

---

## 상세 구현 지침

### 1. `src/domain/entities/add-flow.ts`

> **설계 변경 사항**: 초기 설계의 `AddFlowState`, `SuccessAction`은 실제 사용되지 않아 제거됨.
> `AddFlowTarget` 타입 추가 — 대상 정보를 캡슐화. hook은 `step`, `target`을 개별 반환.
> `RecordTargetType` import도 제거됨 (외부 의존 0 준수).

```typescript
// src/domain/entities/add-flow.ts (실제 구현)
// R1: 외부 의존 0

export type AddFlowStep = 'camera' | 'ai_result' | 'wine_confirm' | 'search' | 'record' | 'success'
export type AddFlowEntryPath = 'camera' | 'search' | 'detail_fab' | 'nudge' | 'recommend'

/** 대상 정보 (hook에서 실제 사용) */
export interface AddFlowTarget {
  id: string
  name: string
  type: 'restaurant' | 'wine'
  meta: string
  isAiRecognized: boolean
}

export interface AIPreFillData { ... }
export function determineRecordStatus(entryPath, hasRating): 'checked' | 'rated'
```

### 2. `src/application/hooks/use-add-flow.ts`

> **설계 변경 사항**: 초기 설계의 `AddFlowState` 캡슐화 반환 대신, `step`/`target`을 개별 반환하는 경량 설계로 변경됨.
> 메서드명: `goToStep` → `pushStep`, `selectTarget` → `setTarget`, `exitFlow/restartFlow` → `reset` 통합.
> 초기 파라미터: `initialTargetType/entryPath` → `initialStep/initialTarget` (URL searchParams 기반).

```typescript
// src/application/hooks/use-add-flow.ts (실제 구현)

interface UseAddFlowParams {
  initialStep: AddFlowStep
  initialTarget?: AddFlowTarget | null
}

interface UseAddFlowReturn {
  step: AddFlowStep
  target: AddFlowTarget | null
  stepHistory: AddFlowStep[]
  setTarget: (target: AddFlowTarget | null) => void
  pushStep: (next: AddFlowStep) => void
  goBack: () => AddFlowStep | null  // 이전 step 반환 (없으면 null)
  reset: () => void
}
```

> 컨테이너에서 URL searchParams(`type`, `from`, `targetId`, `name`, `meta`)를 파싱하여 `initialStep`과 `initialTarget`을 결정.
> `register` step은 컨테이너에서 직접 `/register` 페이지로 라우팅 처리 (별도 페이지 분리).

### 3. `src/application/hooks/use-create-record.ts`

**RECORD_FLOW.md §9 저장 시퀀스 구현**

> **설계 변경 사항**: 초기 설계 `use-save-record.ts` → `use-create-record.ts`로 대체됨.
> EXIF 검증은 hook 외부(컨테이너)에서 수행하여 `CreateRecordInput.hasExifGps`/`isExifVerified`로 전달.
> 사진 업로드도 컨테이너(`add-flow-container`, `record-flow-container`)에서 별도 처리.

```typescript
// src/application/hooks/use-create-record.ts (실제 구현)

import type { DiningRecord, CreateRecordInput } from '@/domain/entities/record'

interface UseCreateRecordReturn {
  createRecord: (input: CreateRecordInput) => Promise<DiningRecord>
  isLoading: boolean
  error: string | null
}

// 내부 로직:
// 1. 입력 유효성 검증 (targetId, targetType, 범위 체크)
// 2. recordRepo.create(input) → records INSERT
// 3. recordRepo.markWishlistVisited() → 찜 방문 처리
// 4. DiningRecord 반환
//
// EXIF 검증 / 사진 업로드는 호출하는 컨테이너에서 처리:
//   add-flow-container: parseExifFromBase64() → hasExifGps 전달, uploadCapturedPhoto()
//   record-flow-container: extractExifFromFile() → validateExifGps() → hasExifGps/isExifVerified 전달
```

### 4. `src/presentation/components/add-flow/success-screen.tsx`

**RECORD_FLOW.md §7 screen-add-success**

```typescript
// src/presentation/components/add-flow/success-screen.tsx

import { Check, Plus, Home } from 'lucide-react'

// 설계 변경: targetType → variant ('food'|'wine'), onAction(SuccessAction) → 3개 개별 콜백
// SuccessAction enum 불필요 — 개별 콜백이 더 명확하고 타입 안전
interface SuccessScreenProps {
  variant: 'food' | 'wine'
  targetName: string
  targetMeta: string
  onAddDetail: () => void
  onAddAnother: () => void
  onGoHome: () => void
}

export function SuccessScreen({
  variant,
  targetName,
  targetMeta,
  onAddDetail,
  onAddAnother,
  onGoHome,
}: SuccessScreenProps) {
  const accentClass = variant === 'food'
    ? 'bg-[var(--accent-food)]'
    : 'bg-[var(--accent-wine)]'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6">
      {/* 체크 아이콘 */}
      <div className={`w-16 h-16 rounded-full ${accentClass} flex items-center justify-center mb-6`}>
        <Check size={32} className="text-white" strokeWidth={3} />
      </div>

      {/* 타이틀 */}
      <h2 className="text-[20px] font-bold text-[var(--text)] mb-2">
        추가되었습니다!
      </h2>

      {/* 대상 정보 */}
      <p className="text-[14px] text-[var(--text-sub)] text-center">
        {targetName}
        {targetMeta && ` · ${targetMeta}`}
      </p>

      {/* 버튼 그룹 */}
      <div className="flex flex-col gap-3 w-full max-w-[280px] mt-10">
        {/* Primary: 내용 추가하기 → 상세페이지 */}
        <button
          type="button"
          onClick={onAddDetail}
          className={`w-full py-3.5 rounded-xl ${accentClass} text-white text-[15px] font-semibold`}
        >
          내용 추가하기
        </button>

        {/* Ghost: 한 곳 더 추가 — add-flow: resetFlow()+resetCamera() state 리셋, search: setQuickAddSuccess(null) 검색 화면 복귀 */}
        <button
          type="button"
          onClick={onAddAnother}
          className="w-full py-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] text-[15px] font-medium bg-[var(--bg-card)] flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          한 곳 더 추가
        </button>

        {/* Text: 홈으로 */}
        <button
          type="button"
          onClick={onGoHome}
          className="w-full py-3 text-[var(--text-sub)] text-[14px] flex items-center justify-center gap-2"
        >
          <Home size={16} />
          홈으로
        </button>
      </div>
    </div>
  )
}
```

### 5. `src/presentation/components/record/record-nav.tsx`

> **구현 시 변경**: `add-flow/record-nav.tsx` → `record/record-nav.tsx`로 통합. add-flow와 record-flow에서 공용으로 사용.

**RECORD_FLOW.md §10 record-nav**

```typescript
// src/presentation/components/record/record-nav.tsx

import { ChevronLeft, X } from 'lucide-react'

// 설계 변경: variant 'restaurant' → 'food'
interface RecordNavProps {
  title: string
  variant?: 'food' | 'wine'  // 기본값 'food'
  onBack: () => void
  onClose: () => void
}

export function RecordNav({ title, variant, onBack, onClose }: RecordNavProps) {
  const titleColorClass = variant === 'wine'
    ? 'text-[var(--accent-wine)]'
    : 'text-[var(--text)]'

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg)]">
      <button
        type="button"
        onClick={onBack}
        className="p-1"
      >
        <ChevronLeft size={22} className="text-[var(--text)]" />
      </button>

      <h1 className={`text-[16px] font-semibold ${titleColorClass}`}>
        {title}
      </h1>

      <button
        type="button"
        onClick={onClose}
        className="p-1"
      >
        <X size={20} className="text-[var(--text)]" />
      </button>
    </header>
  )
}
```

### 6. `src/presentation/containers/add-flow-container.tsx`

> **설계 변경 사항**: Props 기반 → URL searchParams 기반으로 변경됨.
> 컨테이너 내부에서 CameraCapture, AIResultDisplay, WineConfirmCard 등을 직접 렌더링.
> `useCameraCapture` hook을 직접 사용하며, `register` step은 `/register` 페이지로 라우팅.
> `record` step은 `/record` 페이지로 `router.replace()` 위임.
> Geolocation API로 GPS 좌표를 얻어 `identify()` 호출 시 전달.
>
> 실제 구현은 `src/presentation/containers/add-flow-container.tsx` 참조.

```typescript
// 핵심 구조 (실제 구현 요약)
export function AddFlowContainer() {
  return (
    <Suspense fallback={...}>
      <AddFlowInner />
    </Suspense>
  )
}

// AddFlowInner: URL params → initialStep/initialTarget 결정
// useAddFlow({ initialStep, initialTarget }) + useCameraCapture() + useCreateRecord()
// GPS: useEffect로 navigator.geolocation 획득 → identify()에 전달
//
// 빠른추가 패턴 (confident match / ai_result 선택 / wine_confirm):
//   1. parseExifFromBase64(imageBase64) → EXIF GPS 존재 여부 확인
//   2. createRecord({ status: 'checked', hasExifGps, isExifVerified: false }) → records INSERT
//      (빠른추가에서는 candidate에 좌표 없으므로 isExifVerified=false 고정)
//   3. uploadCapturedPhoto(recordId) → 이미지 자동 업로드
//   4. pushStep('success') → SuccessScreen
//   5. 실패 시 → pushStep('record') → /record 페이지로 폴백
//
//   빠른추가 성공 시 촬영 이미지 자동 업로드:
//     capturedImage → base64→File 변환 → imageService.resizeImage → uploadImage → photoRepo.savePhotos
//     실패해도 record는 유지 (사진은 나중에 상세페이지에서 추가 가능)
//
// record 이동 시 sessionStorage 전달:
//   'nyam_ai_prefill': AI 인식 결과 (genre/wineType/region/vintage/gps)
//   'nyam_captured_image': 촬영 이미지 base64 (record-flow에서 자동 첨부)
//
// step별 렌더링: camera → ai_result → wine_confirm → search → record(라우팅) → success
```

---

## 데이터 흐름 (3 경로 통합)

```
┌─── 경로 1: 카메라 (Primary) ───────────────────────────────────────┐
│ FAB(+) → currentHomeTab → CameraCapture                           │
│    ↓                                                               │
│ 촬영/앨범 → AI 인식 (POST /api/records/identify)                   │
│    ↓                                                               │
│ ┌─ 식당: isConfidentMatch → 빠른추가 시도 (checked INSERT)         │
│ │         → 성공 → step='success'                                  │
│ │         → 실패 → step='record' (full form 폴백)                  │
│ │         후보 다수 → step='ai_result' → 선택 → 빠른추가 → success │
│ │         후보 0 → step='search'                                   │
│ │                                                                  │
│ └─ 와인: isConfidentMatch → 빠른추가 시도 (checked INSERT)        │
│          → 성공 → step='success'                                   │
│          → 실패 → step='record' (full form 폴백)                   │
│          후보 → step='wine_confirm' → 맞아요 → 빠른추가 → success  │
│          후보 0 → "찾지 못했어요" → step='search'     │
│          shelf/receipt 모드: 후보 1개 → step='wine_confirm'         │
│                              후보 다수 → step='search' (목록)       │
│    ↓                                                               │
│ step='record' (빠른추가 실패 시 폴백)                               │
│   AI pre-fill: genre/wineType/region/gps → sessionStorage 저장     │
│   촬영 이미지: base64 → sessionStorage 저장 → record-flow 자동 첨부 │
│    ↓                                                               │
│ 저장 → status='rated' → step='success'                            │
└────────────────────────────────────────────────────────────────────┘

┌─── 경로 2: 검색/목록 ─────────────────────────────────────────────┐
│ FAB(+) → 목록에서 추가 → step='search'                            │
│    ↓                                                               │
│ 검색 입력 → debounce → 자동완성 결과                               │
│    ↓                                                               │
│ ┌─ 새 식당/와인 선택 → 빠른추가                                    │
│ │   ├─ records INSERT (status='checked')                           │
│ │   └─ step='success'                                             │
│ │                                                                  │
│ └─ "기록 있음" 선택 → 토스트 → 상세 페이지 이동                     │
│                                                                    │
│ 결과 없음 → "직접 등록" 버튼 → /register 페이지로 라우팅            │
└────────────────────────────────────────────────────────────────────┘

┌─── 경로 3: 상세 FAB ─────────────────────────────────────────────┐
│ 상세 페이지 → FAB(+) → step='record' (대상 선택 스킵)             │
│    ↓                                                               │
│ 기록 화면 (이전 기록 반투명 참조점 표시)                            │
│    ↓                                                               │
│ 저장 → status='rated' → step='success'                            │
└────────────────────────────────────────────────────────────────────┘
```

---

## 검증 체크리스트

```
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ R1: domain/entities/add-flow.ts에 외부 import 없음
□ R3: application hooks에 infrastructure import 없음
□ R4: presentation에 infrastructure import 없음
□ R5: app/(main)/add/page.tsx는 AddFlowContainer 렌더링만
□ 카메라 경로: FAB→카메라→AI인식→기록→저장→성공 (status='rated')
□ 검색 경로: FAB→검색→선택→성공 (status='checked')
□ 상세 FAB 경로: 상세→FAB→기록→저장→성공 (status='rated')
□ 검색 빠른추가: records INSERT (status='checked') 동작
□ "기록 있음" → 토스트 + 상세 페이지 이동
□ 성공 화면: "내용 추가하기" → 상세, "한 곳 더 추가" → state 리셋(add-flow: resetFlow+resetCamera, search: quickAddSuccess=null), "홈으로" → /
□ 성공 화면 테마: food(--accent-food) / wine(--accent-wine)
□ 뒤로 가기: step history 기반 이전 단계 복원
□ 닫기(X): 플로우 전체 종료
□ 저장 시퀀스: EXIF 검증(validateExifGps) → records INSERT(hasExifGps/isExifVerified 포함) → photos → wishlists (XP는 S6 위임)
□ TypeScript strict: any/as any/@ts-ignore/! 0개
□ 모바일 360px 레이아웃 정상
```
