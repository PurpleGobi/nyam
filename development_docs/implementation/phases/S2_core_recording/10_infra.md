# 2.10: Infrastructure 연결

> lists + records 2-테이블 구조를 Supabase 구현체로 연결하고, DI 등록 + application hooks를 완성한다.

---

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `systems/DATA_MODEL.md` | lists 테이블, records 테이블 (§2), record_photos 테이블 |
| `implementation/shared/CLEAN_ARCH_PATTERN.md` | 레이어별 규칙, DI 패턴, 파일 네이밍 |
| `CLAUDE.md` | R1~R5 클린 아키텍처 규칙, DI 패턴 |

---

## 선행 조건

| 태스크 | 이유 |
|--------|------|
| 2.1 domain 엔티티 | `DiningRecord`, `ListItem`, `RecordRepository` 인터페이스 정의 완료 |
| 2.9 기록 저장 플로우 | 플로우에서 호출하는 repository 메서드 시그니처 확정 |
| S1 Foundation | Supabase 클라이언트, 인증 시스템 |

---

## 구현 범위

### 포함

- `SupabaseRecordRepository` 구현 (lists + records 2-테이블)
- `useCreateRecord` hook (application)
- `useRecords` + `useRecordsWithTarget` hook (application)
- `shared/di/container.ts` 업데이트
- snake_case ↔ camelCase 매핑 함수

### 제외

- XP 적립 로직 → S6
- 사진 업로드 (Supabase Storage) → 2.8에서 구현 완료

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

### 2. `SupabaseRecordRepository` 구현

**2-테이블 구조**: lists (사용자×대상 관계) + records (개별 방문/시음 기록)

```typescript
export class SupabaseRecordRepository implements RecordRepository {
  // ─── List 메서드 ───
  async findOrCreateList(userId, targetId, targetType, status): Promise<ListItem>
  async updateListStatus(listId, status): Promise<void>
  async findListsByUser(userId, targetType, status?): Promise<ListItem[]>
  async findListByUserAndTarget(userId, targetId, targetType): Promise<ListItem | null>
  async deleteList(listId): Promise<void>

  // ─── Record 메서드 ───
  async create(input): Promise<DiningRecord>    // 내부: findOrCreateList → records INSERT
  async findById(id): Promise<DiningRecord | null>
  async findByUserId(userId, targetType?): Promise<DiningRecord[]>
  async findByUserIdWithTarget(userId, targetType?): Promise<RecordWithTarget[]>
  async findByUserAndTarget(userId, targetId): Promise<DiningRecord[]>
  async update(id, data): Promise<DiningRecord>
  async delete(id): Promise<void>

  // ─── 사진 ───
  async findPhotosByRecordId(recordId): Promise<RecordPhoto[]>
  async deletePhoto(id): Promise<void>
}
```

**create() 내부 시퀀스**:
1. `findOrCreateList()` — lists upsert
2. wishlist → visited/tasted 승격 (기존 찜이 있으면)
3. records INSERT (list_id FK 포함)

**findByUserIdWithTarget()**: records + restaurants/wines JOIN + record_photos 첫 사진 + follows 기반 source 태깅

#### 매핑 함수

**mapDbToRecord**: records 테이블 → DiningRecord
- 아로마: `aroma_primary`, `aroma_secondary`, `aroma_tertiary` → 배열
- 새 필드: `list_id` → `listId`, `intensity` → `intensity`, `private_note` → `privateNote`

**mapDbToListItem**: lists 테이블 → ListItem

**mapDbToPhoto**: record_photos 테이블 → RecordPhoto (isPublic 포함)

### 3. application/hooks/use-create-record.ts

```typescript
export function useCreateRecord() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRecord = useCallback(async (input: CreateRecordInput): Promise<DiningRecord> => {
    // 입력 검증 (validateRecordInput)
    // recordRepo.create(input) — lists upsert + records INSERT
    // 에러 처리
  }, [])

  return { createRecord, isLoading, error }
}
```

**기존 설계 대비 변경**: `markWishlistVisited()` 별도 호출 제거 → `create()` 내부에서 lists 상태 승격 처리.

### 4. application/hooks/use-records.ts

```typescript
/** 기본 records 조회 */
export function useRecords(userId: string | null, targetType?: RecordTargetType)
  → { records, isLoading, error, refetch }

/** 대상 메타데이터 포함 조회 — 홈 화면용 */
export function useRecordsWithTarget(userId: string | null, targetType?: RecordTargetType)
  → { records: RecordWithTarget[], isLoading, error, refetch }
```

### 5. shared/di/container.ts

```typescript
import { SupabaseRecordRepository } from '@/infrastructure/repositories/supabase-record-repository'
import type { RecordRepository } from '@/domain/repositories/record-repository'
export const recordRepo: RecordRepository = new SupabaseRecordRepository()
```

---

## 검증 체크리스트

### 아키텍처 검증 (R1~R5)

- [ ] R1: domain에 React/Supabase/Next import 없음
- [ ] R2: `supabase-record-repository.ts`가 `implements RecordRepository`
- [ ] R3: application에 infrastructure 직접 import 없음
- [ ] R4: presentation에 Supabase/infrastructure 직접 import 없음
- [ ] `shared/di/container.ts`에서만 `SupabaseRecordRepository` import

### 기능 검증

- [ ] `create()` → lists upsert + records INSERT 성공
- [ ] wishlist → visited 승격 동작
- [ ] `findByUserIdWithTarget()` → 대상 메타데이터 + record_photos + source 태깅
- [ ] `update()` → 전달된 필드만 업데이트
- [ ] `delete()` → records 삭제, record_photos CASCADE 삭제
- [ ] 새 필드 매핑: listId, intensity, privateNote, aromaPrimary/Secondary/Tertiary, isPublic

### 빌드 검증

- [ ] `pnpm build` 에러 없음
- [ ] `pnpm lint` 경고 0개
