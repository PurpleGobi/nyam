# 기록 수정 페이지 개선 — 구현 계획서

> 작성일: 2026-03-18
> 관련: DESIGN_SPEC 5-4, TECH_SPEC 3장 스키마, record-edit-container.tsx

---

## 1. 현황 분석

### 1-1. 현재 수정 페이지에 표시되는 필드

| 섹션 | 필드 | 수정 가능 |
|------|------|----------|
| 기본 정보 | menuName, genre, scene, visibility, companionCount, totalCost, flavorTags, textureTags, comment | O |
| 와인 전용 | pairingFood, purchasePrice | O |
| 레스토랑 전용 | aiRestaurantName | O |
| 평가 | rating 전체 (타입별) | O |
| AI 분석 | aiOrderedItems, aiMenuItems, tasteValues(6축), wineInfo(5필드), wineTastingValues(7축) | O |
| 블로그 | blogTitle, blogContent | O |

### 1-2. 누락된 필드 (데이터 모델에 존재하지만 미표시)

#### A. AI 분석 결과 — 미표시

| 필드 | 소스 | 표시 필요 | 수정 가능 여부 |
|------|------|----------|--------------|
| `receiptData` (totalCost, perPersonCost, itemCount) | AI OCR | O | 읽기 전용 |
| `companionData` (count, occasion) | AI 추정 | O | 읽기 전용 |
| `photoClassifications` (사진 유형/설명) | AI 분류 | O | 읽기 전용 |
| `estimatedVisitTime` | AI 추정 | O | 읽기 전용 |
| `confidenceScore` (전체 분석 신뢰도) | AI | O | 읽기 전용 |
| `wineInfo.estimatedPriceKrw` | AI 추정 | O | O (수정 가능) |
| `wineInfo.criticScore` | AI 외부 DB | O | 읽기 전용 |

#### B. 레코드 필드 — 미표시

| 필드 | 표시 필요 | 수정 가능 여부 | 사유 |
|------|----------|--------------|------|
| `ratingOverall` | O | 읽기 전용 | 자동 계산값 |
| `pricePerPerson` | O | 읽기 전용 | totalCost/companionCount 자동 계산 |
| `visitTime` | O | O | 사용자가 수정 가능한 방문 시간 |
| `atmosphereTags` | O | O | 기존 flavorTags/textureTags와 동일한 태그 UI |
| `subGenre` | O | O | 보조 장르 선택 |
| `locationLat/locationLng` | O | 읽기 전용 | GPS 자동 기록, 지도로 표시 |
| `phaseStatus` | O | 읽기 전용 | 시스템 관리 |
| `scaledRating` | O (Phase 3+) | 읽기 전용 | Elo 알고리즘 산출 |
| `comparisonCount` | O (Phase 3+) | 읽기 전용 | 비교 게임 횟수 |
| `aiRecognized` | O | 읽기 전용 | AI 인식 여부 뱃지 |
| `completenessScore` | O | 읽기 전용 | 시스템 산출 |

#### C. Taste Profile 메타 — 미표시

| 필드 | 표시 필요 | 수정 가능 여부 |
|------|----------|--------------|
| `source` (ai/manual) | O | 읽기 전용 (뱃지) |
| `confidence` | O | 읽기 전용 |
| Wine User WSET (7축 사용자 입력분) | O | O |
| `summary` | O | 읽기 전용 |

---

## 2. 개선 목표

1. **모든 데이터를 한 곳에서 확인** — AI 수집 + 사용자 입력 필드를 빠짐없이 표시
2. **수정 불가 항목 명확 표시** — disabled 상태 + 터치 시 사유 토스트/툴팁
3. **AI 미추출 데이터 표시** — "AI가 추출하지 못했습니다" 빈 상태 표현
4. **데이터 출처 구분** — AI 분석값 vs 사용자 입력값 뱃지

---

## 3. UI 구조 (개선안)

```
Header
├─ [←] 기록 수정
└─ Phase 뱃지 (Phase 1/2/3) + 완성도 N%

Photo Preview (수정 불가)
├─ 사진 썸네일 가로 스크롤 (최대 4장)
├─ 각 사진 하단: AI 분류 뱃지 (음식/메뉴판/영수증/간판)
└─ "사진은 수정할 수 없습니다" 안내

Section 1: 기본 정보 (Store 아이콘)
├─ 상호명 [restaurant] — 수정 가능, AI 인식 뱃지 표시
├─ 메뉴명 — 수정 가능
├─ 장르 — 수정 가능 (ChipSelect)
├─ 보조 장르 — 수정 가능 (ChipSelect, 선택사항)
├─ 상황(Scene) — 수정 가능 (ChipSelect)
├─ 공개 범위 — 수정 가능 (3-way Segment)
├─ 동행 인원 — 수정 가능
├─ 총 비용 — 수정 가능
├─ 1인당 비용 — 읽기 전용 (자동 계산, 비활성 표시)
├─ 방문 시간 — 수정 가능
├─ [Wine] 페어링 음식 — 수정 가능
├─ [Wine] 구입가 — 수정 가능
├─ 맛 태그 — 수정 가능 (ChipMultiSelect)
├─ 식감 태그 — 수정 가능 (ChipMultiSelect)
├─ 분위기 태그 — 수정 가능 (ChipMultiSelect)
├─ 위치 — 읽기 전용 (위도/경도, 미니맵 또는 텍스트)
└─ 코멘트 — 수정 가능 (textarea)

Section 2: 평가 (Star 아이콘)
├─ RatingScales (타입별 슬라이더)
└─ 종합 점수 — 읽기 전용 표시 (자동 계산)

Section 3: AI 분석 결과 (Brain 아이콘)
├─ 분석 상태 헤더
│   ├─ 신뢰도 뱃지: "AI 신뢰도 87%"
│   └─ 추정 방문시간: "18:30경 추정"
│
├─ [Restaurant] AI 인식 정보
│   ├─ 영수증 분석 — 읽기 전용
│   │   ├─ 합계: ₩45,000 / 1인당: ₩15,000 / 항목수: 3
│   │   └─ 데이터 없으면: "영수증을 인식하지 못했습니다"
│   ├─ 동행 추정 — 읽기 전용
│   │   ├─ 추정 인원: 3명 / 상황: 친구모임
│   │   └─ 데이터 없으면: "동행 정보를 추정하지 못했습니다"
│   ├─ AI 추정 메뉴 — 수정 가능 (EditableList)
│   └─ 메뉴판 OCR — 수정 가능 (EditableList)
│
├─ [Restaurant/Cooking] 맛 프로필 6축 — 수정 가능
│   ├─ 출처 뱃지: "AI 분석" 또는 "직접 입력"
│   └─ 신뢰도 표시
│
├─ [Wine] 와인 정보 — 부분 수정 가능
│   ├─ 와인명/빈티지/와이너리/원산지/품종 — 수정 가능
│   ├─ AI 추정가 — 수정 가능
│   ├─ 평론가 점수 — 읽기 전용 (외부 DB 기반)
│   └─ 데이터 없으면: "와인 정보를 인식하지 못했습니다"
│
├─ [Wine] AI 테이스팅 노트 (WSET 7축) — 수정 가능
│   ├─ AI 분석값 vs 사용자 입력값 탭 전환
│   └─ 출처 뱃지
│
├─ 사진 분류 결과 — 읽기 전용
│   └─ 각 사진: [음식/메뉴판/영수증/간판] + 설명
│
└─ 맛 요약 (AI summary) — 읽기 전용

Section 4: 블로그 (BookOpen 아이콘, Phase 3+)
├─ 제목 — 수정 가능
└─ 본문 — 수정 가능

Section 5: 시스템 정보 (Info 아이콘) — 모두 읽기 전용
├─ Phase 상태: Phase 2 완료 (2026-03-15)
├─ 완성도: 85%
├─ [Phase 3+] Elo 보정 점수: 78.3
├─ [Phase 3+] 비교 횟수: 12회
└─ 생성일: 2026-03-10

Section 6: 액션 (RotateCcw 아이콘)
├─ AI 재분석 버튼
└─ 안내 텍스트

Save Button (fixed bottom)
```

---

## 4. 읽기 전용 필드 처리

### 4-1. 비활성화 스타일

```
배경: bg-neutral-50
텍스트: text-neutral-400
커서: cursor-not-allowed
테두리: border-neutral-100 (평상시보다 연하게)
```

### 4-2. 수정 시도 시 안내 메시지 (toast)

| 필드 | 안내 메시지 |
|------|-----------|
| ratingOverall | "종합 점수는 개별 평가 항목에서 자동 계산됩니다" |
| pricePerPerson | "1인당 비용은 총 비용과 동행 인원에서 자동 계산됩니다" |
| receiptData | "영수증 데이터는 AI 분석 결과입니다. 재분석으로 업데이트할 수 있습니다" |
| companionData | "동행 추정은 AI 분석 결과입니다" |
| photoClassifications | "사진 분류는 AI가 자동으로 수행합니다" |
| estimatedVisitTime | "방문 시간 추정은 AI 분석 결과입니다" |
| confidenceScore | "신뢰도는 AI가 자동으로 산출합니다" |
| criticScore | "평론가 점수는 외부 데이터베이스에서 가져옵니다" |
| scaledRating | "보정 점수는 비교 게임을 통해 자동 산출됩니다" |
| comparisonCount | "비교 횟수는 시스템이 자동 관리합니다" |
| completenessScore | "완성도는 입력된 데이터 기준으로 자동 계산됩니다" |
| locationLat/Lng | "위치는 기록 시 자동 저장됩니다" |
| phaseStatus | "Phase는 시스템이 자동 관리합니다" |
| source/confidence (taste) | "분석 출처와 신뢰도는 AI가 자동 결정합니다" |
| summary (taste) | "맛 요약은 AI가 자동 생성합니다" |

---

## 5. AI 미추출 데이터 표시

AI가 추출하지 못한 필드는 값이 `null`인 경우:

```
┌─────────────────────────────────┐
│ [Brain icon] 영수증 분석         │
│ AI가 영수증을 인식하지 못했습니다    │
│ (text-neutral-400, text-xs)     │
└─────────────────────────────────┘
```

- 영수증 데이터 없음 → "영수증을 인식하지 못했습니다"
- 동행 추정 없음 → "동행 정보를 추정하지 못했습니다"
- 와인 정보 없음 → "와인 정보를 인식하지 못했습니다"
- 맛 프로필 전체 0 → "맛 프로필이 아직 분석되지 않았습니다"
- 사진 분류 없음 → "사진 분류 결과가 없습니다"
- 맛 요약 없음 → "맛 요약이 아직 생성되지 않았습니다"

---

## 6. 데이터 출처 뱃지

| 뱃지 | 스타일 | 적용 대상 |
|------|--------|----------|
| AI 분석 | `bg-blue-50 text-blue-600 text-[10px]` | AI가 자동 추출한 값 |
| 직접 입력 | `bg-green-50 text-green-600 text-[10px]` | 사용자가 직접 입력한 값 |
| 자동 계산 | `bg-neutral-100 text-neutral-500 text-[10px]` | ratingOverall, pricePerPerson 등 |
| 외부 DB | `bg-purple-50 text-purple-600 text-[10px]` | criticScore 등 |

---

## 7. 구현 단계

### Step 1: 도메인/인터페이스 확인 (변경 없음 예상)
- `record.ts` 엔티티 — 이미 모든 필드 정의됨
- `record-repository.ts` — 읽기 메서드는 이미 전체 데이터 반환
- 추가 필요: `atmosphereTags` 업데이트가 `updateRecord`에서 지원되는지 확인

### Step 2: application hook 확인
- `use-record-detail.ts` — 이미 record, aiAnalysis, tasteProfile, journal 전부 fetch
- `use-edit-record.ts` — `updateRecord`에 `atmosphereTags`, `visitTime`, `subGenre` 전달 가능한지 확인
- 필요시 `UpdateRecordInput` 타입에 `atmosphereTags`, `visitTime`, `subGenre` 추가

### Step 3: record-edit-container.tsx 개선
1. **새 state 추가**:
   - `visitTime`, `subGenre`, `atmosphereTags`
   - Wine user WSET values (7축)
2. **초기화 로직에 누락 필드 추가**
3. **UI 섹션 재구성** (위 구조안 반영)
4. **읽기 전용 필드 표시 컴포넌트 추가**:
   - `ReadOnlyField` — 비활성 스타일 + 클릭 시 toast
   - `SourceBadge` — AI/수정/자동계산 뱃지
   - `EmptyAiField` — AI 미추출 빈 상태
5. **저장 로직에 새 필드 반영**

### Step 4: 서브 컴포넌트 (인라인 vs 분리 판단)
- `ReadOnlyField`, `SourceBadge`, `EmptyAiField` → 이 페이지에서만 사용되므로 container 파일 내 인라인 sub-component로 유지
- 사진 썸네일 프리뷰 → 기존 `RecordPhoto` 타입 활용, 인라인 구현

### Step 5: DESIGN_SPEC 업데이트
- Section 5-4 기록 수정 와이어프레임 및 필드 목록 확장

---

## 8. 필드 분류 총정리

### 수정 가능 (User Editable)

| 필드 | 타입별 | 현재 구현 | 추가 필요 |
|------|--------|----------|----------|
| menuName | 공통 | O | — |
| genre | 공통 | O | — |
| subGenre | 공통 | X | **추가** |
| scene | 공통 | O | — |
| visibility | 공통 | O | — |
| companionCount | 공통 | O | — |
| totalCost | 공통 | O | — |
| visitTime | 공통 | X | **추가** |
| comment | 공통 | O | — |
| flavorTags | 공통 | O | — |
| textureTags | 공통 | O | — |
| atmosphereTags | 공통 | X | **추가** |
| pairingFood | Wine | O | — |
| purchasePrice | Wine | O | — |
| rating 전체 | 공통 (타입별) | O | — |
| aiRestaurantName | Restaurant | O | — |
| aiOrderedItems | Restaurant | O | — |
| aiMenuItems | Restaurant | O | — |
| tasteValues (6축) | Restaurant/Cooking | O | — |
| wineInfo (name/vintage/winery/origin/variety) | Wine | O | — |
| wineInfo.estimatedPriceKrw | Wine | X | **추가** |
| wineTastingValues (AI 7축) | Wine | O | — |
| Wine User WSET (7축) | Wine | X | **추가** |
| blogTitle | 공통 (Phase 3+) | O | — |
| blogContent | 공통 (Phase 3+) | O | — |

### 읽기 전용 (Read-Only Display)

| 필드 | 타입별 | 추가 필요 | 비활성 사유 |
|------|--------|----------|-----------|
| ratingOverall | 공통 | **추가** | 자동 계산 (개별 rating 평균) |
| pricePerPerson | 공통 | **추가** | 자동 계산 (totalCost / companionCount) |
| receiptData | Restaurant | **추가** | AI OCR 결과 |
| companionData | Restaurant | **추가** | AI 추정 결과 |
| photoClassifications | 공통 | **추가** | AI 자동 분류 |
| estimatedVisitTime | 공통 | **추가** | AI 추정 |
| confidenceScore | 공통 | **추가** | AI 산출 |
| wineInfo.criticScore | Wine | **추가** | 외부 DB |
| tasteProfile.source | 공통 | **추가** | 시스템 관리 |
| tasteProfile.confidence | 공통 | **추가** | AI 산출 |
| tasteProfile.summary | 공통 | **추가** | AI 생성 |
| locationLat/Lng | 공통 | **추가** | 기록 시 자동 저장 |
| phaseStatus | 공통 | **추가** | 시스템 관리 |
| phase completedAt | 공통 | **추가** | 시스템 관리 |
| scaledRating | 공통 (Phase 3+) | **추가** | Elo 알고리즘 |
| comparisonCount | 공통 (Phase 3+) | **추가** | 시스템 관리 |
| completenessScore | 공통 | **추가** | 시스템 산출 |
| aiRecognized | Restaurant | **추가** | 시스템 관리 |
| createdAt | 공통 | **추가** | 시스템 관리 |

---

## 9. 문서 업데이트 필요 사항

### DESIGN_SPEC.md — Section 5-4 확장
- 현재: 6줄짜리 간략 설명
- 변경: 전체 와이어프레임 + 필드 목록 + 읽기 전용 처리 규칙 + 빈 상태 표현

### TECH_SPEC.md — 해당 사항 확인
- `UpdateRecordInput`에 `atmosphereTags`, `visitTime`, `subGenre` 포함 여부 확인
- 수정 API의 입출력 필드 목록이 이 계획과 일치하는지 확인

### PRD.md — 변경 불필요 (기능 범위 변경 없음, UI 개선)

---

## 10. 리스크 & 고려사항

| 리스크 | 대응 |
|--------|------|
| 필드가 너무 많아 UX가 복잡해질 수 있음 | 섹션 접기(collapsible) 고려. 시스템 정보 섹션은 기본 접힘 |
| 읽기 전용 필드 클릭 시 toast 남발 | toast는 동일 메시지 중복 표시 방지 (debounce) |
| Wine user WSET와 AI WSET 동시 표시 혼란 | 탭 UI로 분리: "AI 분석" / "내 테이스팅" |
| 사진 분류 데이터가 없는 기존 레코드 | EmptyAiField로 graceful 처리 |
| atmosphereTags 상수 정의 여부 | shared/constants/tags.ts에 ATMOSPHERE_TAGS 존재 여부 확인 필요 |
