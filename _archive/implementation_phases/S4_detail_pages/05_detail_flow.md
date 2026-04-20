# S4-T05: 상세↔기록 플로우 연결

> 상세 페이지 FAB(+) → 기록 플로우 진입 (대상 pre-selected)
> 재방문/재시음 시 이전 좌표 반투명 표시
> 카드→상세→기록→상세 순환 네비게이션

---

## SSOT 출처

| 문서 | 섹션 | 용도 |
|------|------|------|
| `pages/02_RESTAURANT_DETAIL.md` | §4 FAB, §5 뷰 모드 | FAB 동작 + 컨텍스트 인식 |
| `pages/03_WINE_DETAIL.md` | FAB 섹션 | 와인 FAB 동작 |
| `pages/05_RECORD_FLOW.md` | 통합 기록 화면 | 기록 플로우 진입점 |
| `systems/RATING_ENGINE.md` | §6 배경 레퍼런스 | 이전 기록 반투명 참조 점 |
| `pages/00_IA.md` | 네비게이션 흐름 | 순환 경로 정의 |

---

## 선행 조건

- S3 완료 (검색→기록 연결 필요)
- S4-T01~T04 완료 (상세 페이지 + 기록 상세 + 찜 CRUD)

---

## 구현 범위

### 1. 상세 FAB(+) → 기록 플로우 진입

**식당 상세 FAB:**

| 상태 | FAB 동작 |
|------|---------|
| 내 기록 있음 | 식당 선택 스킵 → 바로 사분면 평가 → "새 방문 추가" |
| 미방문 | 식당 선택 스킵 → 바로 사분면 평가 → "첫 기록 남기기" |

**와인 상세 FAB:**

| 상태 | FAB 동작 |
|------|---------|
| 기록 있음 | 와인 선택 스킵 → 바로 사분면 평가 → "새 시음 추가" |
| 기록 없음 | 와인 선택 스킵 → 바로 사분면 평가 → "첫 기록 남기기" |

**네비게이션 구현:**

```typescript
// presentation/containers/restaurant-detail-container.tsx (또는 wine)

function handleAddRecord() {
  const meta = [restaurant?.genre, restaurant?.area].filter(Boolean).join(' · ')
  router.push(
    `/record?type=restaurant&targetId=${restaurant.id}&name=${encodeURIComponent(restaurant.name)}&meta=${encodeURIComponent(meta)}&from=detail`
  )
  // 기록 플로우는 targetId 파라미터를 감지하면
  // 검색/선택 단계를 스킵하고 바로 사분면 평가로 진입
}
```

**기록 플로우 진입 파라미터:**

```typescript
// URL 쿼리 파라미터로 전달 (searchParams)
interface RecordFlowQueryParams {
  /** 'restaurant' | 'wine' */
  type: 'restaurant' | 'wine'
  /** 대상 ID — 있으면 검색 단계 스킵 */
  targetId: string
  /** 대상 이름 (UI 표시용) */
  name: string
  /** 대상 메타 정보 (장르·지역 등, UI 표시용) */
  meta: string
  /** 진입 경로 (기록 완료 후 돌아갈 페이지) */
  from: 'detail' | 'search' | 'home' | 'camera' | 'record_detail'
  /** 수정 모드일 때 기존 기록 ID */
  edit?: string
}
```

---

### 2. 재방문/재시음: 이전 좌표 반투명 표시

기록 플로우의 사분면 평가 화면에서, 같은 대상에 대한 이전 기록들을 반투명 참조 점으로 표시.

```typescript
interface QuadrantRecordViewProps {
  /** 현재 입력 중인 점 (드래그 가능) */
  currentDot: { axisX: number; axisY: number; satisfaction: number }
  /** 이전 기록 좌표 (읽기 전용, 반투명) */
  previousDots: Array<{
    recordId: string
    axisX: number
    axisY: number
    satisfaction: number
    visitDate: string    // 라벨 표시용
  }>
  targetType: 'restaurant' | 'wine'
}
```

**이전 기록 참조 점 스타일 (RATING_ENGINE §6):**

| 속성 | 값 |
|------|---|
| opacity | 0.3 (30%) |
| 숫자 | 9px, weight 700, white |
| 이름 라벨 | 9px, `var(--text-hint)`, 점 아래 배치 |
| 포인터 이벤트 | `pointer-events: none` (클릭 불가) |
| 크기 | 만족도 기반 (14/20/26/36/48px) |
| 최대 표시 | 8~12개 |

**데이터 소스:**

```typescript
// application/hooks/use-create-record.ts 확장

// targetId가 있으면 이전 기록 조회
const previousRecords = await recordRepo.findByUserAndTarget(userId, targetId, targetType)
// axisX/axisY가 NULL인 기록은 제외 (checked 상태)
const previousDots = previousRecords
  .filter(r => r.axisX !== null && r.axisY !== null && r.id !== editRecordId)
  .map(r => ({
    recordId: r.id,
    axisX: r.axisX!,
    axisY: r.axisY!,
    satisfaction: r.satisfaction ?? 50,
    visitDate: r.visitDate ?? '',
  }))
```

---

### 3. 카드→상세→기록→상세 순환 네비게이션

**전체 순환 경로:**

```
홈 카드
  │ 탭
  ▼
식당/와인 상세 (/restaurants/[id] 또는 /wines/[id])
  │ FAB(+)                      │ 타임라인 아이템 탭
  ▼                              ▼
기록 플로우 (/record)           기록 상세 (/records/[id])
  │ 저장 완료                      │ 수정하기
  ▼                              ▼
식당/와인 상세 (돌아옴)          기록 플로우 (수정 모드)
                                  │ 저장 완료
                                  ▼
                                기록 상세 (돌아옴)
```

**기록 완료 후 네비게이션:**

```typescript
// 기록 저장 완료 시
function onRecordSaved(record: DiningRecord) {
  const from = searchParams.get('from')

  if (from === 'detail') {
    // 상세 페이지로 돌아감 (새 기록이 타임라인에 반영)
    if (record.targetType === 'restaurant') {
      router.replace(`/restaurants/${record.targetId}`)
    } else {
      router.replace(`/wines/${record.targetId}`)
    }
  } else {
    // 기본: 홈으로
    router.replace('/')
  }
}
```

**수정 완료 후 네비게이션:**

```typescript
// 기록 수정 저장 완료 시
function onRecordUpdated(record: DiningRecord) {
  // 기록 상세로 돌아감
  router.replace(`/records/${record.id}`)
}
```

---

### 4. 기록 상세 → 대상 상세 링크

기록 상세 페이지에서 대상명 또는 사분면 탭 시 해당 상세 페이지로 이동.

```typescript
// record-detail-container.tsx

function handleTargetTap() {
  if (record.targetType === 'restaurant') {
    router.push(`/restaurants/${record.targetId}?from=record`)
  } else {
    router.push(`/wines/${record.targetId}?from=record`)
  }
}
```

**from=record 표시:**
- 뒤로 버튼 라벨: "기록"
- 뒤로 이동: `router.back()` (기록 상세로)

---

### 5. 수정 모드 진입 (기록 상세 → 기록 플로우)

```typescript
// record-detail-container.tsx → RecordActions onEdit

function handleEdit() {
  router.push(
    `/record?type=${record.targetType}&targetId=${record.targetId}&edit=${record.id}&from=record_detail`
  )
}
```

**기록 플로우에서 editRecordId 감지 시:**
1. 기존 기록 데이터 로드 (`recordRepo.findById(editRecordId)`)
2. 모든 필드 pre-fill (S4-T03 수정 모드 참조)
3. 저장 버튼 텍스트: "수정 완료" (새 기록: "기록 완료")
4. 저장 시 `records UPDATE` (새 기록: `records INSERT`)

---

## 네비게이션 매트릭스

| 출발 | 도착 | 트리거 | 파라미터 |
|------|------|--------|---------|
| 식당 상세 | 기록 플로우 | FAB(+) 탭 | `type=restaurant`, `targetId`, `name`, `meta`, `from=detail` |
| 와인 상세 | 기록 플로우 | FAB(+) 탭 | `type=wine`, `targetId`, `name`, `meta`, `from=detail` |
| 식당/와인 상세 | 기록 상세 | 타임라인 아이템 탭 | --- |
| 기록 상세 | 식당/와인 상세 | 대상명 탭 / 사분면 탭 | `from=record` |
| 기록 상세 | 기록 플로우 (수정) | 수정하기 버튼 | `type`, `targetId`, `edit=recordId`, `from=record_detail` |
| 기록 상세 | 와인 상세 | 연결 와인 탭 | `from=record` |
| 기록 상세 | 식당 상세 | 연결 식당 탭 | `from=record` |
| 기록 플로우 | 식당/와인 상세 | 저장 완료 (from=detail) | `router.replace` |
| 기록 플로우 | 기록 상세 | 수정 완료 (from=record_detail) | `router.replace` |
| 기록 플로우 | 홈 | 저장 완료 (기본) | `router.replace('/')` |

---

## 상태 전달 방식

URL 쿼리 파라미터로 전달. 전역 상태 관리 불필요.

```
/record?type=restaurant&targetId=uuid&name=식당명&meta=장르·지역&from=detail
/record?type=wine&targetId=uuid&name=와인명&meta=타입·산지&edit=uuid&from=record_detail
```

**기록 플로우 진입 판별 로직:**

```typescript
// containers/record-flow-container.tsx

const searchParams = useSearchParams()
const targetType = (searchParams.get('type') ?? 'restaurant') as RecordTargetType
const targetId = searchParams.get('targetId') ?? ''
const targetName = searchParams.get('name') ?? ''
const targetMeta = searchParams.get('meta') ?? ''
const editRecordId = searchParams.get('edit')
const from = searchParams.get('from')

if (targetId) {
  // 대상 이미 선택됨 → 검색 단계 스킵 → 사분면 평가 직행
  if (editRecordId) {
    // 수정 모드: 기존 기록 pre-fill
  } else {
    // 신규 기록: 빈 사분면
  }
} else {
  // 대상 미선택 → 검색/카메라부터 시작 (S3 플로우)
}
```

---

## 뒤로가기 라벨 매핑 (from 파라미터)

| from 값 | 뒤로 라벨 | 뒤로 경로 |
|---------|----------|----------|
| `detail` | "상세" | `router.back()` |
| `record_detail` | "기록" | `router.back()` |
| `search` | "검색" | `/` (검색 상태) |
| `home` | "홈" | `/` |
| `camera` | "카메라" | `router.back()` |
| `record` | "기록" | `router.back()` |
| (없음) | "홈" | `/` |

---

## 검증 포인트

```
□ 식당 상세 FAB(+) → 기록 플로우 → 사분면 직행 (검색 스킵)
□ 와인 상세 FAB(+) → 기록 플로우 → 사분면 직행 (검색 스킵)
□ 재방문: 이전 기록 참조 점 표시 (opacity 0.3, pointer-events none)
□ 기록 저장 후 → 상세 페이지로 복귀 (새 기록 반영)
□ 기록 상세 → 수정 → 기록 플로우(pre-fill) → 저장 → 기록 상세 복귀
□ 기록 상세 → 대상명 탭 → 상세 페이지 → 뒤로 → 기록 상세
□ 기록 상세 → 연결 와인/식당 탭 → 해당 상세 페이지
□ 홈 카드 → 상세 → FAB(+) → 기록 → 상세 → 홈 (전체 순환)
□ router.back() 히스토리 스택 정상 동작
```
