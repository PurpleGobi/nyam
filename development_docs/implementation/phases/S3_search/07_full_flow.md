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
| `src/application/hooks/use-save-record.ts` | application | 기록 저장 시퀀스 (records + photos + wishlists + XP) |
| `src/presentation/components/add-flow/success-screen.tsx` | presentation | 성공 화면 (screen-add-success) |
| `src/presentation/components/add-flow/record-nav.tsx` | presentation | 기록 네비게이션 헤더 (뒤로/타이틀/닫기) |
| `src/presentation/containers/add-flow-container.tsx` | presentation | 풀플로우 루트 컨테이너 |
| `src/app/(main)/add/page.tsx` | app | 기록 추가 페이지 라우트 |

### 스코프 외

- 기록 화면 UI (S2 구현체 재사용)
- XP 적립 DB 기록 — S6에서 구현 (여기서는 record_quality_xp 필드만 설정)
- 버블 공유 — Phase 2

---

## 상세 구현 지침

### 1. `src/domain/entities/add-flow.ts`

```typescript
// src/domain/entities/add-flow.ts
// R1: 외부 의존 0

import type { RecordTargetType } from '@/domain/entities/record'

/**
 * 풀플로우 진입 경로
 * RECORD_FLOW.md §1: 카메라(Primary), 검색/목록(폴백), 상세 FAB
 */
export type AddFlowEntryPath =
  | 'camera'       // FAB→카메라→AI인식→기록 (Primary)
  | 'search'       // FAB→검색→선택→기록 or 빠른추가
  | 'detail_fab'   // 상세→FAB→기록 (대상 선택 스킵)
  | 'nudge'        // 넛지 스트립→사진 선택→기록
  | 'recommend'    // 추천 카드 "다녀왔어요"→기록

/**
 * 풀플로우 단계 (상태 머신)
 */
export type AddFlowStep =
  | 'camera'         // 카메라 촬영/앨범 선택
  | 'ai_result'      // AI 인식 결과 (후보 표시)
  | 'wine_confirm'   // 와인 확인 화면
  | 'search'         // 검색 화면
  | 'register'       // 신규 등록 폼
  | 'record'         // 기록 화면 (S2 구현체)
  | 'success'        // 성공 화면

/**
 * 풀플로우 상태
 */
export interface AddFlowState {
  /** 현재 단계 */
  step: AddFlowStep
  /** 식당 or 와인 */
  targetType: RecordTargetType
  /** 대상 ID (식당/와인 특정 완료 시) */
  targetId: string | null
  /** 대상명 (성공 화면 표시용) */
  targetName: string | null
  /** 대상 메타 (성공 화면 서브텍스트) */
  targetMeta: string | null
  /** 진입 경로 */
  entryPath: AddFlowEntryPath
  /** 촬영된 이미지 (base64) */
  capturedImage: string | null
  /** AI pre-fill 데이터 (카메라 경로) */
  aiPrefill: AIPreFillData | null
  /** 검색 쿼리 (등록 폼 pre-fill) */
  searchQuery: string | null
}

/** AI 인식 → 기록 화면 pre-fill 데이터 */
export interface AIPreFillData {
  /** 식당: 인식된 장르 */
  genre?: string | null
  /** 식당: AI 추천 상황태그 */
  suggestedScene?: string | null
  /** 와인: OCR 데이터 */
  ocrData?: {
    wine_name: string
    vintage: string | null
    producer: string | null
  }
  /** 와인: 인식된 타입 */
  wineType?: string | null
  /** 와인: 인식된 산지 */
  region?: string | null
  /** EXIF GPS */
  gps?: { latitude: number; longitude: number } | null
  /** EXIF 촬영 시각 */
  capturedAt?: string | null
}

/** 성공 화면 액션 */
export type SuccessAction =
  | 'add_detail'   // "내용 추가하기" → 상세페이지 (풍성화 유도)
  | 'add_another'  // "한 곳 더 추가" → 플로우 재시작
  | 'go_home'      // "홈으로" → 홈 화면

/** status 결정 규칙 */
export function determineRecordStatus(
  entryPath: AddFlowEntryPath,
  hasRating: boolean
): 'checked' | 'rated' {
  // RECORD_FLOW.md §1:
  // 카메라/상세 FAB → 기록 화면 거침 → 'rated'
  // 검색 경로 빠른 추가 → 'checked'
  if (entryPath === 'search' && !hasRating) {
    return 'checked'
  }
  return 'rated'
}
```

### 2. `src/application/hooks/use-add-flow.ts`

```typescript
// src/application/hooks/use-add-flow.ts

import { useState, useCallback } from 'react'
import type {
  AddFlowState,
  AddFlowStep,
  AddFlowEntryPath,
  AIPreFillData,
  SuccessAction,
} from '@/domain/entities/add-flow'
import type { RecordTargetType } from '@/domain/entities/record'

interface UseAddFlowParams {
  /** 초기 타겟 타입 (홈 탭 기반) */
  initialTargetType: RecordTargetType
  /** 진입 경로 */
  entryPath: AddFlowEntryPath
  /** 상세 FAB 진입 시: 이미 특정된 대상 */
  preselectedTargetId?: string
  preselectedTargetName?: string
}

interface UseAddFlowReturn {
  state: AddFlowState
  /** 단계 전환 */
  goToStep: (step: AddFlowStep) => void
  /** 대상 특정 완료 (검색/AI 결과 선택) */
  selectTarget: (params: {
    targetId: string
    targetName: string
    targetMeta?: string
  }) => void
  /** AI pre-fill 데이터 설정 */
  setAiPrefill: (data: AIPreFillData) => void
  /** 촬영 이미지 설정 */
  setCapturedImage: (base64: string) => void
  /** 검색 쿼리 저장 (등록 폼 pre-fill용) */
  setSearchQuery: (query: string) => void
  /** 성공 화면 액션 처리 */
  handleSuccessAction: (action: SuccessAction) => void
  /** 뒤로 가기 */
  goBack: () => void
  /** 플로우 전체 종료 */
  exitFlow: () => void
  /** 플로우 재시작 (한 곳 더 추가) */
  restartFlow: () => void
}

export function useAddFlow({
  initialTargetType,
  entryPath,
  preselectedTargetId,
  preselectedTargetName,
}: UseAddFlowParams): UseAddFlowReturn {
  const [state, setState] = useState<AddFlowState>(() => {
    // 상세 FAB 진입: 대상 선택 스킵 → 바로 기록 화면
    if (entryPath === 'detail_fab' && preselectedTargetId) {
      return {
        step: 'record',
        targetType: initialTargetType,
        targetId: preselectedTargetId,
        targetName: preselectedTargetName ?? null,
        targetMeta: null,
        entryPath,
        capturedImage: null,
        aiPrefill: null,
        searchQuery: null,
      }
    }

    // 카메라 진입: 카메라 화면부터
    if (entryPath === 'camera' || entryPath === 'nudge') {
      return {
        step: 'camera',
        targetType: initialTargetType,
        targetId: null,
        targetName: null,
        targetMeta: null,
        entryPath,
        capturedImage: null,
        aiPrefill: null,
        searchQuery: null,
      }
    }

    // 검색 진입
    return {
      step: 'search',
      targetType: initialTargetType,
      targetId: null,
      targetName: null,
      targetMeta: null,
      entryPath,
      capturedImage: null,
      aiPrefill: null,
      searchQuery: null,
    }
  })

  // 단계 이력 (뒤로 가기용)
  const [stepHistory, setStepHistory] = useState<AddFlowStep[]>([])

  const goToStep = useCallback((step: AddFlowStep) => {
    setStepHistory((prev) => [...prev, state.step])
    setState((prev) => ({ ...prev, step }))
  }, [state.step])

  const selectTarget = useCallback((params: {
    targetId: string
    targetName: string
    targetMeta?: string
  }) => {
    setState((prev) => ({
      ...prev,
      targetId: params.targetId,
      targetName: params.targetName,
      targetMeta: params.targetMeta ?? null,
    }))
  }, [])

  const setAiPrefill = useCallback((data: AIPreFillData) => {
    setState((prev) => ({ ...prev, aiPrefill: data }))
  }, [])

  const setCapturedImage = useCallback((base64: string) => {
    setState((prev) => ({ ...prev, capturedImage: base64 }))
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }))
  }, [])

  const handleSuccessAction = useCallback((action: SuccessAction) => {
    switch (action) {
      case 'add_detail':
        // → 상세 페이지 (풍성화 유도)
        // 라우팅은 컨테이너에서 처리
        break
      case 'add_another':
        // 플로우 재시작
        restartFlowInternal()
        break
      case 'go_home':
        // → 홈
        break
    }
  }, [])

  const goBack = useCallback(() => {
    setStepHistory((prev) => {
      const newHistory = [...prev]
      const previousStep = newHistory.pop()
      if (previousStep) {
        setState((s) => ({ ...s, step: previousStep }))
      }
      return newHistory
    })
  }, [])

  const exitFlow = useCallback(() => {
    // 라우팅 처리는 컨테이너에서 router.back() 또는 router.push('/')
  }, [])

  const restartFlowInternal = useCallback(() => {
    setState({
      step: entryPath === 'search' ? 'search' : 'camera',
      targetType: initialTargetType,
      targetId: null,
      targetName: null,
      targetMeta: null,
      entryPath,
      capturedImage: null,
      aiPrefill: null,
      searchQuery: null,
    })
    setStepHistory([])
  }, [entryPath, initialTargetType])

  return {
    state,
    goToStep,
    selectTarget,
    setAiPrefill,
    setCapturedImage,
    setSearchQuery,
    handleSuccessAction,
    goBack,
    exitFlow,
    restartFlow: restartFlowInternal,
  }
}
```

### 3. `src/application/hooks/use-save-record.ts`

**RECORD_FLOW.md §9 저장 시퀀스 구현**

```typescript
// src/application/hooks/use-save-record.ts

import { useState, useCallback } from 'react'
import type { CreateRecordInput } from '@/domain/entities/record'
// XP 계산은 S6의 xp-calculator.ts가 담당
// 기록 저장 시에는 record_quality_xp를 0으로 저장
// S6 완료 후 useXpCalculation hook이 저장 직후 XP를 계산하여 업데이트
import { recordRepository } from '@/shared/di/container'
import { validateExif } from '@/domain/services/exif-validator'

interface SaveRecordParams extends CreateRecordInput {
  /** 사진 파일 배열 */
  photos?: File[]
  /** EXIF GPS 데이터 */
  exifGps?: { latitude: number; longitude: number } | null
  /** EXIF 촬영 시각 */
  exifCapturedAt?: string | null
  /** 대상 GPS (식당 좌표) */
  targetLat?: number | null
  targetLng?: number | null
}

interface UseSaveRecordReturn {
  isSaving: boolean
  error: string | null
  /** 기록 저장 (전체 시퀀스) */
  saveRecord: (params: SaveRecordParams) => Promise<string | null>
}

export function useSaveRecord(): UseSaveRecordReturn {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveRecord = useCallback(async (params: SaveRecordParams): Promise<string | null> => {
    setIsSaving(true)
    setError(null)

    try {
      // ── 1. EXIF 검증 ──
      const exifResult = validateExif({
        photoGps: params.exifGps ?? null,
        targetLat: params.targetLat ?? null,
        targetLng: params.targetLng ?? null,
        capturedAt: params.exifCapturedAt ?? null,
      })

      // ── 2. records INSERT ──
      // 저장 시 record_quality_xp: 0 (S6에서 XP 엔진 연결 후 자동 계산)
      const recordBody = {
        ...params,
        hasExifGps: exifResult.hasGps,
        isExifVerified: exifResult.isWithinRadius,
        recordQualityXp: 0,
      }

      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordBody),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error ?? '저장에 실패했습니다')
        return null
      }

      const { recordId } = await response.json()

      // ── 4. 사진 업로드 (있으면) ──
      if (params.photos && params.photos.length > 0) {
        const formData = new FormData()
        formData.append('recordId', recordId)
        params.photos.forEach((photo, index) => {
          formData.append(`photo_${index}`, photo)
        })

        await fetch('/api/records/photos', {
          method: 'POST',
          body: formData,
        })
      }

      // ── 5. wishlists UPDATE (찜 있으면 is_visited=true) ──
      // 서버 사이드에서 자동 처리 (API Route 내부)

      // ── 6. XP 적립 (S6에서 구현 — 여기서는 record_quality_xp만 설정) ──

      return recordId

    } catch {
      setError('네트워크 오류가 발생했습니다')
      return null
    } finally {
      setIsSaving(false)
    }
  }, [])

  return { isSaving, error, saveRecord }
}
```

### 4. `src/presentation/components/add-flow/success-screen.tsx`

**RECORD_FLOW.md §7 screen-add-success**

```typescript
// src/presentation/components/add-flow/success-screen.tsx

import { Check, Plus, Home } from 'lucide-react'
import type { SuccessAction } from '@/domain/entities/add-flow'

interface SuccessScreenProps {
  targetType: 'restaurant' | 'wine'
  targetName: string
  targetMeta: string | null
  onAction: (action: SuccessAction) => void
}

export function SuccessScreen({
  targetType,
  targetName,
  targetMeta,
  onAction,
}: SuccessScreenProps) {
  const isRestaurant = targetType === 'restaurant'
  const accentClass = isRestaurant
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
          onClick={() => onAction('add_detail')}
          className={`w-full py-3.5 rounded-xl ${accentClass} text-white text-[15px] font-semibold`}
        >
          내용 추가하기
        </button>

        {/* Ghost: 한 곳 더 추가 */}
        <button
          type="button"
          onClick={() => onAction('add_another')}
          className="w-full py-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] text-[15px] font-medium bg-[var(--bg-card)] flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          한 곳 더 추가
        </button>

        {/* Text: 홈으로 */}
        <button
          type="button"
          onClick={() => onAction('go_home')}
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

### 5. `src/presentation/components/add-flow/record-nav.tsx`

**RECORD_FLOW.md §10 record-nav**

```typescript
// src/presentation/components/add-flow/record-nav.tsx

import { ChevronLeft, X } from 'lucide-react'

interface RecordNavProps {
  title: string
  /** 와인 모드일 때 타이틀 색상 변경 */
  variant: 'restaurant' | 'wine'
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

```typescript
// src/presentation/containers/add-flow-container.tsx

'use client'

import { useRouter } from 'next/navigation'
import { useAddFlow } from '@/application/hooks/use-add-flow'
import { RecordNav } from '@/presentation/components/add-flow/record-nav'
import { SuccessScreen } from '@/presentation/components/add-flow/success-screen'
import type { RecordTargetType } from '@/domain/entities/record'
import type { AddFlowEntryPath, SuccessAction } from '@/domain/entities/add-flow'

// S3-T01: CameraContainer
// S3-T02: SearchContainer
// S3-T06: RegisterContainer
// S2: RecordFormContainer (기록 화면)
// 위 컴포넌트들은 각 태스크에서 구현됨

interface AddFlowContainerProps {
  targetType: RecordTargetType
  entryPath: AddFlowEntryPath
  preselectedTargetId?: string
  preselectedTargetName?: string
}

export function AddFlowContainer({
  targetType,
  entryPath,
  preselectedTargetId,
  preselectedTargetName,
}: AddFlowContainerProps) {
  const router = useRouter()

  const flow = useAddFlow({
    initialTargetType: targetType,
    entryPath,
    preselectedTargetId,
    preselectedTargetName,
  })

  const handleClose = () => {
    router.back()
  }

  const handleSuccessAction = (action: SuccessAction) => {
    switch (action) {
      case 'add_detail':
        // 상세 페이지로 이동 (풍성화 유도)
        if (flow.state.targetId) {
          const path = flow.state.targetType === 'restaurant'
            ? `/restaurants/${flow.state.targetId}`
            : `/wines/${flow.state.targetId}`
          router.push(path)
        }
        break
      case 'add_another':
        flow.restartFlow()
        break
      case 'go_home':
        router.push('/')
        break
    }
  }

  // ── Step별 타이틀 ──
  const titleMap: Record<string, string> = {
    camera: targetType === 'restaurant' ? '식당 추가' : '와인 추가',
    ai_result: targetType === 'restaurant' ? '식당 추가' : '와인 추가',
    wine_confirm: '와인 확인',
    search: targetType === 'restaurant' ? '식당 검색' : '와인 검색',
    register: targetType === 'restaurant' ? '식당 등록' : '와인 등록',
    record: '기록',
    success: '',
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)]">
      {/* 네비게이션 헤더 (성공 화면 제외) */}
      {flow.state.step !== 'success' && (
        <RecordNav
          title={titleMap[flow.state.step] ?? ''}
          variant={targetType}
          onBack={flow.goBack}
          onClose={handleClose}
        />
      )}

      {/* Step별 컨텐츠 */}
      <main className="flex-1">
        {flow.state.step === 'camera' && (
          <div>
            {/* CameraContainer — S3-T01에서 구현
                onCapture → setCapturedImage + identify
                onAiResult → goToStep('ai_result') or goToStep('record')
                onSearchFallback → goToStep('search') */}
          </div>
        )}

        {flow.state.step === 'ai_result' && (
          <div>
            {/* AIResultDisplay (식당) — S3-T01에서 구현
                onSelect → selectTarget + goToStep('record') */}
          </div>
        )}

        {flow.state.step === 'wine_confirm' && (
          <div>
            {/* WineConfirmCard — S3-T01에서 구현
                onConfirm → selectTarget + goToStep('record')
                onReject → goBack (카메라로) */}
          </div>
        )}

        {flow.state.step === 'search' && (
          <div>
            {/* SearchContainer — S3-T02에서 구현
                onSelect → selectTarget
                  hasRecord → toast + 상세 이동
                  !hasRecord → 빠른추가(checked) → goToStep('success')
                onRegister → goToStep('register') */}
          </div>
        )}

        {flow.state.step === 'register' && (
          <div>
            {/* RegisterContainer — S3-T06에서 구현
                onRegistered → selectTarget + goToStep('success') */}
          </div>
        )}

        {flow.state.step === 'record' && (
          <div>
            {/* RecordFormContainer — S2에서 구현
                targetType, targetId, aiPrefill, capturedImage 전달
                onSaved → goToStep('success') */}
          </div>
        )}

        {flow.state.step === 'success' && flow.state.targetName && (
          <SuccessScreen
            targetType={targetType}
            targetName={flow.state.targetName}
            targetMeta={flow.state.targetMeta}
            onAction={handleSuccessAction}
          />
        )}
      </main>
    </div>
  )
}
```

---

## 데이터 흐름 (3 경로 통합)

```
┌─── 경로 1: 카메라 (Primary) ───────────────────────────────────────┐
│ FAB(+) → currentHomeTab → CameraCapture                           │
│    ↓                                                               │
│ 촬영/앨범 → AI 인식 (POST /api/records/identify)                   │
│    ↓                                                               │
│ ┌─ 식당: isConfidentMatch → 바로 step='record'                    │
│ │         후보 다수 → step='ai_result' → 선택 → step='record'      │
│ │         후보 0 → step='search'                                   │
│ │                                                                  │
│ └─ 와인: isConfidentMatch → 바로 step='record'                    │
│          후보 → step='wine_confirm' → 맞아요 → step='record'       │
│          후보 0 → "찾지 못했어요" → step='search' or 'register'     │
│    ↓                                                               │
│ step='record' (AI pre-fill, 사진 자동 첨부)                        │
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
│ 결과 없음 → step='register' → 등록 → step='success'               │
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
□ 성공 화면: "내용 추가하기" → 상세, "한 곳 더 추가" → 재시작, "홈으로" → /
□ 성공 화면 테마: food(--accent-food) / wine(--accent-wine)
□ 뒤로 가기: step history 기반 이전 단계 복원
□ 닫기(X): 플로우 전체 종료
□ 저장 시퀀스: records → photos → wishlists → XP (§9)
□ TypeScript strict: any/as any/@ts-ignore/! 0개
□ 모바일 360px 레이아웃 정상
```
