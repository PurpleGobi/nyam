# 8.4: 기록→버블 공유

> 기록을 소속 버블에 공유하는 플로우 3가지를 구현한다. 공유/취소/프라이버시 검증 포함.

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
src/application/hooks/use-share-record.ts
```

### 스코프 외

- 방법 3: 필터 일괄 공유 "N개 기록 공유" (future로 SSOT 명시)
- 외부 플랫폼 공유 (카카오톡, 인스타 등)
- `allow_external_share` 설정 연동 (v2)

---

## 상세 구현 지침

### 1. 공유 경로 3가지 (BUBBLE.md §8)

| 경로 | 트리거 | 구현 |
|------|--------|------|
| **방법 1** | 기록 생성 직후 → "버블에 공유" 프롬프트 | 기록 저장 성공 화면에 `<ShareToBubbleSheet>` 자동 노출 (조건부) |
| **방법 2** | 기록 상세 → `share-2` 아이콘 탭 | 기록 상세 헤더의 공유 버튼 → `<ShareToBubbleSheet>` |
| **방법 3** | 필터 일괄 공유 | **스코프 외 (future)** |

**방법 1 자동 노출 조건**: `users.pref_bubble_share` 값에 따라:
- `'ask'` (기본): 매번 시트 표시
- `'auto'`: 기본 버블에 자동 공유 (시트 생략)
- `'never'`: 시트 표시 안 함

### 2. Application Layer

#### `src/application/hooks/use-share-record.ts`

```typescript
interface SharedBubbleInfo {
  bubbleId: string;
  bubbleName: string;
  bubbleIcon: string;
  sharedAt: string;
}

interface UseShareRecordReturn {
  /** 현재 공유된 버블 목록 */
  sharedBubbles: SharedBubbleInfo[];
  /** 공유 가능한 내 버블 목록 (role: owner/admin/member, status: active) */
  availableBubbles: {
    id: string;
    name: string;
    icon: string;
    iconBgColor: string;
    isAlreadyShared: boolean;
  }[];
  /** 특정 버블에 공유 */
  shareToBubble: (bubbleId: string) => Promise<void>;
  /** 여러 버블에 한번에 공유 */
  shareToBubbles: (bubbleIds: string[]) => Promise<void>;
  /** 공유 취소 */
  cancelShare: (bubbleId: string) => Promise<void>;
  /** 프라이버시 검증 통과 여부 */
  canShare: boolean;
  /** 프라이버시 차단 사유 (canShare=false일 때) */
  blockReason: string | null;
  isLoading: boolean;
}

export function useShareRecord(recordId: string): UseShareRecordReturn {
  // 1. 현재 유저의 privacy_profile, privacy_records 확인
  //    - privacy_profile === 'private' → canShare = false, blockReason = "비공개 프로필은 공유할 수 없습니다"
  //    - privacy_records === 'shared_only'일 때는 정상 (이미 공유된 것만 외부에 보인다는 의미)
  // 2. 내 소속 버블 목록 조회 (bubble_members WHERE user_id = me AND role IN ('owner','admin','member') AND status = 'active')
  // 3. 이미 공유된 버블 조회 (bubble_shares WHERE record_id = recordId)
  // 4. shareToBubble() → INSERT bubble_shares(record_id, bubble_id, shared_by)
  //    → 성공 시 XP +1 (social_share)
  //    → SWR mutate
  // 5. cancelShare() → DELETE bubble_shares WHERE record_id AND bubble_id
  //    → 고아 댓글은 유지 (BUBBLE.md §8: "달린 댓글은 고아 상태로 유지")
}
```

**공유 시 포함되는 데이터** (BUBBLE.md §8 명시):

| 포함 | 필드 |
|------|------|
| 식당/와인명 | `records.target_id` → restaurant/wine name |
| 사분면 좌표 | `records.quadrant_x`, `records.quadrant_y` |
| 만족도 | `records.satisfaction` |
| 상황 | `records.scene` |
| 한줄평 | `records.comment` |
| 사진 | `record_photos` |
| 메뉴 | `records.menus` |
| 팁 | `records.tip` |
| 날짜 | `records.recorded_at` |

**버블 내에서만 공개** (프로필 방문자에게 비공개):
| 포함 | 필드 |
|------|------|
| 가격 | `records.price_total` |

**항상 비공개** (공유 불가, 외부 노출 절대 금지):
| 비공개 | 필드 |
|--------|------|
| 동반자 이름 | `records.companions` (나만 열람) |

> `records.companion_count`는 별개 — 필터/통계용 활용 가능 (BUBBLE.md §8)

**버블 간 격리**: 기록 A를 버블 X에 공유해도 버블 Y에는 보이지 않음. `bubble_shares.UNIQUE(record_id, bubble_id)` 제약으로 중복 방지.

### 3. Presentation Layer

#### `src/presentation/components/share/bubble-select-list.tsx`

```typescript
interface BubbleSelectItem {
  id: string;
  name: string;
  icon: string;
  iconBgColor: string;
  isAlreadyShared: boolean;
}

interface BubbleSelectListProps {
  bubbles: BubbleSelectItem[];
  selectedIds: Set<string>;
  onToggle: (bubbleId: string) => void;
}
```

**리스트 아이템 렌더링**:

```
┌──────────────────────────────────────┐
│ [🍴40] 직장 맛집              [☑]   │  ← 체크박스 선택
│ [🍷40] 와인 모임              [☐]   │
│ [🏠40] 동네 맛집       공유됨  [━]   │  ← 이미 공유: 뱃지 + 체크박스 비활성
└──────────────────────────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 아이콘 | 40x40px, `border-radius: 10px`, `iconBgColor` 배경, lucide 아이콘 20px 흰색 |
| 버블명 | `font-size: 15px; font-weight: 600; color: var(--text)` |
| "공유됨" 뱃지 | `font-size: 11px; font-weight: 600; color: var(--positive); bg: rgba(126,174,139,0.12); border-radius: 6px; padding: 2px 8px` |
| 체크박스 | `width: 22px; height: 22px; border-radius: 6px; border: 2px solid var(--border)` |
| 체크박스 (선택) | `bg: var(--accent-social); border-color: var(--accent-social)`, 흰색 체크 아이콘 |
| 체크박스 (비활성) | `opacity: 0.3; pointer-events: none` |
| 행 | `padding: 12px 0; border-bottom: 1px solid var(--border)` |

#### `src/presentation/components/share/share-to-bubble-sheet.tsx`

```typescript
interface ShareToBubbleSheetProps {
  recordId: string;
  /** 시트 열림/닫힘 */
  open: boolean;
  onClose: () => void;
  /** 공유 완료 콜백 */
  onShareComplete?: (sharedBubbleIds: string[]) => void;
}
```

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
| 시트 | S5에서 구현한 공통 `BottomSheet` 컴포넌트 사용 |
| 제목 | `font-size: 17px; font-weight: 800; color: var(--text)` |
| 닫기 | `x` lucide 20px, `color: var(--text-hint)` |
| CTA 버튼 | `width: 100%; padding: 14px; border-radius: 12px; font-size: 15px; font-weight: 700` |
| CTA 활성 | `bg: var(--accent-social); color: #fff` |
| CTA 비활성 (선택 0) | `bg: var(--bg-section); color: var(--text-hint); pointer-events: none` |
| CTA 텍스트 | 선택 N개: "공유 (N개)", 선택 0개: "버블을 선택해주세요" |

**프라이버시 차단 시**:
- `canShare === false`이면 시트 대신 토스트: "비공개 프로필은 공유할 수 없습니다"
- 시트 열지 않음

**동작 플로우**:

```
1. 시트 열림 → useShareRecord(recordId) 호출
2. availableBubbles 로드 (이미 공유된 것은 isAlreadyShared=true)
3. 유저가 체크박스로 버블 선택 (이미 공유된 버블은 선택 불가)
4. "공유 (N개)" CTA 탭
   → shareToBubbles(selectedIds)
   → 각 버블에 INSERT bubble_shares
   → XP +1 per share
   → onShareComplete 콜백
   → 시트 닫힘
   → 토스트: "N개 버블에 공유했어요"
```

### 4. 기록 상세 통합 (방법 2)

기록 상세 페이지 헤더의 `share-2` 아이콘 탭 → `ShareToBubbleSheet` 열기.

```typescript
// record-detail-container.tsx 내부
const [shareOpen, setShareOpen] = useState(false);

// 헤더 액션
<IconButton icon="share-2" onClick={() => setShareOpen(true)} />

// 시트
<ShareToBubbleSheet
  recordId={recordId}
  open={shareOpen}
  onClose={() => setShareOpen(false)}
/>
```

### 5. 기록 성공 화면 통합 (방법 1)

기록 저장 성공 후 `pref_bubble_share` 설정에 따라:

```typescript
// record-success 화면에서
const { pref_bubble_share } = currentUser;

useEffect(() => {
  if (pref_bubble_share === 'ask') {
    setShareSheetOpen(true);        // 시트 자동 표시
  } else if (pref_bubble_share === 'auto') {
    // 기본 버블(가장 최근 공유한 버블)에 자동 공유
    autoShare();
  }
  // 'never': 아무것도 안 함
}, []);
```

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
  → <ShareToBubbleSheet recordId={id} />
    → useShareRecord(recordId)
      → 프라이버시 검증: users.privacy_profile !== 'private'
      → 소속 버블 조회: bubble_members WHERE user_id = me
      → 이미 공유된 버블 조회: bubble_shares WHERE record_id
      → availableBubbles[] (isAlreadyShared 마킹)
    → <BubbleSelectList> 렌더
    → 유저 선택 → CTA 탭
      → shareToBubbles([id1, id2])
        → INSERT bubble_shares × N
        → XP: social_share +1 × N
        → SWR mutate (기록 상세 + 버블 피드 갱신)
      → 토스트 "2개 버블에 공유했어요"
      → 시트 닫힘

[공유 취소]
  → cancelShare(bubbleId)
    → DELETE bubble_shares WHERE record_id AND bubble_id
    → 고아 댓글 유지 (DELETE 안 함)
    → SWR mutate
    → 토스트 "공유가 취소되었어요"
```

---

## 검증 체크리스트

```
□ 방법 1: 기록 성공 후 pref_bubble_share='ask' → 시트 자동 표시
□ 방법 1: pref_bubble_share='auto' → 자동 공유 (시트 생략)
□ 방법 1: pref_bubble_share='never' → 시트 미표시
□ 방법 2: 기록 상세 share-2 아이콘 → 시트 열림
□ 버블 선택 리스트: 소속 버블 전체 표시
□ 이미 공유된 버블: "공유됨" 뱃지 + 체크박스 비활성
□ 공유 → bubble_shares INSERT 확인
□ 공유 → XP social_share +1 확인
□ 공유 취소 → bubble_shares DELETE 확인
□ 공유 취소 → 고아 댓글 유지 (comments 삭제 안 됨)
□ privacy_profile='private' → 토스트 "비공개 프로필은 공유할 수 없습니다" + 시트 미열림
□ 동반자(companions) 절대 비공유 확인
□ 가격(price_total) 버블 내에서만 표시, 프로필 방문자에게 숨김
□ 버블 간 격리: 버블X 공유 → 버블Y에서 미노출
□ 360px 레이아웃 정상
□ R1~R5 위반 없음
□ pnpm build / lint 통과
```
