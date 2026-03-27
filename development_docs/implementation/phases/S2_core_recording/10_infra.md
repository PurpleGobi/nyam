# 2.10: Infrastructure 연결

> records / record_photos 도메인을 Supabase 구현체로 연결하고, DI 등록 + application hooks를 완성한다.

---

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `systems/DATA_MODEL.md` | records 테이블 (§2), record_photos 테이블, wishlists 테이블 |
| `implementation/shared/CLEAN_ARCH_PATTERN.md` | 레이어별 규칙, DI 패턴, 파일 네이밍 |
| `CLAUDE.md` | R1~R5 클린 아키텍처 규칙, DI 패턴 |

---

## 선행 조건

| 태스크 | 이유 |
|--------|------|
| 2.1 domain 엔티티 | `DiningRecord`, `RecordPhoto`, `RecordRepository` 인터페이스 정의 완료 |
| 2.9 기록 저장 플로우 | 플로우에서 호출하는 repository 메서드 시그니처 확정 |
| S1 Foundation | Supabase 클라이언트 (`infrastructure/supabase/client.ts`), 인증 시스템 |

---

## 구현 범위

### 포함

- `SupabaseRecordRepository` 구현 (infrastructure)
- `useCreateRecord` hook (application)
- `useRecords` hook (application)
- `shared/di/container.ts` 업데이트
- snake_case ↔ camelCase 매핑 함수

### 제외

- XP 적립 로직 → S6
- 검색/목록 경로의 `status: 'checked'` INSERT → S3
- 사진 업로드 (Supabase Storage) → 2.8에서 구현 완료, 여기서는 URL만 받음

---

## 상세 구현 지침

### 1. 파일 구조

```
src/
├── domain/
│   ├── entities/
│   │   └── record.ts                          # 2.1에서 생성 완료
│   └── repositories/
│       └── record-repository.ts               # 2.1에서 생성 완료
├── infrastructure/
│   └── repositories/
│       └── supabase-record-repository.ts      # 이 태스크에서 생성
├── application/
│   └── hooks/
│       ├── use-create-record.ts               # 이 태스크에서 생성
│       └── use-records.ts                     # 이 태스크에서 생성
└── shared/
    └── di/
        └── container.ts                       # 이 태스크에서 업데이트
```

### 2. domain/repositories/record-repository.ts (참조 — 2.1에서 정의)

> `RecordRepository` 인터페이스는 01_domain.md에서 정의된 10개 메서드를 구현한다.
> 추가로 필요한 메서드가 있으면 domain/repositories/record-repository.ts에 먼저 추가한 후 구현한다.

```typescript
export class SupabaseRecordRepository implements RecordRepository {
  // 기록 CRUD
  async create(input: CreateRecordInput): Promise<DiningRecord> { ... }
  async findById(id: string): Promise<DiningRecord | null> { ... }
  async findByUserId(userId: string, targetType?: RecordTargetType): Promise<DiningRecord[]> { ... }
  async findByUserAndTarget(userId: string, targetId: string): Promise<DiningRecord[]> { ... }
  async update(id: string, data: Partial<DiningRecord>): Promise<DiningRecord> { ... }
  async delete(id: string): Promise<void> { ... }
  // 사진
  async addPhotos(recordId: string, photoUrls: string[]): Promise<RecordPhoto[]> { ... }
  async findPhotosByRecordId(recordId: string): Promise<RecordPhoto[]> { ... }
  async deletePhoto(id: string): Promise<void> { ... }
  // 찜 연동
  async markWishlistVisited(userId: string, targetId: string, targetType: RecordTargetType): Promise<void> { ... }
}
```

### 3. infrastructure/repositories/supabase-record-repository.ts

#### 3-1. 클래스 선언

```typescript
import type { RecordRepository, RecordTargetType } from '@/domain/repositories/record-repository'
import type { DiningRecord, RecordPhoto, CreateRecordInput } from '@/domain/entities/record'
import { createClient } from '@/infrastructure/supabase/client'

export class SupabaseRecordRepository implements RecordRepository {
  private get supabase() {
    return createClient()
  }

  // ... 메서드 구현
}
```

`implements RecordRepository` 필수 — R2 검증 대상.

#### 3-2. snake_case ↔ camelCase 매핑

**DB → Domain (`mapDbToRecord`):**

```typescript
type RecordRow = Database['public']['Tables']['records']['Row']

function mapDbToRecord(row: RecordRow): DiningRecord {
  return {
    id: row.id,
    userId: row.user_id,
    targetId: row.target_id,
    targetType: row.target_type as RecordTargetType,
    status: row.status,
    wineStatus: row.wine_status,
    cameraMode: row.camera_mode,
    ocrData: row.ocr_data,
    axisX: row.axis_x ? Number(row.axis_x) : null,
    axisY: row.axis_y ? Number(row.axis_y) : null,
    satisfaction: row.satisfaction,
    scene: row.scene,
    aromaRegions: row.aroma_regions,
    aromaLabels: row.aroma_labels,
    aromaColor: row.aroma_color,
    complexity: row.complexity,
    finish: row.finish ? Number(row.finish) : null,
    balance: row.balance ? Number(row.balance) : null,
    autoScore: row.auto_score,
    comment: row.comment,
    menuTags: row.menu_tags,
    pairingCategories: row.pairing_categories,
    tips: row.tips,
    companions: row.companions,
    companionCount: row.companion_count,
    totalPrice: row.total_price,
    purchasePrice: row.purchase_price,
    visitDate: row.visit_date,
    mealTime: row.meal_time,
    linkedRestaurantId: row.linked_restaurant_id,
    linkedWineId: row.linked_wine_id,
    hasExifGps: row.has_exif_gps,
    isExifVerified: row.is_exif_verified,
    recordQualityXp: row.record_quality_xp,
    scoreUpdatedAt: row.score_updated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
```

**Domain → DB (`mapRecordToDb`):**

```typescript
function mapRecordToDb(input: CreateRecordInput): Database['public']['Tables']['records']['Insert'] {
  return {
    user_id: input.userId,
    target_id: input.targetId,
    target_type: input.targetType,
    status: input.status ?? 'rated',
    wine_status: input.wineStatus,
    camera_mode: input.cameraMode,
    ocr_data: input.ocrData,
    axis_x: input.axisX,
    axis_y: input.axisY,
    satisfaction: input.satisfaction,
    scene: input.scene,
    aroma_regions: input.aromaRegions,
    aroma_labels: input.aromaLabels,
    aroma_color: input.aromaColor,
    complexity: input.complexity,
    finish: input.finish,
    balance: input.balance,
    auto_score: input.autoScore,
    comment: input.comment,
    menu_tags: input.menuTags,
    pairing_categories: input.pairingCategories,
    tips: input.tips,
    companions: input.companions,
    companion_count: input.companionCount,
    total_price: input.totalPrice,
    purchase_price: input.purchasePrice,
    visit_date: input.visitDate ?? new Date().toISOString().split('T')[0],
    meal_time: input.mealTime,
    linked_restaurant_id: input.linkedRestaurantId,
    linked_wine_id: input.linkedWineId,
    has_exif_gps: input.hasExifGps ?? false,
    is_exif_verified: input.isExifVerified ?? false,
    record_quality_xp: input.recordQualityXp ?? 0,
    score_updated_at: input.scoreUpdatedAt ?? null,
  }
}
```

**RecordPhoto 매핑:**

```typescript
type PhotoRow = Database['public']['Tables']['record_photos']['Row']

function mapDbToPhoto(row: PhotoRow): RecordPhoto {
  return {
    id: row.id,
    recordId: row.record_id,
    url: row.url,
    orderIndex: row.order_index,
    createdAt: row.created_at,
  }
}
```

#### 3-3. CRUD 메서드 구현

**create:**

```typescript
async create(input: CreateRecordInput): Promise<DiningRecord> {
  const dbData = mapRecordToDb(input)
  const { data, error } = await this.supabase
    .from('records')
    .insert(dbData)
    .select()
    .single()

  if (error) throw new Error(`Record 생성 실패: ${error.message}`)
  return mapDbToRecord(data)
}
```

**addPhotos:**

```typescript
async addPhotos(recordId: string, photoUrls: string[]): Promise<RecordPhoto[]> {
  const rows = photoUrls.map((url, index) => ({
    record_id: recordId,
    url,
    order_index: index,
  }))

  const { data, error } = await this.supabase
    .from('record_photos')
    .insert(rows)
    .select()

  if (error) throw new Error(`사진 저장 실패: ${error.message}`)
  return data.map(mapDbToPhoto)
}
```

**findById:**

```typescript
async findById(id: string): Promise<DiningRecord | null> {
  const { data, error } = await this.supabase
    .from('records')
    .select()
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null  // not found
    throw new Error(`Record 조회 실패: ${error.message}`)
  }
  return mapDbToRecord(data)
}
```

**findByUserId:**

```typescript
async findByUserId(
  userId: string,
  targetType?: RecordTargetType,
): Promise<DiningRecord[]> {
  let query = this.supabase
    .from('records')
    .select()
    .eq('user_id', userId)

  if (targetType) {
    query = query.eq('target_type', targetType)
  }

  // 기본 정렬: visit_date DESC (인터페이스에 options 파라미터 없으므로 고정)
  query = query.order('visit_date', { ascending: false })

  const { data, error } = await query
  if (error) throw new Error(`Record 목록 조회 실패: ${error.message}`)
  return data.map(mapDbToRecord)
}
```

**findByUserAndTarget:**

```typescript
async findByUserAndTarget(userId: string, targetId: string): Promise<DiningRecord[]> {
  const { data, error } = await this.supabase
    .from('records')
    .select()
    .eq('user_id', userId)
    .eq('target_id', targetId)
    .order('visit_date', { ascending: false })

  if (error) throw new Error(`Target 기록 조회 실패: ${error.message}`)
  return data.map(mapDbToRecord)
}
```

**findPhotosByRecordId:**

```typescript
async findPhotosByRecordId(recordId: string): Promise<RecordPhoto[]> {
  const { data, error } = await this.supabase
    .from('record_photos')
    .select()
    .eq('record_id', recordId)
    .order('order_index', { ascending: true })

  if (error) throw new Error(`사진 조회 실패: ${error.message}`)
  return data.map(mapDbToPhoto)
}
```

**update:**

```typescript
async update(id: string, data: Partial<DiningRecord>): Promise<DiningRecord> {
  const dbData: globalThis.Record<string, unknown> = {}

  // 전달된 필드만 snake_case로 변환
  if (data.axisX !== undefined) dbData.axis_x = data.axisX
  if (data.axisY !== undefined) dbData.axis_y = data.axisY
  if (data.satisfaction !== undefined) dbData.satisfaction = data.satisfaction
  if (data.scene !== undefined) dbData.scene = data.scene
  if (data.comment !== undefined) dbData.comment = data.comment
  if (data.companions !== undefined) dbData.companions = data.companions
  if (data.companionCount !== undefined) dbData.companion_count = data.companionCount
  if (data.totalPrice !== undefined) dbData.total_price = data.totalPrice
  if (data.purchasePrice !== undefined) dbData.purchase_price = data.purchasePrice
  if (data.aromaRegions !== undefined) dbData.aroma_regions = data.aromaRegions
  if (data.aromaLabels !== undefined) dbData.aroma_labels = data.aromaLabels
  if (data.aromaColor !== undefined) dbData.aroma_color = data.aromaColor
  if (data.complexity !== undefined) dbData.complexity = data.complexity
  if (data.finish !== undefined) dbData.finish = data.finish
  if (data.balance !== undefined) dbData.balance = data.balance
  if (data.autoScore !== undefined) dbData.auto_score = data.autoScore
  if (data.pairingCategories !== undefined) dbData.pairing_categories = data.pairingCategories
  if (data.linkedWineId !== undefined) dbData.linked_wine_id = data.linkedWineId
  if (data.linkedRestaurantId !== undefined) dbData.linked_restaurant_id = data.linkedRestaurantId
  if (data.status !== undefined) dbData.status = data.status

  dbData.updated_at = new Date().toISOString()

  const { data: updated, error } = await this.supabase
    .from('records')
    .update(dbData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Record 업데이트 실패: ${error.message}`)
  return mapDbToRecord(updated)
}
```

**markWishlistVisited:**

```typescript
async markWishlistVisited(
  userId: string,
  targetId: string,
  targetType: RecordTargetType
): Promise<void> {
  // 찜이 없으면 아무 것도 안 함 (에러 아님)
  await this.supabase
    .from('wishlists')
    .update({ is_visited: true })
    .eq('user_id', userId)
    .eq('target_id', targetId)
    .eq('target_type', targetType)
}
```

**delete:**

```typescript
async delete(id: string): Promise<void> {
  const { error } = await this.supabase
    .from('records')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Record 삭제 실패: ${error.message}`)
  // record_photos는 ON DELETE CASCADE로 자동 삭제
}
```

**deletePhoto:**

```typescript
async deletePhoto(photoId: string): Promise<void> {
  const { error } = await this.supabase
    .from('record_photos')
    .delete()
    .eq('id', photoId)

  if (error) throw new Error(`사진 삭제 실패: ${error.message}`)
}
```

### 4. shared/di/container.ts 업데이트

```typescript
// 기존 코드 아래에 추가

import { SupabaseRecordRepository } from '@/infrastructure/repositories/supabase-record-repository'
import type { RecordRepository } from '@/domain/repositories/record-repository'

export const recordRepository: RecordRepository = new SupabaseRecordRepository()
```

- `shared/di/container.ts`는 유일하게 infrastructure를 import하는 조합 루트
- 타입은 `RecordRepository` (domain 인터페이스)로 좁힘 → R4 준수

### 5. application/hooks/use-create-record.ts

```typescript
'use client'

import { useState, useCallback } from 'react'
import type { DiningRecord, CreateRecordInput } from '@/domain/entities/record'
import type { RecordRepository } from '@/domain/repositories/record-repository'

export function useCreateRecord(repository: RecordRepository) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRecord = useCallback(async (input: CreateRecordInput): Promise<DiningRecord> => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. records INSERT
      const record = await repository.create(input)

      // 2. record_photos INSERT
      if ('photoUrls' in input && input.photoUrls && input.photoUrls.length > 0) {
        await repository.addPhotos(record.id, input.photoUrls)
      }

      // 3. wishlists UPDATE
      await repository.markWishlistVisited(
        input.userId,
        input.targetId,
        input.targetType
      )

      // 4. XP 적립 — S6에서 구현
      // stub: record.recordQualityXp는 이미 0으로 저장됨

      return record
    } catch (e) {
      const message = e instanceof Error ? e.message : '기록 저장에 실패했습니다'
      setError(message)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [repository])

  return { createRecord, isLoading, error }
}
```

**호출 패턴 (container에서):**

```typescript
import { recordRepository } from '@/shared/di/container'
import { useCreateRecord } from '@/application/hooks/use-create-record'

// container 내부
const { createRecord, isLoading, error } = useCreateRecord(recordRepository)
```

- `useCreateRecord`는 `RecordRepository` 인터페이스에만 의존 → R3 준수
- container가 `shared/di`에서 구현체를 주입 → R4 준수

### 6. application/hooks/use-records.ts

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordRepository, RecordTargetType } from '@/domain/repositories/record-repository'

interface UseRecordsOptions {
  limit?: number
  offset?: number
  orderBy?: 'visit_date' | 'created_at'
  order?: 'asc' | 'desc'
}

export function useRecords(
  repository: RecordRepository,
  userId: string,
  targetType?: RecordTargetType,
  options?: UseRecordsOptions
) {
  const [records, setRecords] = useState<DiningRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await repository.findByUserId(userId, targetType)
      setRecords(data)
    } catch (e) {
      const message = e instanceof Error ? e.message : '기록 조회에 실패했습니다'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [repository, userId, targetType, options?.limit, options?.offset, options?.orderBy, options?.order])

  useEffect(() => {
    fetch()
  }, [fetch])

  const refetch = useCallback(() => {
    fetch()
  }, [fetch])

  return { records, isLoading, error, refetch }
}
```

**호출 패턴 (container에서):**

```typescript
import { recordRepository } from '@/shared/di/container'
import { useRecords } from '@/application/hooks/use-records'

// container 내부
const { records, isLoading, error, refetch } = useRecords(
  recordRepository,
  currentUser.id,
  'restaurant',
  { limit: 20, orderBy: 'visit_date', order: 'desc' }
)
```

### 7. 에러 처리 규칙

| 에러 유형 | 처리 |
|----------|------|
| Supabase 네트워크 에러 | `throw new Error(error.message)` → hook의 error state에 저장 |
| RLS 거부 | `error.code === '42501'` → "권한이 없습니다" |
| not found (`PGRST116`) | `findById` → `null` 반환, 다른 메서드 → throw |
| 유효성 검증 실패 | application hook에서 throw 전에 입력값 검증 |
| 중복 키 | `error.code === '23505'` → "이미 존재하는 기록입니다" |

**application hook에서의 입력 검증 (create 전):**

```typescript
function validateRecordInput(input: CreateRecordInput): void {
  if (!input.targetId) throw new Error('대상을 선택해주세요')
  if (!input.targetType) throw new Error('기록 유형을 선택해주세요')

  if (input.axisX !== undefined && (input.axisX < 0 || input.axisX > 100)) {
    throw new Error('사분면 X축 값은 0~100이어야 합니다')
  }
  if (input.axisY !== undefined && (input.axisY < 0 || input.axisY > 100)) {
    throw new Error('사분면 Y축 값은 0~100이어야 합니다')
  }
  if (input.satisfaction !== undefined && (input.satisfaction < 1 || input.satisfaction > 100)) {
    throw new Error('만족도는 1~100이어야 합니다')
  }
  if (input.comment && input.comment.length > 200) {
    throw new Error('코멘트는 200자 이내여야 합니다')
  }
}
```

---

## 목업 매핑

이 태스크는 직접적인 UI를 생성하지 않는다. 목업 매핑은 해당 없음.

data layer 기준으로 아래 화면들이 이 infrastructure에 의존한다:

| 화면 | 사용하는 hook | 사용하는 repository 메서드 |
|------|-------------|--------------------------|
| 기록 저장 플로우 (2.9) | `useCreateRecord` | `create`, `addPhotos`, `markWishlistVisited` |
| 홈 기록 목록 (S5) | `useRecords` | `findByUserId` |
| 기록 상세 (S4) | `useRecords` | `findById`, `findPhotosByRecordId` |
| 상세 페이지 사분면 참조점 (S4) | `useRecords` | `findByUserId`, `findByUserAndTarget` |
| 기록 수정 (S4) | `useCreateRecord` 확장 | `update` |

---

## 데이터 흐름

```
[presentation/containers]
    │
    ├── import { recordRepository } from '@/shared/di/container'    ← 타입: RecordRepository (domain)
    ├── import { useCreateRecord } from '@/application/hooks/...'
    ├── import { useRecords } from '@/application/hooks/...'
    │
    ├── useCreateRecord(recordRepository)
    │     │
    │     └── recordRepository.create(input)
    │           │
    │           └── [SupabaseRecordRepository]
    │                 ├── mapRecordToDb(input)         ← camelCase → snake_case
    │                 ├── supabase.from('records').insert().select().single()
    │                 └── mapDbToRecord(data)           ← snake_case → camelCase
    │
    └── useRecords(recordRepository, userId, targetType)
          │
          └── recordRepository.findByUserId(userId, targetType)
                │
                └── [SupabaseRecordRepository]
                      ├── supabase.from('records').select().eq(...).order(...)
                      └── data.map(mapDbToRecord)

[의존성 방향]
  app → presentation → application → domain ← infrastructure
                                       ↑
                               shared/di (조합 루트)
```

---

## 검증 체크리스트

### 아키텍처 검증 (R1~R5)

- [ ] R1: `grep -r "from 'react\|from '@supabase\|from 'next" src/domain/` → 결과 없음
- [ ] R2: `grep -rL "implements" src/infrastructure/repositories/` → `supabase-record-repository.ts` 포함
- [ ] R3: `grep -r "from '.*infrastructure" src/application/` → 결과 없음
- [ ] R4: `grep -r "from '@supabase\|from '.*infrastructure" src/presentation/` → 결과 없음
- [ ] `shared/di/container.ts`에서만 `SupabaseRecordRepository` import
- [ ] `useCreateRecord`, `useRecords`는 `RecordRepository` 인터페이스만 파라미터로 받음

### 기능 검증

- [ ] `recordRepository.create()` → records 테이블에 INSERT 성공, 반환값 camelCase 확인
- [ ] `recordRepository.addPhotos()` → record_photos에 INSERT, order_index 올바른 순서
- [ ] `recordRepository.findById()` → 존재: Record 반환, 미존재: null 반환
- [ ] `recordRepository.findByUserId()` → userId + targetType 필터, 정렬 + 페이지네이션 동작
- [ ] `recordRepository.findByUserAndTarget()` → userId + targetId 필터, visit_date DESC
- [ ] `recordRepository.update()` → 전달된 필드만 업데이트, updated_at 자동 갱신
- [ ] `recordRepository.markWishlistVisited()` → 찜 있으면 `is_visited=true`, 없으면 에러 안 남
- [ ] `recordRepository.delete()` → records 삭제, record_photos CASCADE 삭제
- [ ] `recordRepository.deletePhoto()` → 단일 사진 삭제

### 타입 검증

- [ ] `mapDbToRecord`: 모든 records 테이블 컬럼 매핑 (누락 없음)
- [ ] `mapRecordToDb`: 모든 CreateRecordInput 필드 매핑 (누락 없음)
- [ ] `mapDbToPhoto`: record_photos 테이블 컬럼 매핑
- [ ] DECIMAL 컬럼 (axis_x, axis_y, finish, balance) → `Number()` 변환
- [ ] JSONB 컬럼 (aroma_regions, ocr_data) → 타입 캐스팅 없이 그대로 전달
- [ ] TEXT[] 컬럼 (aroma_labels, pairing_categories, companions) → string[] 매핑
- [ ] TypeScript strict: `any`, `as any`, `@ts-ignore`, `!` 0개

### 빌드 검증

- [ ] `pnpm build` 에러 없음
- [ ] `pnpm lint` 경고 0개
