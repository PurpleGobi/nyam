# SETTINGS — 설정

> depends_on: AUTH, DATA_MODEL, DESIGN_SYSTEM, BUBBLE
> route: /settings
> prototype: `prototype/05_settings.html`
> entry: 프로필 헤더 ⚙ 아이콘 / 아바타 드롭다운 "설정"
> header: AppHeader (공용 앱 헤더) + FabBack (플로팅 뒤로가기)

---

## 0. 페이지 구조 & 컴포넌트

### 레이아웃

```
┌─────────────────────────────┐
│ AppHeader (공용 앱 헤더)     │
│ FabBack (플로팅 뒤로가기)    │
├─────────────────────────────┤
│ ScrollArea                  │
│  ├─ 계정 섹션               │
│  ├─ 프라이버시 섹션          │
│  │   ├─ 기본 공개 대상 (Segment) │
│  │   ├─ 기록 범위 (Segment)     │
│  │   ├─ 상태 요약 텍스트         │
│  │   ├─ [전체 공개 토글 레이어]  │
│  │   ├─ [버블 기본 토글 레이어]  │
│  │   ├─ [버블별 설정 레이어]     │
│  │   └─ 프라이버시 안내 노트     │
│  ├─ 알림 섹션               │
│  ├─ 화면 디폴트 섹션         │
│  ├─ 기능 디폴트 섹션         │
│  ├─ 데이터 섹션             │
│  ├─ 정보 섹션               │
│  └─ 계정 관리 섹션           │
├─────────────────────────────┤
│ [Overlay + BottomSheet]     │
│  ├─ 버블별 프라이버시 시트   │
│  ├─ 계정 삭제 시트           │
│  ├─ 닉네임/소개 수정 시트    │
│  └─ 방해 금지 설정 시트      │
└─────────────────────────────┘
```

### 컴포넌트 계층

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `SettingsContainer` | Container | 전체 페이지 상태 관리 |
| `AppHeader` | 공용 | 앱 공용 헤더 |
| `FabBack` | 공용 | 플로팅 뒤로가기 버튼 |
| `SettingsSection` | Component | 섹션 타이틀 + SettingsCard 래퍼 |
| `SettingsCard` | Component | 둥근 카드 (border-radius: 12px) |
| `SettingsItem` | Component | 아이콘 + 라벨 + hint/subText + (값/토글/셀렉트/chevron) |
| `Toggle` | Component | ON/OFF 토글 스위치 |
| `NyamSelect` | Component (ui/) | 인라인 드롭다운 (셀렉트 → 드롭다운 패널) |
| `SegmentControl` | Component | 3단/2단 세그먼트 (프라이버시용) |
| `PrivacyLayer` | Component | 조건부 표시 레이어 (애니메이션 show/hide) |
| `PrivacySummary` | Component | 프라이버시 조합별 상태 요약 텍스트 |
| `PrivacyNote` | Component | 프라이버시 안내 4개 항목 (비공개 모드가 아닐 때 표시) |
| `BubblePrivacySheet` | Component | 바텀 시트 — 버블별 기본값/커스텀 선택 |
| `DeleteAccountSheet` | Component | 바텀 시트 — 계정 삭제 플로우 |
| `EditFieldSheet` | Component | 바텀 시트 — 닉네임/소개 수정 (글자수 카운터) |
| `DndSheet` | Container 내부 | 바텀 시트 — 방해 금지 시간 설정 (시작/종료 time picker) |

### 인터랙션 패턴

| UI 요소 | 동작 |
|---------|------|
| `SettingsItem` + chevron | 바텀 시트 열기 또는 액션 실행 |
| `Toggle` | 즉시 토글, 서버 동기화 (optimistic update) |
| `NyamSelect` | 클릭 → 드롭다운 열림, 항목 선택 → 닫힘 + 값 반영 |
| `SegmentControl` | 탭 선택 → 하위 레이어 show/hide 애니메이션 |
| `PrivacyLayer` | max-height + opacity transition (0.35s / 0.25s) |
| 바텀 시트 | overlay(0.35 opacity) + translateY 슬라이드, max-height 75% |

---

## 1. 설정 항목 요약

### 계정

| 항목 | 아이콘 | UI 타입 | 비고 |
|------|--------|---------|------|
| 닉네임 변경 | pencil | SettingsItem + 현재값 + chevron | 현재 닉네임 표시 |
| 한줄 소개 변경 | message-square | SettingsItem + chevron | |
| 아바타 변경 | image | SettingsItem + chevron | 갤러리/카메라 |

### 프라이버시 — 계층형 공개 설정
→ 상세: §2~§6 참조

#### Step 1: 기본 공개 대상 (세그먼트 컨트롤)

| 항목 | 옵션 | 기본값 | DB 필드 |
|------|------|--------|---------|
| 기본 공개 대상 | 전체 공개 / 버블만 / 비공개 | 버블만 | `users.privacy_profile` |
| 기록 공개 범위 | 공유한 기록만 / 모든 기록 | 공유한 기록만 | `users.privacy_records` |

> UI 라벨: "기록은 어디까지?" (인라인 서브 라벨)
> 비공개 선택 시 기록 범위 셀렉터 숨김, 버블 공유 불가
> `privacy_records`는 `'all'` / `'shared_only'` 2가지만 존재 — "완전 비공개"는 `privacy_profile = 'private'`로 제어 (records 값과 무관하게 모든 기록 비공개)

**상태 요약 텍스트** (SegmentControl 아래 `PrivacySummary` 컴포넌트):

| 조합 | 요약 텍스트 |
|------|------------|
| 전체 + 공유만 | "모든 사용자가 프로필을 볼 수 있습니다. 버블에 공유한 기록만 해당 버블에서 보입니다." |
| 전체 + 모든 기록 | "모든 사용자가 프로필을 볼 수 있습니다. 내 모든 기록이 공개됩니다." |
| 버블만 + 공유만 | "같은 버블 멤버만 프로필을 볼 수 있고, 내가 공유한 기록만 해당 버블에서 보입니다." |
| 버블만 + 모든 기록 | "같은 버블 멤버만 프로필을 볼 수 있고, 내 모든 기록을 볼 수 있습니다." |
| 비공개 | "프로필과 기록이 나에게만 보입니다. 버블 공유도 불가합니다. 추천 알고리즘에는 여전히 반영됩니다." |

#### Step 2: 전체에게 보이는 항목 (전체 공개 시에만 노출)

> UI: `PrivacyLayer` — `privacy_profile = 'public'`일 때만 visible
> 레이어 헤더: 초록 dot + "전체에게 보이는 항목"
> 하단 노트: "프로필 방문자·검색 결과 등에서 모든 사용자에게 보이는 범위"

| 항목 | 아이콘 | 기본값 | DB 필드 |
|------|--------|--------|---------|
| 점수 | star | ON | `users.visibility_public.score` |
| 한줄평 | message-circle | ON | `users.visibility_public.comment` |
| 사진 | image | ON | `users.visibility_public.photos` |
| 레벨 뱃지 | award | ON | `users.visibility_public.level` |
| 사분면 | scatter-chart | ON | `users.visibility_public.quadrant` |
| 소속 버블 | circle-dot | OFF | `users.visibility_public.bubbles` |
| 가격 정보 | wallet | — | `users.visibility_public.price` (항상 false, 토글 없음, "버블에서만" 힌트, opacity 0.5) |

> DB: `users.visibility_public` JSONB — 7개 키 모두 포함

#### Step 3: 버블 멤버 기본 공개 (전체/버블만 시 노출)

> UI: `PrivacyLayer` — `privacy_profile != 'private'`일 때 visible
> 레이어 헤더: 파랑 dot (accent-social) + "버블 멤버 기본 공개"
> 하단 노트: "모든 버블의 기본값입니다. 아래에서 버블별로 다르게 설정할 수 있습니다."

| 항목 | 아이콘 | 기본값 | DB 필드 |
|------|--------|--------|---------|
| 점수 | star | ON | `users.visibility_bubble.score` |
| 한줄평 | message-circle | ON | `users.visibility_bubble.comment` |
| 사진 | image | ON | `users.visibility_bubble.photos` |
| 레벨 뱃지 | award | ON | `users.visibility_bubble.level` |
| 사분면 | scatter-chart | ON | `users.visibility_bubble.quadrant` |
| 소속 버블 | circle-dot | ON | `users.visibility_bubble.bubbles` |
| 가격 정보 | wallet | ON | `users.visibility_bubble.price` |

> DB: `users.visibility_bubble` JSONB — 모든 버블의 기본값. 버블별로 오버라이드 가능

#### Step 4: 버블별 커스텀 설정

> UI: `PrivacyLayer` — `privacy_profile != 'private'`일 때 visible
> 레이어 헤더: 노랑 dot (caution) + "버블별 설정"

- 가입한 버블 목록 표시 (아바타 + 이름 + 기본값/커스텀 뱃지 + chevron)
- 클릭 → `BubblePrivacySheet` 바텀 시트 열림
- 시트 내부: 라디오 선택 (기본값 사용 / 커스텀 설정)
  - 기본값 사용: "버블 멤버 기본 공개 설정을 따릅니다"
  - 커스텀 설정: "이 버블에서 보이는 항목을 개별로 설정합니다"
- 커스텀 선택 시 동일한 7개 VisibilityConfig 필드별 토글 노출 (라벨은 축약형 사용: 코멘트/레벨/버블 목록/가격)
- DB: `bubble_members.visibility_override` JSONB (NULL이면 기본값 사용, JSONB면 커스텀)
- 버블 owner의 공개수위가 더 제한적이면 버블 설정 우선

**프라이버시 안내 노트** (`privacy_profile !== 'private'`일 때 표시):
- 동반자 정보는 항상 비공개입니다 (나만 열람)
- OFF로 설정해도 나에게는 항상 표시됩니다
- 버블 owner의 공개수위가 더 제한적이면 버블 설정 우선
- 추천 알고리즘에는 설정과 무관하게 항상 반영됩니다

#### 동반자 정보
- `records.companions` (이름 목록): **무조건 비공개** — 나만 열람, 설정 토글 없음, API/버블/프로필 등 외부 노출 절대 금지
- `records.companion_count` (인원수): 별개 필드 — 필터/통계용으로 활용 가능 (비공개 아님)

### 알림

| 항목 | 아이콘 | UI 타입 | 기본값 | 설명 |
|------|--------|---------|--------|------|
| 푸시 알림 | bell | Toggle | ON | 전체 푸시 알림 마스터 스위치 |
| 레벨업 알림 | trophy | Toggle | ON | 영역별 레벨 달성 시 알림 |
| 버블 가입 알림 | circle-dot | Toggle | ON | 가입신청/승인 알림 |
| 팔로우 알림 | user-plus | Toggle | ON | 팔로우 요청/수락 알림 |
| 방해 금지 | moon | SettingsItem + 현재값 + chevron | 꺼짐 | 설정 시간 내 푸시 차단 (인앱은 누적). 클릭 → DndSheet 바텀 시트 (시작/종료 time picker, 초기 placeholder 23:00–08:00) |

### 화면 디폴트

| 항목 | 아이콘 | 옵션 | 기본값 | DB 필드 |
|------|--------|------|--------|---------|
| 랜딩 화면 | home | 마지막 사용 / 홈 / 버블 / 프로필 | 마지막 사용 | `users.pref_landing` |
| 홈 시작 탭 | utensils | 마지막 사용 / 식당 / 와인 | 마지막 사용 | `users.pref_home_tab` |
| 식당 서브탭 | map-pin | 마지막 사용 / 방문 / 찜 / 팔로잉 | 마지막 사용 | `users.pref_restaurant_sub` |
| 와인 서브탭 | wine | 마지막 사용 / 시음 / 찜 / 셀러 | 마지막 사용 | `users.pref_wine_sub` |
| 버블 시작 탭 | circle-dot | 마지막 사용 / 버블 / 버블러 | 마지막 사용 | `users.pref_bubble_tab` |
| 홈 보기 모드 | layout-grid | 마지막 사용 / 상세 / 간단 / 캘린더 | 마지막 사용 | `users.pref_view_mode` |

> UI: 모든 항목은 `NyamSelect` 인라인 드롭다운 사용
> 각 항목에 `SettingsItem`의 `hint` prop으로 서브텍스트 표시:

| 항목 | hint 텍스트 |
|------|------------|
| 랜딩 화면 | 앱 실행 시 첫 화면 |
| 홈 시작 탭 | 홈 진입 시 식당/와인 |
| 식당 서브탭 | 식당 탭 진입 시 기본 필터 |
| 와인 서브탭 | 와인 탭 진입 시 기본 필터 |
| 버블 시작 탭 | 버블 페이지 진입 시 탭 |
| 홈 보기 모드 | 리스트 간단/상세 |

### 기능 디폴트

| 항목 | 아이콘 | 옵션 | 기본값 | DB 필드 |
|------|--------|------|--------|---------|
| 기본 정렬 | arrow-up-down | 최신순 / 점수 높은순 / 점수 낮은순 / 이름순 / 방문 많은순 | 최신순 | `users.pref_default_sort` |
| 기록 시 카메라 | camera | 카메라 우선 / 검색 우선 | 카메라 우선 | `users.pref_record_input` |
| 기록 후 버블 공유 | share-2 | 매번 물어보기 / 자동 공유 / 공유 안 함 | 매번 물어보기 | `users.pref_bubble_share` |
| 와인 온도 단위 | thermometer | °C / °F | °C | `users.pref_temp_unit` |
| 타임존 | globe | 브라우저 감지 기반 타임존 목록 | 브라우저 자동 감지 | `users.pref_timezone` |

> UI: NyamSelect 인라인 드롭다운 사용 (타임존 미설정 시 브라우저 타임존 자동 감지하여 저장)
> 타임존 항목에 `hint="날짜·시간 표시 기준"` 표시

| 항목 | 아이콘 | UI 타입 | 비고 |
|------|--------|---------|------|
| 수동 공유 항목 정리 | unlink | SettingsItem + 결과 텍스트 + chevron | 필터 규칙에 맞지 않는 수동 공유 항목 정리. 클릭 시 즉시 실행, 결과 표시 |

### 데이터

| 항목 | 아이콘 | UI 타입 | 비고 |
|------|--------|---------|------|
| 데이터 내보내기 | upload | SettingsItem + "JSON / CSV" 힌트 + chevron | |
| 데이터 가져오기 | download | SettingsItem + "JSON / CSV" 힌트 + chevron | |
| 캐시 삭제 | eraser | SettingsItem + 용량 표시 + chevron | 현재 캐시 크기 표시 (예: "12.3 MB") |

### 정보

| 항목 | 아이콘 | UI 타입 |
|------|--------|---------|
| 이용약관 | scroll-text | SettingsItem + chevron |
| 개인정보처리방침 | shield | SettingsItem + chevron |
| 버전 | info | SettingsItem + 버전 텍스트 (chevron 없음) |

### 계정 관리

| 항목 | 아이콘 | UI 타입 | 비고 |
|------|--------|---------|------|
| 로그아웃 | log-out | SettingsItem + chevron | 즉시 로그아웃 (확인 없음) |
| 계정 삭제 | trash-2 | SettingsItem (danger 스타일) + chevron | 빨간색 텍스트, 서브텍스트 "30일 유예 후 영구 삭제", 클릭 → DeleteAccountSheet |

---

## 2. 프로필 공개 범위 (`privacy_profile`)

**누가 내 프로필 페이지를 볼 수 있는가?**

| 설정 | 볼 수 있는 사람 | 검색 노출 | 팔로우 가능 |
|------|----------------|-----------|------------|
| `public` | 모든 사용자 | O | O |
| `bubble_only` | 같은 버블 멤버만 | X | X |
| `private` | 나만 | X | X |

### 프로필에서 보이는 정보 (공개 범위 통과 시)

| 항목 | 항상 표시 | 대상별 토글 영향 |
|------|-----------|-----------------|
| 아바타 + 닉네임 + 레벨 뱃지 | O | `visibility_public.level` / `visibility_bubble.level` OFF → 레벨 뱃지 숨김 |
| 한줄 소개 | O | — |
| 미식 정체성 (태그 + 설명) | O | — |
| 숫자 요약 (기록·식당·와인 수) | O | — |
| 경험치 & 레벨 상세 | O | 대상별 `visibility_*.level` OFF → 숨김 |
| 사분면 분포 | O | 대상별 `visibility_*.quadrant` OFF → 숨김 |
| 소속 버블 목록 | O | 대상별 `visibility_*.bubbles` OFF → 숨김 |

> 토글은 **대상별로 분리**: 전체에게 보이는 항목 / 버블 멤버 기본 공개 / 버블별 커스텀 각각 독립 설정
> 프로필 + Wrapped 카드 + 버블 내 기록 옆 표시 등 **모든 외부 노출 지점**에 일괄 적용

---

## 3. 기록 공개 범위 (`privacy_records`)

**내 기록물을 누가 어디서 볼 수 있는가?**

### 3-1. 설정 값 정의

| 설정 | 의미 |
|------|------|
| `all` | 프로필 방문자에게 내 기록 목록 전체 공개 |
| `shared_only` | 버블에 공유한 기록만 해당 버블 멤버에게 노출. 미공유 기록은 나만 열람 |

> `privacy_records`에 `'private'` 값은 없음. 완전 비공개는 `privacy_profile = 'private'`로 달성 — 프로필 자체가 비공개이므로 기록도 자동으로 비공개, 버블 공유 불가

### 3-2. 기록 노출 매트릭스

> 행: 열람자 유형 / 열: 기록 공개 설정

| 열람자 | `all` | `shared_only` | `privacy_profile = 'private'` |
|--------|-------|---------------|-------------------------------|
| **나 자신** | 전체 | 전체 | 전체 |
| **같은 버블 멤버** (공유된 기록) | O | O | — (공유 불가) |
| **같은 버블 멤버** (미공유 기록) | O (프로필 열람 시) | X | X |
| **프로필 방문자** (비버블) | O (`privacy_profile=public`일 때) | X | X |
| **식당/와인 상세 페이지** (집계) | 익명 집계에 포함 | 익명 집계에 포함 | 익명 집계에 포함 |
| **추천 알고리즘** (내부 로직) | 반영 | 반영 | 반영 |

**핵심 원칙**:
- `privacy_records`는 **다른 사람이 내 기록을 열람할 수 있는지**를 제어
- 식당/와인 상세의 **익명 집계** (평균 점수, 사분면 분포)에는 항상 포함 — 개인 식별 불가
- **추천 알고리즘**에는 항상 반영 — 내 경험 데이터는 나를 위한 추천에 사용

### 3-3. 기록별 노출 항목

기록이 공개될 때 어디까지 보여주는가 — **대상별 토글로 제어**:

| 항목 | 전체 공개 토글 | 버블 기본 토글 | 버블별 커스텀 | 비고 |
|------|--------------|-------------|-------------|------|
| 점수 (만족도) | `visibility_public.score` | `visibility_bubble.score` | 오버라이드 가능 | 숫자 점수 숨김 시 "평가함" 표시만 남김 |
| 사분면 | `visibility_public.quadrant` | `visibility_bubble.quadrant` | 오버라이드 가능 | 사분면 좌표/차트 숨김 |
| 상황 태그 | 항상 표시 | 항상 표시 | — | — |
| 한줄평 | `visibility_public.comment` | `visibility_bubble.comment` | 오버라이드 가능 | §4 참조 |
| 사진 | `visibility_public.photos` | `visibility_bubble.photos` | 오버라이드 가능 | — |
| 메뉴 태그 / 팁 | 항상 표시 | 항상 표시 | — | — |
| 방문 날짜 | 항상 표시 | 항상 표시 | — | — |
| 가격 | 항상 X | `visibility_bubble.price` | 오버라이드 가능 | 버블 내에서만 |
| 동반자 이름 | X | X | X | **무조건 비공개** (나만 열람) |
| 동반자 수 | 표시 가능 | 표시 가능 | — | 필터/통계용, 비공개 아님 |

---

## 4. 버블 상태별 데이터 노출 규칙

### 4-1. 버블 가시성 (`bubbles.visibility` + `bubbles.join_policy`)

| 버블 상태 | 가입 정책 | 검색 가능 | 버블 존재 노출 | 가입 방식 |
|-----------|-----------|-----------|--------------|-----------|
| `private` | `invite_only` | X | 멤버에게만 | 초대 링크 / 직접 초대만 |
| `public` | `closed` | O (이름·설명만) | 검색 결과에 표시 | 팔로우만 (가입 안 받음) |
| `public` | `manual_approve` | O | 자유 열람 | 가입 신청 → 관리자 승인/거절 |
| `public` | `auto_approve` | O | 자유 열람 | 기준 충족 시 자동 가입 (min_records, min_level) |
| `public` | `open` | O | 자유 열람 | 누구나 즉시 가입 |

### 4-2. 버블 내 기록 노출 (`bubbles.content_visibility`)

**버블에 공유된 기록이 비멤버에게 어떻게 보이는가:**

| content_visibility | 버블 멤버 | 비멤버 (상세 페이지 L9) |
|--------------------|----------|----------------------|
| `rating_only` | 점수 + 한줄평 + 사진 + 메뉴 전체 | 점수만 (아바타 + Lv + 만족도 숫자) |
| `rating_and_comment` | 점수 + 한줄평 + 사진 + 메뉴 전체 | 점수 + 한줄평 |

> `content_visibility`는 식당/와인 상세 페이지의 **L9 소셜 레이어**에서 비멤버에게 보이는 범위를 제어
> 멤버에게는 항상 전체 공개 (공유한 시점에 동의한 것으로 간주)

### 4-3. 버블 가시성 × 기록 공개의 조합

| 버블 visibility | 기록 공개 = `all` | 기록 공개 = `shared_only` | `privacy_profile = 'private'` |
|-----------------|-------------------|--------------------------|-------------------------------|
| `private` | 공유 가능, 멤버만 열람 | 공유 가능, 멤버만 열람 | 공유 불가 |
| `public` (closed) | 공유 가능, 멤버만 열람 | 공유 가능, 멤버만 열람 | 공유 불가 |
| `public` (open/approve) | 공유 가능, 멤버 열람 + 비멤버는 content_visibility에 따름 | 공유 가능, 동일 | 공유 불가 |

**핵심**: `privacy_profile = 'private'`이면 어떤 버블이든 **공유 자체 차단** (공유 버튼 비활성)

### 4-4. 버블 간 기록 격리

- 기록 A를 버블 X에 공유 → 버블 Y 멤버에게는 보이지 않음
- `bubble_shares` 테이블이 기록-버블 관계를 명시적으로 관리
- 같은 기록을 여러 버블에 공유 가능 (각각 별도 `bubble_shares` 행)
- 버블에서 탈퇴 시 → 내가 공유한 기록의 `bubble_shares` 행 유지 (탈퇴 ≠ 기록 삭제)
  - 삭제 원하면 탈퇴 전 수동 회수, 또는 탈퇴 시 "공유 기록 함께 삭제" 옵션 제공

### 4-5. 한줄평 vs 버블 공유 메모

- `records.comment`: **나의 한줄평** — 기록의 일부, 항상 나에게 표시
- 버블 공유 시 이 한줄평이 `content_visibility`에 따라 멤버/비멤버에게 노출
- 별도의 "버블 전용 코멘트" 필드는 없음 — 한줄평이 곧 공유 텍스트
- 한줄평 없이 공유하면 점수만 표시

---

## 5. 대상별 토글 영향 범위

토글은 3개 레이어에서 **독립적으로** 설정:
- **전체 공개 토글** (`users.visibility_public` JSONB): 전체 공개 시 모든 사용자에게 적용
- **버블 기본 토글** (`users.visibility_bubble` JSONB): 모든 버블 멤버에게 기본 적용
- **버블별 커스텀** (`bubble_members.visibility_override` JSONB): NULL이면 기본값, JSONB면 개별 오버라이드

### 5-1. `visibility_*.level` OFF 시 영향

| 위치 | 효과 |
|------|------|
| 내 프로필 | 해당 대상에게 경험치 & 레벨 섹션 숨김 |
| Wrapped 카드 | 레벨 행 제거 |
| 버블 피드 내 내 기록 | 레벨 뱃지 숨김 |
| 식당/와인 상세 L9 | 내 기록 옆 레벨 숨김 |
| 프로필 아바타 레벨 뱃지 | 숨김 |

### 5-2. `visibility_*.quadrant` OFF 시 영향

| 위치 | 효과 |
|------|------|
| 내 프로필 | 사분면 분포 숨김 (있을 경우) |
| 버블 피드 내 내 기록 | 사분면 좌표 숨김 → 만족도 점수만 표시 |
| 식당/와인 상세 L9 | 내 사분면 점 숨김 |

### 5-3. `visibility_*.bubbles` OFF 시 영향

| 위치 | 효과 |
|------|------|
| 내 프로필 | 소속 버블 목록 숨김 |
| Wrapped 카드 | "활동 버블" 행 제거 (개인정보=공개여도) |

### 5-4. 토글 우선순위

```
버블별 커스텀 > 버블 기본 토글 > 전체 공개 토글
```

- 버블별 커스텀이 설정되면 → 버블 기본 토글 무시
- 버블 owner의 `content_visibility`가 더 제한적이면 → 개인 설정보다 우선
- 토글 OFF는 **외부 노출만 차단**. 나 자신은 항상 전체 열람 가능

---

## 6. Wrapped 공유와 프라이버시

### 6-1. Wrapped 게이지 vs 설정 관계

Wrapped 카드는 **일회성 공유 이미지**. 설정 프라이버시와 독립적으로 동작:

| 상황 | 동작 |
|------|------|
| 설정: 비공개, Wrapped: 공개 게이지 | 허용 — Wrapped는 내가 의도적으로 만드는 공유물 |
| 설정: 공개, Wrapped: 최소 게이지 | 허용 — 공유 카드에서 정보를 줄이는 건 자유 |

**단, 전체 공개 토글 연동** (Wrapped는 외부 공유이므로 `visibility_public` 적용):
- `visibility_public.level = false` → Wrapped에서도 레벨 표시 불가 (게이지 무관)
- `visibility_public.bubbles = false` → Wrapped에서도 버블 표시 불가 (개인정보=공개여도)

### 6-2. Wrapped 게이지 조합 매트릭스 (재확인)

| | 개인정보: 최소 | 개인정보: 보통 | 개인정보: 공개 |
|---|---|---|---|
| **디테일: 심플** | 익명 + 태그만 | 닉네임 + 숫자 + 태그 | + 버블 표시 |
| **디테일: 보통** | 익명 + 태그 + 레벨 | 닉네임 + 숫자 + 태그 + 레벨 | + 버블 표시 |
| **디테일: 상세** | 익명 + 태그 + 레벨 + 최애 | 닉네임 + 숫자 + 태그 + 레벨 + 최애 | 전체 공개 |

> "버블 표시"는 `visibility_public.bubbles = true`일 때만. "레벨"은 `visibility_public.level = true`일 때만.

---

## 7. 추천 시스템과 프라이버시

| 데이터 | 내 추천에 사용 | 타인 추천에 사용 | 근거 |
|--------|--------------|----------------|------|
| 내 기록 (모든 설정) | O | X (직접 사용 안 함) | 내 경험은 나를 위한 것 |
| 내 기록 (익명 집계) | — | O (평균·분포에 기여) | 개인 식별 불가 |
| 버블 공유 기록 | O (버블 추천에 반영) | 같은 버블 멤버만 | 버블 신뢰 기반 |
| private 버블 데이터 | O (내 추천에 반영) | X (버블 존재 자체 비노출) | 프라이버시 보호 |

**핵심**: `privacy_records` 설정과 무관하게 **추천 알고리즘**은 내 모든 기록을 내부적으로 사용.
외부 노출만 제어하는 것이지, 데이터 수집/분석을 차단하는 게 아님.

---

## 8. 프라이버시 조합 시나리오

### 시나리오 A: "완전 은둔형"
```
기본 공개 대상 = 비공개
```
- 프로필·기록 모두 나만 열람, 버블 공유 불가
- 순수 개인 기록장으로만 사용
- 추천은 정상 작동 (나를 위한 추천)

### 시나리오 B: "버블만 소통" (기본값)
```
기본 공개 대상 = 버블만
기록 범위 = 공유한 기록만
버블 기본: 전체 ON
```
- 같은 버블 멤버만 프로필 열람
- 내가 선택적으로 공유한 기록만 해당 버블에서 보임
- 팔로우 불가 (버블만 공개이므로 외부 검색·팔로우 차단)

### 시나리오 C: "오픈 미식가"
```
기본 공개 대상 = 전체 공개
기록 범위 = 모든 기록
전체 공개: 전체 ON
버블 기본: 전체 ON
```
- 누구나 프로필 + 전체 기록 열람
- 팔로우 가능
- 식당/와인 상세에서 내 기록이 실명으로 노출

### 시나리오 D: "기록은 공개, 정체는 반비공개"
```
기본 공개 대상 = 전체 공개
기록 범위 = 모든 기록
전체 공개: 소속 버블 OFF, 레벨 뱃지 OFF (나머지 ON)
버블 기본: 전체 ON
```
- 프로필은 공개지만 전체에게는 버블 소속·레벨 숨김
- 버블 멤버에게는 전부 공개

### 시나리오 E: "버블별 차등 공개"
```
기본 공개 대상 = 버블만
기록 범위 = 공유한 기록만
버블 기본: 전체 ON
직장맛집 모임: 커스텀 — 가격 OFF, 사진 OFF
와인 동호회: 기본값 사용
```
- 와인 동호회에는 전부 공개
- 직장 모임에는 가격·사진만 비공개

---

## 9. RLS 정책 가이드라인

### users
```
SELECT:
  - 자기 자신: 항상 전체
  - privacy_profile = 'public': 모든 사용자
  - privacy_profile = 'bubble_only': 같은 버블 멤버 (bubble_members JOIN)
  - privacy_profile = 'private': 자기 자신만
```

### records
```
SELECT:
  - 자기 자신: 항상 전체
  - privacy_records = 'all' AND privacy_profile 통과: 전체 기록
  - privacy_records = 'shared_only': bubble_shares에 존재하는 기록만 (해당 버블 멤버에게)
  - privacy_profile = 'private': 자기 자신만 (privacy_records 값과 무관)
  - 익명 집계 (AVG, COUNT 등): 항상 허용 (개인 식별 컬럼 제외)
```

### bubble_shares
```
SELECT:
  - 해당 bubble_id의 멤버: 항상
  - 비멤버 (public 버블): content_visibility에 따라 필드 제한
  - 비멤버 (private/members 버블): 차단
```

---

## 10. 계정 삭제

### DB 필드
| 필드 | 설명 |
|------|------|
| `users.deleted_at` | 삭제 요청 시점 (NULL이면 활성 계정) |
| `users.delete_mode` | `'anonymize'` (기록 익명화) / `'hard_delete'` (기록 완전 삭제) |
| `users.delete_scheduled_at` | 영구 삭제 예정 시점 (`deleted_at + 30일`) |

### 바텀 시트 UI

```
[계정 삭제] 항목 클릭 → DeleteAccountSheet 바텀 시트
├─ Handle bar + Header (타이틀: "계정 삭제" + X 닫기 버튼)
├─ AlertTriangle 아이콘 (빨간 원형 배경)
├─ 설명: "삭제를 요청하면 30일간 복구 가능합니다. 30일 후 선택한 모드에 따라 처리됩니다."
├─ 삭제 모드 선택 (라디오 카드, border 하이라이트):
│   ○ 익명화 (기본 선택, EyeOff 아이콘)
│       "기록은 남기되 개인정보를 삭제합니다"
│   ○ 완전 삭제 (Trash2 아이콘)
│       "모든 데이터를 영구 삭제합니다"
├─ 삭제 시 처리 안내 (info box, 빨간 배경):
│   • 가입한 버블에서 자동 탈퇴됩니다
│   • 버블 owner인 경우 소유권 이전이 필요합니다
│   • 모든 팔로우/팔로워 관계가 삭제됩니다
│   • 소셜 로그인 연동이 해제됩니다
└─ [취소] + [계정 삭제 요청] 버튼 (2버튼 레이아웃, 삭제 버튼은 빨간색)
```

### 삭제 처리 플로우
```
→ [계정 삭제 요청] 버튼 클릭
→ 삭제 처리:
  - users.deleted_at = NOW(), users.delete_scheduled_at = NOW() + 30일
  - users.delete_mode에 따라 records 완전 삭제 or 익명화
  - 소속 버블에서 자동 탈퇴 (bubble_members 처리)
  - owner인 버블 → 다음 admin에게 이전, admin 없으면 버블 삭제
  - follows 양방향 삭제
  - comments 익명화 (is_anonymous = true, user_id = null)
  - reactions 삭제
  - notifications 삭제
  - 소셜 로그인 연결 해제
  - 30일 유예 기간 (복구 가능) → 30일 후 hard delete (Cron)
```

---

## 11. 상태 관리

### 페이지 로컬 상태

> 프라이버시/알림/환경설정 값은 `useSettings()` 훅의 `settings` 객체(SWR)에서 관리. 아래는 Container 내 로컬 UI 상태만.

| 상태 | 타입 | 초기값 | 용도 |
|------|------|--------|------|
| `deleteSheetOpen` | `boolean` | `false` | 계정 삭제 시트 |
| `activeBubbleSheet` | `BubblePrivacyOverride \| null` | `null` | 현재 열린 버블별 시트 (버블 정보 포함) |
| `editField` | `'nickname' \| 'bio' \| null` | `null` | 닉네임/소개 수정 시트 |
| `dndSheetOpen` | `boolean` | `false` | 방해 금지 설정 시트 |
| `cacheSize` | `string \| null` | `null` | 캐시 용량 표시 (마운트 시 `navigator.storage.estimate()` 조회) |
| `isCleaningManualShares` | `boolean` | `false` | 수동 공유 정리 진행 중 여부 |
| `manualShareCleanResult` | `string \| null` | `null` | 수동 공유 정리 결과 텍스트 |

> Refs: `importRef` (파일 가져오기 input), `avatarRef` (아바타 이미지 선택 input)

### VisibilityConfig 타입

```typescript
interface VisibilityConfig {
  score: boolean;
  comment: boolean;
  photos: boolean;
  level: boolean;
  quadrant: boolean;
  bubbles: boolean;
  price: boolean;
}
```

### 프라이버시 레이어 표시 조건

| 레이어 | 표시 조건 |
|--------|----------|
| 기록 범위 셀렉터 | `privacyProfile !== 'private'` |
| 전체 공개 토글 | `privacyProfile === 'public'` |
| 버블 기본 토글 | `privacyProfile !== 'private'` |
| 버블별 설정 | `privacyProfile !== 'private'` |
| 프라이버시 안내 노트 | `privacyProfile !== 'private'` |

### 서버 동기화

- 토글/셀렉트 변경(알림·환경설정) → optimistic update + debounce(500ms) 후 서버 반영
- 프라이버시 세그먼트/visibility 변경 → optimistic update + 즉시 서버 반영
- 닉네임/소개 변경 → optimistic update + 즉시 서버 반영
- 실패 시 → SWR revalidation으로 서버 상태 복원
