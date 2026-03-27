# 08: 사진 업로드 + Storage (Photo Upload)

> 카메라 촬영/갤러리 선택 → 리사이즈(WebP 1200px) → Supabase Storage 업로드 → record_photos 테이블 저장. 최대 10장, 순서 추적.

---

## SSOT 출처

| 문서 | 섹션 | 내용 |
|------|------|------|
| `systems/DATA_MODEL.md` | record_photos 테이블 | `id`, `record_id` (FK CASCADE), `url`, `order_index` (DEFAULT 0), `created_at` |
| `pages/05_RECORD_FLOW.md` | §9 데이터 저장 | 저장 시퀀스 2번: record_photos INSERT |
| `pages/05_RECORD_FLOW.md` | §3 Step 1 | screen-add-restaurant 카메라/앨범 UI |
| `prototype/01_home.html` | screen-nudge-photo-picker | `.photo-grid`, `.photo-grid-item`, `.photo-picker-header`, `.photo-picker-footer` |

---

## 선행 조건

- S1: DB 스키마 완료 (`record_photos` 테이블 존재)
- S1: Supabase Storage 버킷 `record-photos` 생성 + RLS 정책 설정
- S1: 인증 완료 (업로드 시 `auth.uid()` 필요)

---

## 구현 범위

### 생성할 파일

| 파일 | 레이어 | 역할 |
|------|--------|------|
| `src/domain/entities/record-photo.ts` | domain | 기존 record-photo.ts에 PendingPhoto 인터페이스와 PHOTO_CONSTANTS 상수를 **추가**한다 (인터페이스 덮어쓰기 아님) |
| `src/domain/repositories/photo-repository.ts` | domain | PhotoRepository 인터페이스 |
| `src/infrastructure/storage/image-upload.ts` | infrastructure | Supabase Storage 업로드/삭제 구현 |
| `src/infrastructure/repositories/supabase-photo-repository.ts` | infrastructure | record_photos 테이블 CRUD |
| `src/application/hooks/use-photo-upload.ts` | application | 리사이즈 + 업로드 + DB 저장 로직 훅 |
| `src/presentation/components/record/photo-picker.tsx` | presentation | 카메라/갤러리 버튼 + 미리보기 그리드 UI |

### 스코프 외

- AI 사진 분석 (OCR, 음식 인식 — S3에서 구현)
- EXIF GPS 추출 (S3에서 구현)
- 사진 편집/크롭 (Phase 2)
- 넛지 사진첩 피커 (screen-nudge-photo-picker — S5 또는 S9)

---

## 상세 구현 지침

### 1. Domain 타입

**파일**: `src/domain/entities/record-photo.ts`

```typescript
/** record_photos 테이블 엔티티 */
export interface RecordPhoto {
  id: string
  recordId: string
  url: string
  orderIndex: number
  createdAt: string
}

/** 업로드 전 클라이언트 사진 (미리보기용) */
export interface PendingPhoto {
  /** 클라이언트 임시 ID (UUID v4) */
  id: string
  /** 원본 File 객체 */
  file: File
  /** 미리보기 URL (URL.createObjectURL) */
  previewUrl: string
  /** 그리드 내 순서 (0-based) */
  orderIndex: number
  /** 업로드 상태 */
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  /** 업로드 완료 후 Storage URL */
  uploadedUrl?: string
}

/** 사진 관련 상수 */
export const PHOTO_CONSTANTS = {
  /** 기록당 최대 사진 수 */
  MAX_PHOTOS: 10,
  /** 리사이즈 최대 너비 (px) */
  MAX_WIDTH: 1200,
  /** WebP 품질 (0~1) */
  QUALITY: 0.8,
  /** 출력 MIME 타입 */
  OUTPUT_FORMAT: 'image/webp' as const,
  /** Storage 버킷명 */
  BUCKET_NAME: 'record-photos',
  /** 허용 입력 MIME 타입 */
  ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  /** 최대 파일 크기 (10MB, 리사이즈 전) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,
} as const
```

### 2. Domain Repository 인터페이스

**파일**: `src/domain/repositories/photo-repository.ts`

```typescript
import type { RecordPhoto } from '@/domain/entities/record-photo'

export interface PhotoRepository {
  /** record_photos에 INSERT (배치) */
  savePhotos(recordId: string, photos: { url: string; orderIndex: number }[]): Promise<RecordPhoto[]>
  /** record_photos에서 조회 (order_index ASC) */
  getPhotosByRecordId(recordId: string): Promise<RecordPhoto[]>
  /** record_photos에서 DELETE (단건) */
  deletePhoto(photoId: string): Promise<void>
  /** record_photos에서 DELETE (전체 — record 삭제 시 CASCADE로 처리되므로 직접 호출 드묾) */
  deletePhotosByRecordId(recordId: string): Promise<void>
}
```

### 3. Infrastructure: Storage 업로드

**파일**: `src/infrastructure/storage/image-upload.ts`

```typescript
import { createClient } from '@/infrastructure/supabase/client'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'

/**
 * 이미지를 리사이즈하여 WebP Blob으로 변환.
 * Canvas API 사용. max 1200px width, quality 0.8.
 */
export async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const { MAX_WIDTH, QUALITY, OUTPUT_FORMAT } = PHOTO_CONSTANTS

      let width = img.width
      let height = img.height

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width = MAX_WIDTH
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to create blob'))
        },
        OUTPUT_FORMAT,
        QUALITY
      )
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Supabase Storage에 이미지 업로드.
 * 경로: {userId}/{recordId}/{uuid}.webp
 * @returns 업로드된 파일의 public URL
 */
export async function uploadImage(
  userId: string,
  recordId: string,
  blob: Blob,
  fileId: string
): Promise<string> {
  const supabase = createClient()
  const path = `${userId}/${recordId}/${fileId}.webp`

  const { error } = await supabase.storage
    .from(PHOTO_CONSTANTS.BUCKET_NAME)
    .upload(path, blob, {
      contentType: PHOTO_CONSTANTS.OUTPUT_FORMAT,
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage
    .from(PHOTO_CONSTANTS.BUCKET_NAME)
    .getPublicUrl(path)

  return urlData.publicUrl
}

/**
 * Supabase Storage에서 이미지 삭제.
 * @param url - 삭제할 파일의 public URL
 */
export async function deleteImage(url: string): Promise<void> {
  const supabase = createClient()

  // URL에서 path 추출: publicUrl 형식 = .../{bucket}/{path}
  const bucketPrefix = `/${PHOTO_CONSTANTS.BUCKET_NAME}/`
  const pathStart = url.indexOf(bucketPrefix)
  if (pathStart === -1) throw new Error('Invalid storage URL')
  const path = url.substring(pathStart + bucketPrefix.length)

  const { error } = await supabase.storage
    .from(PHOTO_CONSTANTS.BUCKET_NAME)
    .remove([path])

  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}
```

### 4. Infrastructure: DB Repository

**파일**: `src/infrastructure/repositories/supabase-photo-repository.ts`

```typescript
import { createClient } from '@/infrastructure/supabase/client'
import type { PhotoRepository } from '@/domain/repositories/photo-repository'
import type { RecordPhoto } from '@/domain/entities/record-photo'

export class SupabasePhotoRepository implements PhotoRepository {
  async savePhotos(
    recordId: string,
    photos: { url: string; orderIndex: number }[]
  ): Promise<RecordPhoto[]> {
    const supabase = createClient()
    const rows = photos.map((p) => ({
      record_id: recordId,
      url: p.url,
      order_index: p.orderIndex,
    }))

    const { data, error } = await supabase
      .from('record_photos')
      .insert(rows)
      .select()

    if (error) throw new Error(`record_photos INSERT failed: ${error.message}`)
    return (data ?? []).map(mapToEntity)
  }

  async getPhotosByRecordId(recordId: string): Promise<RecordPhoto[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('record_photos')
      .select('*')
      .eq('record_id', recordId)
      .order('order_index', { ascending: true })

    if (error) throw new Error(`record_photos SELECT failed: ${error.message}`)
    return (data ?? []).map(mapToEntity)
  }

  async deletePhoto(photoId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('record_photos')
      .delete()
      .eq('id', photoId)

    if (error) throw new Error(`record_photos DELETE failed: ${error.message}`)
  }

  async deletePhotosByRecordId(recordId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('record_photos')
      .delete()
      .eq('record_id', recordId)

    if (error) throw new Error(`record_photos batch DELETE failed: ${error.message}`)
  }
}

function mapToEntity(row: Record<string, unknown>): RecordPhoto {
  return {
    id: row.id as string,
    recordId: row.record_id as string,
    url: row.url as string,
    orderIndex: row.order_index as number,
    createdAt: row.created_at as string,
  }
}
```

### 5. Application Hook

**파일**: `src/application/hooks/use-photo-upload.ts`

```typescript
import { useState, useCallback } from 'react'
import type { PendingPhoto } from '@/domain/entities/record-photo'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'

interface UsePhotoUploadReturn {
  /** 현재 사진 목록 (미리보기 + 업로드 상태 포함) */
  photos: PendingPhoto[]
  /** 파일 추가 (카메라/갤러리에서 선택한 File[]) */
  addFiles: (files: File[]) => void
  /** 사진 제거 (미리보기 삭제 + 업로드 완료된 경우 Storage 삭제) */
  removePhoto: (photoId: string) => Promise<void>
  /** 전체 업로드 실행 (recordId 확정 후 호출) */
  uploadAll: (userId: string, recordId: string) => Promise<{ url: string; orderIndex: number }[]>
  /** 업로드 진행 중 여부 */
  isUploading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 최대 장수 도달 여부 */
  isMaxReached: boolean
}
```

#### 핵심 로직

```typescript
function addFiles(files: File[]) {
  // 1. 허용 타입 필터
  const validFiles = files.filter((f) =>
    PHOTO_CONSTANTS.ACCEPTED_TYPES.includes(f.type)
  )

  // 2. 파일 크기 필터 (10MB 초과 제외)
  const sizedFiles = validFiles.filter((f) =>
    f.size <= PHOTO_CONSTANTS.MAX_FILE_SIZE
  )

  // 3. 최대 장수 제한
  const remaining = PHOTO_CONSTANTS.MAX_PHOTOS - photos.length
  if (remaining <= 0) return
  const toAdd = sizedFiles.slice(0, remaining)

  // 4. PendingPhoto 생성
  const newPhotos: PendingPhoto[] = toAdd.map((file, i) => ({
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    orderIndex: photos.length + i,
    status: 'pending' as const,
  }))

  setPhotos((prev) => [...prev, ...newPhotos])
}

async function uploadAll(userId: string, recordId: string) {
  setIsUploading(true)
  setError(null)

  const results: { url: string; orderIndex: number }[] = []

  for (const photo of photos) {
    if (photo.status === 'uploaded' && photo.uploadedUrl) {
      results.push({ url: photo.uploadedUrl, orderIndex: photo.orderIndex })
      continue
    }

    try {
      updatePhotoStatus(photo.id, 'uploading')

      // 리사이즈
      const blob = await resizeImage(photo.file)

      // Storage 업로드
      const url = await uploadImage(userId, recordId, blob, photo.id)

      updatePhotoStatus(photo.id, 'uploaded', url)
      results.push({ url, orderIndex: photo.orderIndex })
    } catch (err) {
      updatePhotoStatus(photo.id, 'error')
      setError(`사진 업로드 실패: ${photo.file.name}`)
    }
  }

  setIsUploading(false)
  return results
}

async function removePhoto(photoId: string) {
  const photo = photos.find((p) => p.id === photoId)
  if (!photo) return

  // 미리보기 URL 해제
  URL.revokeObjectURL(photo.previewUrl)

  // 업로드 완료된 경우 Storage에서도 삭제
  if (photo.status === 'uploaded' && photo.uploadedUrl) {
    await deleteImage(photo.uploadedUrl)
  }

  // 목록에서 제거 + orderIndex 재정렬
  setPhotos((prev) =>
    prev
      .filter((p) => p.id !== photoId)
      .map((p, i) => ({ ...p, orderIndex: i }))
  )
}
```

### 6. Presentation 컴포넌트

**파일**: `src/presentation/components/record/photo-picker.tsx`

```typescript
interface PhotoPickerProps {
  /** 현재 사진 목록 (usePhotoUpload에서 전달) */
  photos: PendingPhoto[]
  /** 파일 추가 콜백 */
  onAddFiles: (files: File[]) => void
  /** 사진 제거 콜백 */
  onRemovePhoto: (photoId: string) => void
  /** 업로드 진행 중 여부 */
  isUploading: boolean
  /** 최대 장수 도달 여부 */
  isMaxReached: boolean
  /** 식당/와인 테마 */
  theme: 'food' | 'wine'
}
```

#### 렌더링 구조

```
<div className="photo-picker-section">
  {/* 헤더: 사진 수 표시 */}
  <div className="rest-record-section-title">
    사진 ({photos.length}/{PHOTO_CONSTANTS.MAX_PHOTOS})
  </div>

  {/* 사진 그리드 */}
  <div className="photo-preview-grid">
    {/* 카메라 버튼 (첫 번째 셀) */}
    {!isMaxReached && (
      <button className="photo-add-btn" onClick={openCamera}>
        <Camera size={24} />
        <span>촬영</span>
      </button>
    )}

    {/* 갤러리 버튼 (두 번째 셀) */}
    {!isMaxReached && (
      <button className="photo-add-btn" onClick={openGallery}>
        <ImageIcon size={24} />
        <span>앨범</span>
      </button>
    )}

    {/* 미리보기 이미지들 */}
    {photos.map((photo) => (
      <div key={photo.id} className="photo-preview-item">
        <img src={photo.previewUrl} alt="" />
        {/* 삭제 버튼 */}
        <button
          className="photo-preview-remove"
          onClick={() => onRemovePhoto(photo.id)}
        >
          <X size={12} />
        </button>
        {/* 업로드 상태 오버레이 */}
        {photo.status === 'uploading' && (
          <div className="photo-preview-loading">
            <Loader2 size={16} className="animate-spin" />
          </div>
        )}
        {photo.status === 'error' && (
          <div className="photo-preview-error">
            <AlertCircle size={16} />
          </div>
        )}
        {/* 순서 번호 */}
        <div className="photo-preview-order">{photo.orderIndex + 1}</div>
      </div>
    ))}
  </div>

  {/* 숨겨진 file input들 */}
  <input
    ref={cameraInputRef}
    type="file"
    accept="image/*"
    capture="environment"
    onChange={handleCameraCapture}
    className="hidden"
  />
  <input
    ref={galleryInputRef}
    type="file"
    accept={PHOTO_CONSTANTS.ACCEPTED_TYPES.join(',')}
    multiple
    onChange={handleGallerySelect}
    className="hidden"
  />
</div>
```

#### 카메라/갤러리 핸들러

```typescript
function openCamera() {
  cameraInputRef.current?.click()
}

function openGallery() {
  galleryInputRef.current?.click()
}

function handleCameraCapture(e: React.ChangeEvent<HTMLInputElement>) {
  const files = e.target.files
  if (files && files.length > 0) {
    onAddFiles(Array.from(files))
  }
  // input value 리셋 (같은 파일 재선택 허용)
  e.target.value = ''
}

function handleGallerySelect(e: React.ChangeEvent<HTMLInputElement>) {
  const files = e.target.files
  if (files && files.length > 0) {
    onAddFiles(Array.from(files))
  }
  e.target.value = ''
}
```

---

## 목업 매핑

### 프로토타입 CSS 클래스 → Tailwind 매핑

| 프로토타입 클래스 | CSS 정의 | Tailwind 구현 |
|-----------------|---------|--------------|
| `.photo-grid` | `display:grid; grid-template-columns:repeat(3,1fr); gap:2px; padding:0 2px` | `grid grid-cols-3 gap-0.5 px-0.5` |
| `.photo-grid-item` | `aspect-ratio:1; border-radius:2px; overflow:hidden; cursor:pointer; position:relative; transition:opacity 0.15s` | `aspect-square rounded-sm overflow-hidden cursor-pointer relative transition-opacity duration-150` |
| `.photo-grid-item img` | `width:100%; height:100%; object-fit:cover` | `w-full h-full object-cover` |
| `.photo-grid-item.selected::after` | `content:''; position:absolute; inset:0; border:3px solid var(--accent-food); border-radius:2px` | 인라인 스타일 또는 커스텀 클래스 |
| `.photo-check` | 체크마크 아이콘 오버레이 | lucide Check 아이콘 |

> 참고: 프로토타입의 `.photo-grid`는 넛지 사진첩 피커(screen-nudge-photo-picker)용. 기록 화면 내장 사진 피커는 더 작은 미리보기 그리드로 구현한다.

### 기록 화면용 사진 미리보기 스타일

```css
/* 기록 화면 내장 미리보기 그리드 (프로토타입에 직접 대응 없음 — 자체 설계) */
.photo-preview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);  /* 4열 */
  gap: 6px;
}

.photo-add-btn {
  aspect-ratio: 1;
  border-radius: 10px;
  border: 1.5px dashed var(--border);
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--text-hint);
  font-size: 11px;
  cursor: pointer;
}
.photo-add-btn:active {
  background: var(--border);
}

.photo-preview-item {
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}
.photo-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-preview-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
}

.photo-preview-loading {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.photo-preview-error {
  position: absolute;
  inset: 0;
  background: rgba(185, 28, 28, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.photo-preview-order {
  position: absolute;
  bottom: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## 데이터 흐름

```
[카메라 촬영]           [갤러리 선택]
    │                      │
    ▼                      ▼
  File                  File[]
    │                      │
    └──────┬───────────────┘
           ▼
  addFiles(files: File[])
    │
    ├─ 타입 필터 (ACCEPTED_TYPES)
    ├─ 크기 필터 (MAX_FILE_SIZE = 10MB)
    ├─ 장수 제한 (MAX_PHOTOS = 10)
    │
    ▼ PendingPhoto[] 생성
    │
    ├─ previewUrl = URL.createObjectURL(file)
    ├─ status = 'pending'
    ├─ orderIndex = 순서 자동 할당
    │
    ▼ [UI 미리보기 표시]
    │
    ▼ 기록 저장 버튼 클릭
    │
    ▼ uploadAll(userId, recordId)
    │
    ├─ 각 사진별:
    │   ├─ status → 'uploading'
    │   ├─ resizeImage(file) → WebP Blob (max 1200px, quality 0.8)
    │   ├─ uploadImage(userId, recordId, blob, fileId)
    │   │     └─ Storage path: {userId}/{recordId}/{uuid}.webp
    │   ├─ status → 'uploaded', uploadedUrl 설정
    │   └─ 실패 시: status → 'error'
    │
    ▼ 결과: { url, orderIndex }[]
    │
    ▼ photoRepository.savePhotos(recordId, results)
    │
    └─ record_photos INSERT (배치)
       id (auto), record_id, url, order_index, created_at (auto)
```

### 전체 기록 저장 시퀀스에서의 위치 (RECORD_FLOW.md §9)

```
1. records INSERT (status='rated' or 'checked')  ← recordId 확정
2. record_photos INSERT (사진 있으면)              ← 이 태스크
3. wishlists UPDATE (찜 있었으면 is_visited=true)
4. XP 적립 (rated일 때만)
5. 레벨 체크 → 레벨업 알림
```

### Supabase Storage 정책

```sql
-- 버킷: record-photos (public 읽기, 인증 쓰기)

-- 업로드: 본인 폴더에만 허용
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- 읽기: public (URL 알면 누구나)
CREATE POLICY "Public read for record photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'record-photos');

-- 삭제: 본인 폴더만
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);
```

### record_photos 테이블 RLS

```sql
-- record_photos는 records(id)에 FK CASCADE
-- records의 RLS가 이미 user_id 기반으로 보호
-- record_photos 자체 RLS:

-- SELECT: 자기 기록의 사진만
CREATE POLICY "Users can read own record photos"
ON record_photos FOR SELECT
TO authenticated
USING (
  record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
);

-- INSERT: 자기 기록에만
CREATE POLICY "Users can insert own record photos"
ON record_photos FOR INSERT
TO authenticated
WITH CHECK (
  record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
);

-- DELETE: 자기 기록의 사진만
CREATE POLICY "Users can delete own record photos"
ON record_photos FOR DELETE
TO authenticated
USING (
  record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
);

-- 버블 공유된 기록의 사진은 bubble_feed_view에서 photo_urls로 접근
-- 직접 record_photos 접근은 불필요
```

### DI 등록

**파일**: `src/shared/di/container.ts`

```typescript
import { SupabasePhotoRepository } from '@/infrastructure/repositories/supabase-photo-repository'
import type { PhotoRepository } from '@/domain/repositories/photo-repository'

export const photoRepo: PhotoRepository = new SupabasePhotoRepository()
```

---

## 검증 체크리스트

```
□ pnpm build — 에러 없음
□ pnpm lint — 경고 0개
□ TypeScript strict — any/as any/@ts-ignore/! 0개
□ R1 준수 — record-photo.ts, photo-repository.ts에 React/Supabase/Next import 없음
□ R2 준수 — supabase-photo-repository.ts가 PhotoRepository implements
□ R3 준수 — use-photo-upload.ts가 domain 인터페이스에만 의존
□ R4 준수 — photo-picker.tsx에 infrastructure/Supabase import 없음
□ R5 준수 — DI container에서만 infrastructure import
□ 리사이즈 — max 1200px width, WebP, quality 0.8
□ Storage 경로 — {userId}/{recordId}/{uuid}.webp 형식
□ 최대 장수 — 10장 초과 시 추가 불가
□ 타입 필터 — jpeg, png, webp, heic, heif만 허용
□ 크기 필터 — 10MB 초과 제외
□ 순서 추적 — orderIndex 0-based, 삭제 시 재정렬
□ 미리보기 — URL.createObjectURL 사용, 삭제 시 revokeObjectURL
□ 에러 처리 — 업로드 실패 시 photo.status='error' + UI 표시
□ Storage RLS — 본인 폴더만 upload/delete 가능
□ record_photos RLS — 자기 기록의 사진만 CRUD
□ FK CASCADE — record 삭제 시 record_photos 자동 삭제
□ 카메라 — capture="environment" 속성으로 후면 카메라 기본
□ 갤러리 — multiple 속성으로 다중 선택 허용
□ 모바일 360px — 4열 그리드 깨짐 없음
□ 아이콘 — lucide-react Camera, ImageIcon, X, Loader2, AlertCircle 사용
□ 디자인 토큰 — bg-white/text-black 하드코딩 없음
□ 보안 — SUPABASE_SERVICE_ROLE_KEY 클라이언트 노출 없음
```
