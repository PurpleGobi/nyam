# 2.9: 기록 저장 플로우

> 식당/와인 기록의 전체 플로우를 조립한다. S2의 모든 컴포넌트(2.2~2.8)를 통합 기록 화면으로 합치고, 저장 → 성공 화면까지 완성한다.

---

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `pages/05_RECORD_FLOW.md` | §3 식당 기록 플로우, §4 와인 기록 플로우, §7 성공 화면, §9 데이터 저장, §10 공통 UI |
| `systems/RATING_ENGINE.md` | §1 핵심 개념, §2 축 정의, §7 상황 태그, §8 와인 심화 평가, §9 부가 입력 |
| `systems/DATA_MODEL.md` | records 테이블, record_photos 테이블, wishlists 테이블 |
| `systems/DESIGN_SYSTEM.md` | §1 게이지 색상, §8 점 비주얼, §15 Circle Rating |
| `prototype/01_home.html` | `screen-rest-record`, `screen-wine-record`, `screen-add-success` |

---

## 선행 조건

| 태스크 | 이유 |
|--------|------|
| 2.1 domain 엔티티 | Record, RecordPhoto 타입 필수 |
| 2.2 사분면 UI | QuadrantInput 컴포넌트 |
| 2.3 만족도 게이지 | CircleRating 컴포넌트 (사분면 내장) |
| 2.4 아로마 팔레트 | AromaWheel 컴포넌트 (와인 전용) |
| 2.5 구조평가 | WineStructureEval 컴포넌트 (와인 전용, 선택) |
| 2.6 페어링 | PairingGrid 컴포넌트 (와인 전용) |
| 2.7 씬태그 + 동행자 | SceneTagSelector, CompanionInput 컴포넌트 (식당 전용) |
| 2.8 사진 업로드 | PhotoPicker + Supabase Storage 연결 |

---

## 구현 범위

### 포함

- 식당 통합 기록 화면 (`screen-rest-record`)
- 와인 통합 기록 화면 (`screen-wine-record`)
- 저장 후 성공 화면 (`screen-add-success`)
- 기록 네비게이션 바 (`record-nav`)
- 하단 저장 바 (sticky)
- records 테이블 INSERT + record_photos INSERT + wishlists UPDATE 시퀀스
- Phase 1(필수) / Phase 2(선택) 구분 저장

### 제외 (다른 스프린트)

- Step 1 카메라 촬영 + AI 인식 → **S3에서 구현** (여기서는 mock 대상 데이터를 props로 주입)
- 검색/목록 폴백 (`screen-add-restaurant-search`, `screen-add-wine-search`) → **S3**
- XP 적립 전체 로직 → **S6** (여기서는 `record_quality_xp` 필드만 0으로 저장)
- 버블 공유 → **S7**

### S3 선행 통합 (S2 container에 미리 포함)

<!-- 2026-03-28 설계 보완: S3 풀플로우와의 매끄러운 통합을 위해 아래 로직을 S2 container에 선행 구현.
     S2 범위에서는 entryPath='camera'이므로 determineRecordStatus는 항상 'rated' 반환.
     EXIF 검증도 사진이 있고 GPS 정보가 있을 때만 동작하므로 S2 단독 사용 시 영향 없음. -->

- **`determineRecordStatus(entryPath, hasRating)`**: S3 `07_full_flow.md`에서 정의. S2에서는 `entryPath='camera'`이므로 항상 `'rated'` 반환. S3 검색 경로에서 `'checked'` 분기 활성화.
- **EXIF GPS 검증**: `extractExifFromFile` + `validateExifGps` — 첫 번째 사진에서 GPS 추출 후 대상 좌표와 비교. `hasExifGps`, `isExifVerified` 필드 저장. 검증 실패 시 `exifWarning` 메시지 표시.
- **`exifWarning`**: `RecordSuccessProps`에 `exifWarning?: string | null` 추가. 성공 화면에서 GPS 불일치 경고 표시.

---

## 상세 구현 지침

### 1. 파일 구조

```
src/
├── presentation/
│   ├── components/
│   │   └── record/
│   │       ├── restaurant-record-form.tsx   # 식당 기록 폼 (순수 UI)
│   │       ├── wine-record-form.tsx         # 와인 기록 폼 (순수 UI)
│   │       ├── record-success.tsx           # 저장 성공 화면 (순수 UI)
│   │       ├── record-nav.tsx               # 기록 네비게이션 바 (순수 UI)
│   │       └── record-save-bar.tsx          # 하단 고정 저장 버튼 (순수 UI)
│   └── containers/
│       └── record-flow-container.tsx        # 플로우 오케스트레이터 (hook + 상태 관리)
└── app/
    └── (main)/
        └── record/
            └── page.tsx                     # Container 렌더링만
```

### 2. 플로우 상태 관리 (`record-flow-container.tsx`)

```typescript
type RecordFlowStep = 'form' | 'success'
type RecordTargetType = 'restaurant' | 'wine'

interface RecordFlowState {
  step: RecordFlowStep
  targetType: RecordTargetType
  targetId: string | null
  targetName: string
  targetMeta: string         // "일식 · 을지로" 또는 "Red · Bordeaux · 2018"
  savedRecordId: string | null
}

// 사진 업로드 실패 시 표시할 에러 (별도 useState, DEC-007)
const [photoError, setPhotoError] = useState<string | null>(null)
```

- `step: 'form'` → 통합 기록 화면 렌더링
- `step: 'success'` → 성공 화면 렌더링
- `targetType`은 URL 쿼리 파라미터 또는 홈 탭 상태에서 결정
- S2에서는 `targetId`와 `targetName`을 mock props로 주입. S3에서 카메라/검색 연동 시 실제 데이터로 교체

### 3. 식당 기록 화면 (`restaurant-record-form.tsx`)

**Props 인터페이스:**

```typescript
interface RestaurantRecordFormProps {
  target: {
    id: string
    name: string
    genre?: string
    area?: string
    distance?: string
    isAiRecognized?: boolean
  }
  referenceRecords?: QuadrantPoint[]  // 기존 기록 참조점
  onSave: (data: CreateRestaurantRecordInput) => Promise<void>
  isLoading: boolean
  /** 사진 관련 props — container에서 usePhotoUpload hook으로 주입 */
  photoSlot?: React.ReactNode         // <PhotoPicker> 컴포넌트를 container에서 전달
}
```

**화면 구성 (위 → 아래 순서, 단일 스크롤):**

<!-- 2026-03-28 설계 보완: #6 추천 메뉴, #8 방문 날짜 추가.
     - menuTags: 00_IA.md Phase 2 항목이나 원래 테이블에서 누락. S4 기록 상세 표시 + S6 XP 가산에 소비됨.
     - visitDate: 비카메라 경로(상세 FAB 등)에서 과거 방문 기록 불가 문제 해결. 카메라 경로는 S3에서 EXIF 자동 추출.
     - mealTime: 추가하지 않음. 캘린더 뷰 보조 라벨 전용이고 EXIF 자동 추론(S3)으로 충분. created_at으로 대체 가능. -->

| 순서 | 섹션 | 컴포넌트 | 필수 여부 |
|------|------|----------|----------|
| 1 | AI 인식 결과 헤더 | 인라인 (target props) | — |
| 2 | 사진 | `PhotoPicker` (container에서 props 주입) | Phase 2 선택 |
| 3 | 사분면 평가 (가격×분위기 + 만족도) | `QuadrantInput type="restaurant"` | Phase 1 필수 |
| 4 | 상황 태그 (6종 단일 선택) | `SceneTagSelector` | Phase 1 필수 |
| 5 | 한줄 코멘트 (200자) | `<textarea maxLength={200}>` | Phase 2 선택 |
| 6 | 동행자 | `CompanionInput` | Phase 2 선택 |
| 7 | 추천 메뉴 | 태그 입력 (`menuTags TEXT[]`, 사용자가 먹은 메뉴) | Phase 2 선택 |
| 8 | 가격 (1인) | `<input type="number">` + "원" suffix | Phase 2 선택 |
| 9 | 방문 날짜 | 날짜 선택 (기본값: 오늘, 과거 방문 변경 가능) | Phase 2 선택 |
| 10 | 같이 마신 와인 | 와인 연결 UI (인라인 검색 토글) | Phase 2 선택 |

**AI 인식 결과 헤더 (`rest-record-header`):**

```
┌─────┐ {target.name}
│ 🍴  │ {target.genre} · {target.area} · {target.distance}
└─────┘ ✨ AI 자동 인식   ← target.isAiRecognized === true일 때만
```

- 아이콘: `utensils` (lucide, 20px)
- AI 뱃지: `sparkles` 아이콘 (10x10) + "AI 자동 인식" 텍스트 (10px), `color: var(--accent-food)`

**와인 연결 섹션:**

- "[⊕ 와인 추가]" 버튼 탭 → 인라인 검색 입력 노출
- S2에서는 검색 UI 껍데기만 구현 (실제 검색은 S3)
- 연결된 와인 카드: 와인 아이콘 + 이름 + 타입/산지 + "[연결됨]" 뱃지 + "[✕]" 해제 버튼
- `linked_wine_id` 필드에 UUID 저장

### 4. 와인 기록 화면 (`wine-record-form.tsx`)

**Props 인터페이스:**

```typescript
interface WineRecordFormProps {
  target: {
    id: string
    name: string
    wineType?: string        // 'red' | 'white' | 'rose' | ...
    region?: string
    vintage?: number
    isAiRecognized?: boolean
  }
  referenceRecords?: QuadrantPoint[]
  onSave: (data: CreateWineRecordInput) => Promise<void>
  isLoading: boolean
  /** 사진 관련 props — container에서 usePhotoUpload hook으로 주입 */
  photoSlot?: React.ReactNode         // <PhotoPicker> 컴포넌트를 container에서 전달
}
```

**화면 구성 (위 → 아래 순서, 단일 스크롤):**

<!-- 2026-03-28 설계 보완: #8 음용 날짜 추가. 카메라 경로는 S3 EXIF 자동, 비카메라 경로에서 수동 변경 가능. -->

| 순서 | 섹션 | 컴포넌트 | 필수 여부 |
|------|------|----------|----------|
| 1 | AI 인식 결과 헤더 | 인라인 (target props) | — |
| 2 | 사진 | `PhotoPicker` (container에서 props 주입) | Phase 2 선택 |
| 3 | 사분면 평가 (산미×바디 + 만족도) | `QuadrantInput type="wine"` | Phase 1 필수 |
| 4 | 아로마 팔레트 (15섹터 3링) | `AromaWheel` | Phase 1 필수 |
| 5 | 구조 평가 (복합성/여운/균형) | `WineStructureEval` | Phase 1 선택 |
| 6 | 페어링 (WSET 8카테고리) | `PairingGrid` | Phase 1 필수 |
| 7 | 한줄 코멘트 (200자) | `<textarea maxLength={200}>` | Phase 2 선택 |
| 8 | 가격 (병) | `<input type="number">` + "원" suffix | Phase 2 선택 |
| 9 | 음용 날짜 | 날짜 선택 (기본값: 오늘, 과거 음용 변경 가능) | Phase 2 선택 |
| 10 | 어디서 마셨나요? (식당 연결) | 식당 연결 UI | Phase 2 선택 |

**AI 인식 결과 헤더:**

```
┌─────┐ {target.name}
│ 🍷  │ {target.wineType} · {target.region} · {target.vintage}
└─────┘ ✨ AI 자동 인식
```

- 아이콘: `wine` (lucide, 20px)
- AI 뱃지: `sparkles` + "AI 자동 인식" (10px), `color: var(--accent-wine)`

**만족도 자동 산출 (구조평가 입력 시):**

```typescript
function calculateAutoScore(activeRingCount: number, finish: number, balance: number): number {
  // 아로마 링 수 기반 (RATING_ENGINE.md §8)
  const complexityBonus = activeRingCount >= 3 ? 15 : activeRingCount >= 2 ? 7 : 0
  const raw = 50 + complexityBonus + (finish * 0.1) + (balance * 0.15)
  return Math.round(Math.max(1, Math.min(100, raw)))
}
```

- `activeRingCount` = 아로마 휠에서 1개 이상 섹터가 선택된 링 수 (1차향/2차향/3차향)

- 구조평가 슬라이더 조작 → `autoScore` 실시간 재계산
- 사용자가 만족도를 직접 드래그로 조정하면 `isManualOverride = true` → 자동산출 중단
- `records.auto_score`에 자동산출값, `records.satisfaction`에 최종 만족도 독립 저장

**식당 연결 섹션:**

- "[⊕ 식당 검색]" 버튼 탭 → 인라인 검색 입력 노출 (S2는 껍데기)
- 연결된 식당 카드: 식당 아이콘 + 이름 + 장르/동네 + "[연결됨]" 뱃지 + "[✕]" 해제
- `linked_restaurant_id` 필드에 UUID 저장

### 5. 기록 네비게이션 바 (`record-nav.tsx`)

**Props:**

```typescript
interface RecordNavProps {
  title: string                     // "기록", "식당 추가", "와인 추가" 등
  variant?: 'food' | 'wine'        // 와인일 때 타이틀 color: var(--accent-wine)
  onBack: () => void               // chevron-left 22px → goBack()
  onClose: () => void              // x 20px → exitRecord() (플로우 전체 종료)
}
```

**렌더링:**

```
[←]      {title}            [✕]
```

- 높이: 44px (터치 타겟)
- 뒤로: `chevron-left` (lucide, 22px) → `onBack`
- 닫기: `x` (lucide, 20px) → `onClose`
- 와인 variant: 타이틀 `color: var(--accent-wine)`
- 배경: `var(--bg)`

### 6. 하단 저장 바 (`record-save-bar.tsx`)

**Props:**

```typescript
interface RecordSaveBarProps {
  variant: 'food' | 'wine'
  onSave: () => void
  isLoading: boolean
  disabled?: boolean                // Phase 1 필수 항목 미충족 시 비활성화
}
```

**렌더링:**

- `position: sticky; bottom: 0`
- 패딩: 안전 영역 포함 (`pb-safe`)
- 식당: `background: var(--accent-food)`, 텍스트 white
- 와인: `background: var(--accent-wine)`, 텍스트 white
- 버튼 텍스트: "저장"
- 전체 너비 (`w-full`)
- `disabled` 시 opacity 0.5 + 클릭 불가

**활성화 조건 (Phase 1 필수 항목):**

| 타입 | 필수 필드 |
|------|----------|
| 식당 | `axis_x`, `axis_y`, `satisfaction`, `scene` |
| 와인 | `axis_x`, `axis_y`, `satisfaction`, `aroma_labels` (1개 이상), `pairing_categories` (1개 이상) |

### 7. 성공 화면 (`record-success.tsx`)

**Props:**

```typescript
interface RecordSuccessProps {
  variant: 'food' | 'wine'
  targetName: string               // "몽탄"
  targetMeta: string               // "한식 · 을지로"
  photoError?: string | null       // 사진 업로드 실패 메시지 (DEC-007)
  exifWarning?: string | null      // EXIF GPS 불일치 경고 메시지 (S3 선행 통합)
  onAddMore: () => void            // "내용 추가하기" → 상세페이지 이동
  onAddAnother: () => void         // "한 곳 더 추가" → restartAdd()
  onGoHome: () => void             // "홈으로" → exitRecord()
}
```

**렌더링 (screen-add-success):**

```
         ✓                        check-circle (lucide)
    추가되었습니다!                 17px, weight 700
   {targetName} · {targetMeta}    14px, --text-secondary

[내용 추가하기]                    Primary 버튼 (food: --accent-food / wine: --accent-wine)
[한 곳 더 추가]                    Ghost 버튼 (outline)
[홈으로]                          Text 버튼 (underline 없음)
```

- 체크 아이콘: `check-circle` (lucide, 48px)
  - food: `color: var(--accent-food)`
  - wine: `color: var(--accent-wine)`
- 버튼 간격: 12px gap
- 전체 화면 centered layout (flex column, items-center, justify-center)

### 8. 저장 시퀀스 (container 오케스트레이션, DEC-007)

> 저장 시퀀스는 container가 오케스트레이션한다. record 저장(hook)과 사진 업로드(별도 hook + PhotoRepository)를 분리하여 관심사를 분리하고, 사진 업로드 실패 시에도 record를 유지하는 graceful degradation을 제공한다.

```typescript
// presentation/containers/record-flow-container.tsx의 handleSave

async function handleSave(formData) {
  // 1. records INSERT + wishlists UPDATE (useCreateRecord hook)
  const record = await createRecord(input)

  // 2. record_photos INSERT (사진이 있으면 — 실패해도 record는 유지)
  if (photos.length > 0) {
    try {
      const uploadedPhotos = await uploadAll(user.id, record.id)  // usePhotoUpload hook
      if (uploadedPhotos.length > 0) {
        await photoRepo.savePhotos(record.id, uploadedPhotos)     // PhotoRepository
      }
    } catch {
      setPhotoError('사진 업로드에 실패했습니다. 상세 페이지에서 다시 추가할 수 있습니다.')
    }
  }

  // 3. 성공 화면으로 전환 (사진 실패 시 photoError 메시지 표시)
  setState({ step: 'success', savedRecordId: record.id })
}
```

**책임 분리:**

| 단계 | 담당 | 실패 시 |
|------|------|---------|
| records INSERT + wishlists | `useCreateRecord` hook | throw → 전체 실패 |
| 사진 리사이즈 + Storage 업로드 | `usePhotoUpload` hook | catch → photoError 표시, record 유지 |
| record_photos INSERT | `PhotoRepository.savePhotos()` | catch → photoError 표시, record 유지 |

**사진 실패 복구:** 성공 화면에서 "내용 추가하기" 버튼으로 상세 페이지 이동 → 수정 화면에서 사진 재업로드 가능.

### 9. 식당/와인 폼 데이터 타입

```typescript
// CreateRecordInput 기본 타입은 01_domain.md(record.ts)에서 정의.
// 여기서는 식당/와인 특화 타입을 추가 정의한다.

interface CreateRestaurantRecordInput {
  targetId: string
  targetType: 'restaurant'
  axisX: number                     // 0~100 (가격)
  axisY: number                     // 0~100 (분위기)
  satisfaction: number              // 1~100
  scene: string                     // 'solo' | 'romantic' | 'friends' | 'family' | 'business' | 'drinks'
  comment?: string                  // 200자 이내
  companions?: string[]
  companionCount?: number
  menuTags?: string[]               // 추천 메뉴 태그 (사용자가 먹은 메뉴, 예: ['A코스', '런치세트'])
  totalPrice?: number               // 1인 가격 (원)
  visitDate?: string                // ISO date (기본값: 오늘). 비카메라 경로에서 과거 방문 기록용
  linkedWineId?: string
  photoUrls?: string[]
}

interface CreateWineRecordInput {
  targetId: string
  targetType: 'wine'
  axisX: number                     // 0~100 (산미)
  axisY: number                     // 0~100 (바디)
  satisfaction: number              // 1~100
  aromaRegions: object              // JSONB (아로마 휠 좌표)
  aromaLabels: string[]             // 선택된 아로마 이름 배열
  aromaColor: string                // hex (가중평균 색상)
  complexity?: number               // 0~100 (선택)
  finish?: number                   // 0~100 (선택)
  balance?: number                  // 0~100 (선택)
  autoScore?: number                // 자동산출 점수 (선택)
  pairingCategories: string[]       // ['red_meat', 'cheese', ...]
  comment?: string                  // 200자 이내
  purchasePrice?: number            // 병 가격 (원)
  visitDate?: string                // ISO date (기본값: 오늘)
  linkedRestaurantId?: string
  photoUrls?: string[]
}

type CreateRecordInput = CreateRestaurantRecordInput | CreateWineRecordInput
```

### 10. status 값 결정 규칙

| 진입 경로 | status | 이유 |
|----------|--------|------|
| 카메라 촬영 → AI 인식 → 통합 기록 화면 → 저장 | `'rated'` | 사분면 + 태그 등 풍성한 데이터 |
| 상세 페이지 FAB → 통합 기록 화면 → 저장 | `'rated'` | 동일 |
| 검색/목록 → 빠른 추가 → 성공 화면 | `'checked'` | 최소 데이터 (S3에서 구현) |

- S2에서 구현하는 기록 화면은 모두 `status: 'rated'`로 저장
- `status: 'checked'`는 S3 검색/목록 경로에서 구현
- `status: 'draft'`: 임시 저장 (현재 S2에서는 미사용, 향후 확장)

### 11. record-flow-container.tsx 핵심 로직

```typescript
export function RecordFlowContainer() {
  // URL params에서 targetType, targetId 추출
  // S2에서는 mock 데이터 사용
  const searchParams = useSearchParams()
  const targetType = (searchParams.get('type') ?? 'restaurant') as RecordTargetType

  const [state, setState] = useState<RecordFlowState>({
    step: 'form',
    targetType,
    targetId: searchParams.get('targetId'),
    targetName: searchParams.get('name') ?? 'Mock 식당',
    targetMeta: searchParams.get('meta') ?? '',
    savedRecordId: null,
  })

  const { createRecord, isLoading: isRecordLoading, error } = useCreateRecord()
  const { photos, addFiles, removePhoto, uploadAll, isUploading } = usePhotoUpload()
  const [photoError, setPhotoError] = useState<string | null>(null)
  const isLoading = isRecordLoading || isUploading

  // 저장 핸들러 (Container 오케스트레이션, DEC-007)
  async function handleSave(formData) {
    setPhotoError(null)
    try {
      // 1. records INSERT + wishlists UPDATE (useCreateRecord hook)
      const record = await createRecord(input)

      // 2. record_photos INSERT (사진이 있으면 — 실패해도 record 유지)
      if (photos.length > 0) {
        try {
          const uploaded = await uploadAll(user.id, record.id)
          if (uploaded.length > 0) {
            await photoRepo.savePhotos(record.id, uploaded)
          }
        } catch {
          setPhotoError('사진 업로드에 실패했습니다. 상세 페이지에서 다시 추가할 수 있습니다.')
        }
      }

      setState(prev => ({ ...prev, step: 'success', savedRecordId: record.id }))
    } catch {
      // useCreateRecord 내부에서 error state 처리
    }
  }

  // 네비게이션
  function handleBack() { router.back() }
  function handleClose() { router.push('/') }
  function handleAddMore() { router.push(`/restaurants/${state.targetId}`) }  // 또는 wines
  function handleAddAnother() { setState(prev => ({ ...prev, step: 'form', savedRecordId: null })) }

  // 렌더링
  if (state.step === 'success') {
    return <RecordSuccess variant={...} targetName={...} photoError={photoError} ... />
  }

  // PhotoPicker를 container에서 조립하여 폼에 slot으로 주입 (DEC-007: 관심사 분리)
  const photoPickerSlot = (
    <PhotoPicker
      photos={photos}
      onAddFiles={addFiles}
      onRemovePhoto={removePhoto}
      isUploading={isUploading}
      isMaxReached={photos.length >= PHOTO_CONSTANTS.MAX_PHOTOS}
      theme={state.targetType === 'wine' ? 'wine' : 'food'}
    />
  )

  return (
    <>
      <RecordNav title="기록" variant={...} onBack={handleBack} onClose={handleClose} />
      {state.targetType === 'restaurant'
        ? <RestaurantRecordForm target={...} onSave={handleSave} isLoading={isLoading} photoSlot={photoPickerSlot} />
        : <WineRecordForm target={...} onSave={handleSave} isLoading={isLoading} photoSlot={photoPickerSlot} />
      }
    </>
  )
}
```

### 12. 라우트 설정

```typescript
// src/app/(main)/record/page.tsx
import { RecordFlowContainer } from '@/presentation/containers/record-flow-container'

export default function RecordPage() {
  return <RecordFlowContainer />
}
```

URL 패턴: `/record?type=restaurant&targetId=xxx&name=xxx&meta=xxx`

---

## 목업 매핑

| 목업 화면 ID | 구현 컴포넌트 | 비고 |
|-------------|-------------|------|
| `screen-rest-record` | `RestaurantRecordForm` | 식당 통합 기록 화면 |
| `screen-wine-record` | `WineRecordForm` | 와인 통합 기록 화면 |
| `screen-add-success` | `RecordSuccess` | 저장 성공 화면 (food/wine 테마 분기) |
| `record-nav` | `RecordNav` | 기록 네비게이션 바 |
| `rest-rec-save-bar` | `RecordSaveBar variant="food"` | 식당 하단 저장 바 |
| `wine-rec-save-btn` | `RecordSaveBar variant="wine"` | 와인 하단 저장 바 |
| `rest-record-header` | `RestaurantRecordForm` 내부 | AI 인식 결과 헤더 |
| `restRecQuad` | `QuadrantInput type="restaurant"` | 식당 사분면 |
| `rest-rec-scene-chips` | `SceneTagSelector` | 상황 태그 칩 |
| `rest-rec-companion` | `CompanionInput` | 동행자 입력 |
| `rest-rec-wine-linked` | `RestaurantRecordForm` 내부 | 와인 연결 카드 |
| `wine-rec-quad-chip` | `QuadrantInput type="wine"` | 와인 사분면 수치 칩 |
| `add-success-check` | `RecordSuccess` 내부 | 체크 아이콘 |
| `add-success-title` | `RecordSuccess` 내부 | "추가되었습니다!" |
| `add-success-sub` | `RecordSuccess` 내부 | 대상명 + 메타 |

---

## 데이터 흐름

```
[RecordFlowContainer]
    │
    ├── URL params → targetType, targetId, name, meta
    │
    ├── useCreateRecord() hook
    │     ├── recordRepo.create() → INSERT records
    │     └── recordRepo.markWishlistVisited() → UPDATE wishlists
    │
    ├── usePhotoUpload() hook + photoRepo (container 오케스트레이션, DEC-007)
    │     ├── uploadAll() → 리사이즈 + Storage 업로드
    │     └── photoRepo.savePhotos() → INSERT record_photos
    │
    ├── step: 'form'
    │     ├── targetType === 'restaurant'
    │     │     └── <RestaurantRecordForm>
    │     │           ├── <QuadrantInput type="restaurant"> → axisX, axisY, satisfaction
    │     │           ├── <SceneTagSelector> → scene
    │     │           ├── <textarea> → comment (선택)
    │     │           ├── <CompanionInput> → companions, companionCount (선택)
    │     │           ├── 메뉴 태그 입력 → menuTags (선택)
    │     │           ├── <input number> → totalPrice (선택)
    │     │           ├── <input date> → visitDate (선택, 기본값: 오늘)
    │     │           ├── 와인 연결 UI → linkedWineId (선택)
    │     │           └── <RecordSaveBar variant="food"> → handleSave()
    │     │
    │     └── targetType === 'wine'
    │           └── <WineRecordForm>
    │                 ├── <QuadrantInput type="wine"> → axisX, axisY, satisfaction
    │                 ├── <AromaWheel> → aromaRegions, aromaLabels, aromaColor
    │                 ├── <WineStructureEval> → complexity, finish, balance (선택)
    │                 │     └── autoScore 재계산 → satisfaction 자동 갱신 (수동 우선)
    │                 ├── <PairingGrid> → pairingCategories
    │                 ├── <textarea> → comment (선택)
    │                 ├── <input number> → purchasePrice (선택)
    │                 ├── <input date> → visitDate (선택, 기본값: 오늘)
    │                 ├── 식당 연결 UI → linkedRestaurantId (선택)
    │                 └── <RecordSaveBar variant="wine"> → handleSave()
    │
    └── step: 'success'
          └── <RecordSuccess>
                ├── "내용 추가하기" → router.push(상세페이지)
                ├── "한 곳 더 추가" → step: 'form' 리셋
                └── "홈으로" → router.push('/')
```

---

## 검증 체크리스트

### 기능 검증

- [ ] 식당 기록 화면: 사분면 + 씬태그 + 코멘트 + 동행자 + 가격 + 와인 연결 모두 렌더링
- [ ] 와인 기록 화면: 사분면 + 아로마 + 구조평가 + 페어링 + 코멘트 + 가격 + 식당 연결 모두 렌더링
- [ ] Phase 1 필수 항목 미충족 시 저장 버튼 비활성화
- [ ] Phase 1 필수 항목 충족 시 Phase 2 항목 비어 있어도 저장 가능
- [ ] 저장 완료 → 성공 화면 전환 (step: 'form' → 'success')
- [ ] 성공 화면 3 버튼 동작: "내용 추가하기" → 상세, "한 곳 더 추가" → 폼 리셋, "홈으로" → `/`
- [ ] 성공 화면 food/wine 테마 분기: 체크 아이콘 색상, Primary 버튼 색상
- [ ] `record-nav` 뒤로/닫기 버튼 동작
- [ ] 저장 바 sticky 동작, 안전 영역 포함
- [ ] 와인 autoScore 계산: `clamp(1, 100, 50 + complexityBonus(activeRingCount) + finish*0.1 + balance*0.15)`
- [ ] 수동 만족도 조정 시 autoScore와 satisfaction 독립 저장

### 데이터 검증

- [ ] records INSERT: 모든 필수 필드 (user_id, target_id, target_type, status, axis_x, axis_y, satisfaction) 저장
- [ ] records INSERT: 선택 필드 (comment, companions, total_price 등) NULL 허용
- [ ] record_photos INSERT: 사진 있으면 photoRepo.savePhotos()로 record_id FK + url + order_index 저장
- [ ] 사진 업로드 실패 시 record는 유지되고 성공 화면에 photoError 메시지 표시 (DEC-007)
- [ ] wishlists UPDATE: 동일 target의 기존 찜이 있으면 `is_visited = true`
- [ ] status = `'rated'` 저장 확인
- [ ] 와인: wine_status = `'tasted'` 저장 확인
- [ ] axis_x, axis_y: 0~100 범위 (`DECIMAL(5,2)`)
- [ ] satisfaction: 1~100 범위 (`INT`)
- [ ] scene: VARCHAR(20), 6종 중 1개 (식당만)
- [ ] pairing_categories: TEXT[], WSET 8카테고리 키값 (와인만)
- [ ] aroma_labels: TEXT[], 15개 섹터 이름 중 선택된 것 (와인만)
- [ ] comment: VARCHAR(200) 초과 시 잘림 방지

### UI 검증

- [ ] 360px 뷰포트에서 레이아웃 깨짐 없음
- [ ] 터치 타겟 44x44px 준수 (nav 버튼, 저장 버튼)
- [ ] 디자인 토큰 사용 (하드코딩 색상 없음)
- [ ] food/wine 컬러 분리: `--accent-food` / `--accent-wine`
- [ ] 스크롤 시 저장 바 항상 하단에 고정
- [ ] 목업(`prototype/01_home.html`)과 1:1 매칭
