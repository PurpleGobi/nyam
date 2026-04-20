# 8.4: 기록→버블 공유

> 기록을 소속 버블에 공유하는 플로우를 구현한다. 공유/취소/프라이버시 검증 포함.

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/08_BUBBLE.md` | §8 공유 플로우 (방법 1~3, 공유 데이터, 프라이버시) |
| `systems/DATA_MODEL.md` | bubble_shares 테이블, bubbles, bubble_members |
| `pages/11_SETTINGS.md` | privacy_records 설정 |

---

## 선행 조건

- S2: 기록 생성 플로우 완료 (`DiningRecord` entity, `RecordRepository`)
- S7: `bubble_shares` 테이블 + `BubbleRepository` + `BubbleMember` 조회
- S4: 기록 상세 페이지 (공유 아이콘 배치)

---

## 구현 범위

### 파일 목록

```
src/presentation/components/share/share-to-bubble-sheet.tsx
src/presentation/components/share/bubble-select-list.tsx
src/presentation/components/bubble/share-list-sheet.tsx       ← 공유 항목 선택 시트 (필터+검색+정렬 지원)
src/presentation/components/bubble/share-rule-editor.tsx      ← 버블 자동 공유 규칙 편집기
src/application/hooks/use-share-record.ts
```

### 스코프 외

- 외부 플랫폼 공유 (카카오톡, 인스타 등)
- `allow_external_share` 설정 연동 (v2)

---

## 상세 구현 지침

### 1. Application Layer

#### `src/application/hooks/use-share-record.ts`

```typescript
interface ShareableBubble {
  id: string
  name: string
  icon: string | null
  iconBgColor: string | null
  isShared: boolean           // 이미 공유된 버블인지
  canShare: boolean           // 공유 가능 여부
  blockReason: string | null  // canShare=false 사유 (예: "비활성 멤버십")
}

interface UseShareRecordResult {
  sharedBubbles: string[]                        // 이미 공유된 버블 ID 목록
  availableBubbles: ShareableBubble[]
  shareToBubble: (bubbleId: string) => Promise<void>
  shareToBubbles: (bubbleIds: string[]) => Promise<void>
  unshareBubble: (bubbleId: string) => Promise<void>
  canShare: boolean
  blockReason: string | null
  isLoading: boolean
}

export function useShareRecord(
  userId: string | null,
  recordId: string | null,
  targetId?: string | null,
  targetType?: 'restaurant' | 'wine',
): UseShareRecordResult
```

**동작 흐름**:
1. `settingsRepo.getUserSettings(userId)` → `privacyProfile === 'private'`이면 공유 불가
2. `bubbleRepo.getUserBubbles(userId)` → 소속 버블 목록 조회
3. `bubbleRepo.getRecordShares(recordId)` → 이미 공유된 버블 확인
4. `isShared` 마킹 + `canShare` = 멤버십 status === 'active'
5. `shareToBubble()` → `bubbleRepo.shareRecord(recordId, bubbleId, userId, targetId, targetType)` + XP
6. `shareToBubbles()` → 각 버블에 순차적으로 공유 + XP (`awardSocialXp(userId, 'share')`)
7. 첫 공유 시 `awardBonus(userId, 'first_share')` 보너스 XP

**XP 부여**:
- `useSocialXp().awardSocialXp(userId, 'share')` — 공유 당 XP +1
- `useBonusXp().awardBonus(userId, 'first_share')` — 최초 공유 보너스

**canShare 로직**:
- `isPrivateProfile` → `false` (blockReason: "비공개 프로필은 공유할 수 없습니다")
- `availableBubbles.some(b => b.canShare)` → 공유 가능 버블 존재 여부
- 둘 다 아니면 blockReason: "공유 가능한 버블이 없습니다"

### 2. Presentation Layer

#### `src/presentation/components/share/bubble-select-list.tsx`

```typescript
interface BubbleSelectItem {
  id: string
  name: string
  icon: string | null
  iconBgColor: string | null
  isShared: boolean
  canShare: boolean
  blockReason: string | null
}

interface BubbleSelectListProps {
  bubbles: BubbleSelectItem[]
  selectedIds: Set<string>
  onToggle: (bubbleId: string) => void
}
```

**리스트 아이템 렌더링**:

| 요소 | 스타일 |
|------|--------|
| 아이콘 | `<BubbleIcon>` 18px in 40×40px `border-radius: 10px` 컨테이너 (`iconBgColor` 배경) |
| 버블명 | `15px 600 var(--text)` |
| 차단 사유 | `Lock` 10px + `11px var(--text-hint)` |
| "공유됨" 뱃지 | `11px 600 var(--positive); bg: rgba(126,174,139,0.12); border-radius: 6px; padding: 2px 8px` |
| 체크박스 (선택) | `22×22px; border-radius: 6px; bg: var(--accent-social); border: 2px solid var(--accent-social)`, `Check` 14px 흰색 |
| 체크박스 (미선택) | `bg: transparent; border: 2px solid var(--border)` |
| 비활성 (isShared 또는 !canShare) | `opacity: 0.4; pointer-events: none` |
| 행 | `padding: 12px 0; border-bottom: 1px solid var(--border)` |
| 빈 상태 | "가입한 버블이 없습니다" (13px var(--text-hint), py-10) |

#### `src/presentation/components/share/share-to-bubble-sheet.tsx`

```typescript
interface ShareToBubbleSheetProps {
  isOpen: boolean
  onClose: () => void
  bubbles: BubbleSelectItem[]
  onShareMultiple: (bubbleIds: string[]) => Promise<void>
}
```

> **참고**: 시트는 `recordId`를 직접 받지 않는다. `bubbles`와 `onShareMultiple`을 부모에서 주입받는 순수 UI 컴포넌트 패턴.

**바텀 시트 구조**:

```
┌──────────────────────────────────────┐
│ ━━━━━ (드래그 핸들)                  │
│                                      │
│ 버블에 공유                    ✕     │  ← 제목 + 닫기
│                                      │
│ [버블 선택 리스트]                    │  ← BubbleSelectList
│                                      │
│ ┌──────────────────────────────────┐ │
│ │           공유 (N개)             │ │  ← CTA 버튼
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 시트 배경 | `max-w-[480px]; border-radius: 16px 16px 0 0; bg: var(--bg-elevated); max-height: 70vh` |
| 드래그 핸들 | `h-1 w-10 rounded-full; bg: var(--border)` |
| 제목 | `17px 800 var(--text)` |
| 닫기 | `X` lucide 20px `var(--text-hint)` |
| 버블 목록 | `max-height: 40vh; overflow-y: auto` |
| CTA 활성 | `w-full; py: 14px; border-radius: 12px; 15px 700; bg: var(--accent-social); color: #fff` |
| CTA 비활성 | `bg: var(--bg-section); color: var(--text-hint); pointer-events: none` |
| CTA 텍스트 | 선택 N개: "공유 (N개)", 선택 0개: "버블을 선택해주세요" |
| 하단 패딩 | `px-4 pb-8 pt-3` |

**동작 플로우**:

```
1. 시트 열림 → bubbles prop 렌더
2. 유저가 체크박스로 버블 선택 (이미 공유된 버블은 선택 불가)
3. "공유 (N개)" CTA 탭
   → onShareMultiple(selectedIds)
   → 완료 시 showToast("N개 버블에 공유했어요")
   → selectedIds 초기화
   → 시트 닫힘
```

#### `src/presentation/components/bubble/share-list-sheet.tsx`

공유 항목 선택 시트. 식당/와인 탭 전환, 필터/소팅/검색 기능을 갖춘 전체 화면 시트.

```typescript
interface ShareListSheetProps {
  isOpen: boolean
  onClose: () => void
  records: RecordWithTarget[]
  isLoading: boolean
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}
```

**주요 기능**:
- `StickyTabs` (식당/와인) 전환
- `FilterSystem` — 필터 룰 적용 (`matchesAllRules`)
- `SortDropdown` — 정렬 (latest, score_high, score_low, name, visit_count)
- 검색 (이름/지역/메타)
- 전체 선택/해제
- 체크박스 개별 선택/해제
- 하단 확인 바: "{N}개 항목 공유 · 완료"

#### `src/presentation/components/bubble/share-rule-editor.tsx`

버블 자동 공유 규칙 편집기. 버블 설정에서 사용.

```typescript
interface ShareRuleEditorProps {
  value: BubbleShareRule | null
  onChange: (rule: BubbleShareRule | null) => void
  focusType?: 'restaurant' | 'wine' | 'all'
}
```

**주요 기능**:
- 모드 선택: "모든 항목 공유" (all) / "조건부 공유" (filtered)
- `focusType='all'`이면 식당/와인 각각 독립된 `ConditionFilterBar` 표시
- `focusType='restaurant'|'wine'`이면 단일 `ConditionFilterBar`
- 규칙 ↔ FilterChipItem 변환 (`rulesToChips`, `chipsToRules`)

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|----------|----------|
| BUBBLE.md §8 공유 플로우 다이어그램 | `<ShareToBubbleSheet>` |
| 04_bubbles_detail.html 피드 카드 | 공유 결과 → 버블 피드에 표시 (S7 구현) |
| 02_detail_restaurant.html 공유 아이콘 | 기존 `share-2` 아이콘 → 시트 트리거 |

---

## 데이터 흐름

```
[기록 상세 → share-2 탭]
  → useShareRecord(userId, recordId, targetId, targetType)
    → 프라이버시 검증: settingsRepo.getUserSettings(userId)
      → privacyProfile === 'private' → canShare=false
    → 소속 버블 조회: bubbleRepo.getUserBubbles(userId)
    → 이미 공유된 버블 조회: bubbleRepo.getRecordShares(recordId)
    → availableBubbles[] (isShared/canShare/blockReason 마킹)
  → <ShareToBubbleSheet
      bubbles={availableBubbles}
      onShareMultiple={shareToBubbles}
    />
  → 유저 선택 → CTA 탭
    → shareToBubbles([id1, id2])
      → bubbleRepo.shareRecord × N
      → awardSocialXp(userId, 'share') × N
      → awardBonus(userId, 'first_share')
    → showToast "2개 버블에 공유했어요"
    → 시트 닫힘

[공유 취소]
  → unshareBubble(bubbleId)
    → bubbleRepo.unshareRecord(recordId, bubbleId)
    → UI 상태 갱신 (isShared=false)
```

---

## 검증 체크리스트

```
□ 기록 상세 share-2 아이콘 → 시트 열림
□ 버블 선택 리스트: 소속 버블 전체 표시
□ 이미 공유된 버블: "공유됨" 뱃지 + 체크박스 비활성 (opacity: 0.4)
□ 비활성 멤버십: Lock 아이콘 + blockReason 텍스트 표시
□ 빈 상태: "가입한 버블이 없습니다"
□ 공유 → bubbleRepo.shareRecord 호출 확인
□ 공유 → awardSocialXp(userId, 'share') 호출 확인
□ 첫 공유 → awardBonus(userId, 'first_share') 호출 확인
□ 공유 취소 → bubbleRepo.unshareRecord 호출 확인
□ privacy_profile='private' → canShare=false, blockReason 표시
□ 동반자(companions) 공유 데이터에 미포함 확인
□ 가격(price_total) 버블 내에서만 표시, 프로필 방문자에게 숨김
□ 버블 간 격리: 버블X에 공유 → 버블Y에서 미노출
□ ShareListSheet: 식당/와인 탭 전환, 필터/소팅/검색 동작
□ ShareRuleEditor: all/filtered 모드 전환, ConditionFilterBar 연동
□ 360px 레이아웃 정상
□ R1~R5 위반 없음
□ pnpm build / lint 통과
```
