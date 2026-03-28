# ONBOARDING — 온보딩 플로우

> depends_on: AUTH, DATA_MODEL, DESIGN_SYSTEM, XP_SYSTEM, BUBBLE
> affects: HOME, RECORD_FLOW, PROFILE
> 목표: 30초 안에 완료, 텅 빈 앱 방지, 첫 버블 생성 유도
> route: /onboarding
> prototype: `prototype/00_onboarding.html`
>
> **⚠️ IA.md 동기화 필요**: 00_IA.md의 온보딩 Step 3이 "경험치 설명"으로 되어 있으나,
> 실제 플로우(프로토타입+본 문서)는 "로그인→인트로→**맛집 등록(지역선택+식당체크)**→버블생성→버블탐색→홈".
> 00_IA.md의 온보딩 항목과 S9 산출물 설명을 본 문서에 맞춰 갱신 필요.

---

## 0. 온보딩 공통 UI 규칙

### 화면 레이아웃 (Step 1~3 공통)

```
┌──────────────────────────────┐
│  ┃━━━━┃━━━━┃━━━━┃            │  ← 스텝 진행 바 (3칸)
│                              │     padding: 54px 28px 0
├──────────────────────────────┤
│                              │
│  큰 타이틀 (24px, bold)       │  ← 상단 ~28%: 멘트 구간
│  서브텍스트 (13px)            │     세로 중앙 정렬
│                              │
├──────────────────────────────┤
│  ┌ bg-card, radius 24px ──┐ │  ← 하단 ~72%: 인터랙티브 UI
│  │                         │ │     border-top: 1px solid border
│  │  (각 Step별 콘텐츠)      │ │     scroll-content (overflow-y)
│  │                         │ │
│  │  하단 고정 안내 텍스트    │ │  ← sticky bottom
│  └─────────────────────────┘ │
│ (fab-back)         (fab-fwd) │  ← FAB 네비게이션
└──────────────────────────────┘
```

### 스텝 진행 바 (ob-steps)

- 3칸 고정 (Step 1 기록 / Step 2 버블 생성 / Step 3 버블 탐색)
- 레이아웃: `display:flex`, `gap:6px`, `margin-top:16px`
- 각 바: `flex:1`, `height:3px`, `border-radius:2px`

| 상태 | 스타일 |
|------|--------|
| **active** | `background:var(--accent-food)` |
| **done** | `background:var(--accent-food)`, `opacity:0.45` |
| **pending** | `background:var(--border)` |

### FAB 네비게이션

Step 1~3에만 존재. 로그인/인트로 화면에는 FAB 없음.

| 요소 | 위치 | 크기 | 스타일 |
|------|------|------|--------|
| **fab-back** | `left:16px`, `bottom:28px` | 44×44px 원형 | `background:rgba(248,246,243,0.88)`, `backdrop-filter:blur(12px)`, `border:1px solid var(--border)`, `box-shadow:0 2px 12px rgba(0,0,0,0.12)` |
| **fab-forward** | `right:16px`, `bottom:28px` | 44×44px 원형 | `background:var(--accent-food)`, `color:#fff`, `box-shadow:0 3px 16px rgba(193,123,94,0.4)`, 보더 없음 |

- 공통: `position:absolute`, `z-index:85`, `border-radius:50%`
- 아이콘: chevron-left / chevron-right (SVG inline, `22×22px`)
- `:active` → `transform:scale(0.9)`, `transition:0.15s`

### 상단 멘트 구간

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `flex:0 0 28%`, `padding:0 28px`, `justify-content:center` |
| 타이틀 | `font-size:24px`, `font-weight:700`, `line-height:1.45`, `letter-spacing:-0.4px`, `color:var(--text)` |
| 서브텍스트 | `font-size:13px`, `color:var(--text-sub)`, `margin-top:10px`, `line-height:1.7` |

### 하단 인터랙티브 영역

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `flex:1`, `background:var(--bg-card)`, `border-radius:24px 24px 0 0`, `border-top:1px solid var(--border)` |
| 내부 패딩 | `padding:0 24px`, 상단 여백 `height:20px` (빈 div) |
| 스크롤 | `overflow-y:auto`, `scrollbar-width:none`, `-webkit-overflow-scrolling:touch` |
| sticky 안내 | `position:sticky`, `bottom:0`, `padding:14px 0 20px`, `background:var(--bg-card)` |
| 안내 텍스트 | `font-size:12px`, `font-style:italic`, `color:var(--text-hint)`, `text-align:center`, `line-height:1.5` |

### 화면 전환 애니메이션

| 방향 | 현재 화면 | 다음/이전 화면 | duration |
|------|----------|-------------|----------|
| **앞으로** | `.slide-out` → `translateX(-100%)` | `.hidden` 제거 → `.active` → `translateX(0)` | `0.35s cubic-bezier(0.4, 0, 0.2, 1)` |
| **뒤로** | `slideOutRight` (`0→100%`) | `slideInLeft` (`-100%→0`) | `0.3s forwards` |

- 전환 후 이전 화면 → `.hidden` (`translateX(100%)`) 으로 정리 (350ms 후)
- 히스토리 스택으로 뒤로가기 관리 (`screenHistory[]`)

### 하지 않는 것
- ❌ step dots / 원형 인디케이터 — 바 형태만 사용
- ❌ 고스트 텍스트 "← 이전" / pill 모양 "다음 →" — FAB 원형 버튼으로 통일
- ❌ 건너뛰기 텍스트 링크 — 모든 스텝 0개 선택으로 진행 가능하므로 불필요

---

## 1. 플로우 총괄

```
screen-login   로그인
  소셜 로그인 (카카오/구글/네이버/애플) → 닉네임 자동 설정
       ↓
screen-intro   인트로
  앱 가치 헤드라인 → "시작하기 →" 텍스트 버튼
       ↓
screen-record  Step 1/3 — 맛집 등록
  지역 드롭다운 → 해당 지역 맛집 리스트 → [등록] 버튼
  지도앱 가져오기 (네이버/구글) — v1 비활성
  직접 검색 가능
       ↓
screen-bubble  Step 2/3 — 버블 생성
  템플릿 카드 (가족/친구/직장동료) → [추가]
  초대하기 → 링크 복사
       ↓
screen-explore Step 3/3 — 버블 탐색
  공개 버블 카드 리스트 → 탭하면 상세 바텀시트
       ↓
01_home.html   홈 진입
```

### 네비게이션 경로

| 화면 | fab-back 목적지 | fab-forward 목적지 |
|------|----------------|-------------------|
| screen-login | — (없음) | — (없음) |
| screen-intro | — (없음) | — (없음, 텍스트 CTA) |
| screen-record | screen-intro (히스토리 스택) | screen-bubble |
| screen-bubble | screen-record | screen-explore |
| screen-explore | screen-bubble | 홈 진입 (`01_home.html`) |

### 중도 이탈 처리
- 온보딩 중 앱 종료 시 → 다음 진입 때 마지막 화면부터 재개 (서버에 `onboarding_step` 저장)
- 인트로까지만 본 경우 → screen-record부터 시작
- 0개 등록/0개 생성으로 끝까지 진행 가능 → 빈 홈 상태로 진입

---

## 2. 로그인 화면 (screen-login)

```
┌──────────────────────────────┐
│  (44px 상단 여백 — 상태바)     │
│                              │
│           nyam               │  ← Comfortaa 42px, 그라디언트
│                              │
│  낯선 별점 천 개보다,          │  ← 14px, text-sub
│  믿을만한 한 명의 기록.        │
│                              │
│  ┌──────────────────────────┐│
│  │ G  Google로 시작          ││  ← bg-card, border:1px solid border
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ 💬 카카오로 시작           ││  ← #FEE500, color:#3C1E1E
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ N  네이버로 시작           ││  ← #03C75A, color:#fff
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │   Apple로 시작           ││  ← #1D1D1F, color:#fff
│  └──────────────────────────┘│
│                              │
│  가입 시 이용약관 및           │  ← 11px, text-hint
│  개인정보처리방침에 동의합니다   │     링크: text-sub, underline
└──────────────────────────────┘
```

### 상세 규격

| 항목 | 스타일 |
|------|--------|
| 레이아웃 | `flex-direction:column`, `align-items:center`, `justify-content:center` |
| 패딩 | `padding:60px 32px 40px` |
| 상단 여백 | `height:44px` (Dynamic Island 회피) |
| 로고 | `font-family:'Comfortaa'`, `42px`, `font-weight:700`, `letter-spacing:-1px`, `margin-bottom:10px` |
| 로고 색상 | `linear-gradient(135deg, #FF6038, #8B7396)`, `-webkit-background-clip:text` |
| 태그라인 | `14px`, `color:var(--text-sub)`, `text-align:center`, `line-height:1.6`, `margin-bottom:48px`, `min-height:2.4em` |
| 소셜 버튼 컨테이너 | `width:100%`, `flex-direction:column`, `gap:10px`, `margin-bottom:32px` |
| 소셜 버튼 | `height:48px`, `border-radius:12px`, `font-size:14px`, `font-weight:600`, `gap:8px` |
| 소셜 아이콘 | `20×20px`, 각 서비스 공식 아이콘/이모지 |
| `:active` | `transform:scale(0.97)`, `opacity:0.85` |
| 하단 약관 | `11px`, `color:var(--text-hint)`, `line-height:1.6` |
| 약관 링크 | `color:var(--text-sub)`, `text-decoration:underline`, `text-underline-offset:2px` |

### 동작
- 어떤 소셜 버튼이든 탭 → Auth 처리 → `screen-intro`로 전환
- 닉네임은 소셜 프로필에서 자동 설정 (Settings에서 변경 가능)
- FAB 없음, 스텝 진행 바 없음

---

## 3. 인트로 화면 (screen-intro)

```
┌──────────────────────────────┐
│                              │
│                              │
│   낯선 별점 천 개보다,         │  ← 26px, 700, text-align:center
│   믿을만한 한 명의 기록.       │
│                              │
│   기록은 쌓이고,              │  ← 14px, text-sub
│   취향은 선명해지고,           │     line-height:1.8
│   가까운 사람들과 나눌 수 있어요.│
│                              │
│                              │
│         시작하기 →            │  ← 15px, 600, accent-food, 텍스트 버튼
│                              │
└──────────────────────────────┘
```

### 상세 규격

| 항목 | 스타일 |
|------|--------|
| 콘텐츠 컨테이너 | `flex:1`, `justify-content:center`, `align-items:center`, `padding:0 36px` |
| 헤드라인 | `26px`, `font-weight:700`, `line-height:1.5`, `letter-spacing:-0.4px`, `text-align:center`, `color:var(--text)` |
| 서브텍스트 | `14px`, `color:var(--text-sub)`, `line-height:1.8`, `margin-top:16px`, `text-align:center` |
| CTA 컨테이너 | `padding:0 24px 56px`, `flex-shrink:0`, `text-align:center` |
| CTA 버튼 | `background:none`, `border:none`, `15px`, `font-weight:600`, `color:var(--accent-food)`, `padding:12px 24px`, `letter-spacing:-0.1px` |
| CTA press | `opacity:0.5` (mousedown/touchstart), `opacity:1` (mouseup/touchend) |

### 규칙
- 스텝 진행 바 없음, FAB 없음
- "시작하기 →" 탭 → `screen-record` (Step 1)

### 하지 않는 것
- ❌ 기록 유형 선택 (맛집/와인 토글 카드) — 온보딩 진입 장벽 제거
- ❌ 가치 스토리 3단 (아이콘 + 헤드라인 + 설명 ×3) — 헤드라인 + 서브텍스트로 충분
- ❌ 앱 스크린샷 / 미리보기 캐러셀 — 직접 해보는 게 빠름

---

## 4. Step 1/3: 맛집 등록 (screen-record)

```
┌──────────────────────────────┐
│  ┃━━━━┃────┃────┃            │  ← Step 1 active
├──────────────────────────────┤
│  기록할 때마다,               │
│  당신의 미식 경험치가 쌓여요.  │
│  경험치를 통해 레벨이 올라가고, │
│  레벨은 사용자의 전문분야       │
│  (지역, 장르)를 보여줍니다.    │
├──────────────────────────────┤
│ ┌─ bg-card ─────────────────┐│
│ │                            ││
│ │ 지도에서 가져오기 [N] [G]   ││  ← 네이버/구글 지도 연동
│ │ ───────────────────────── ││  ← 1px 구분선
│ │ [을지로 ▼]  [🔍 직접 검색  ]││  ← 드롭다운 + 검색 (한 줄)
│ │                            ││
│ │  을지면옥              [등록]││  ← 식당 행
│ │  ─────────────────────────││
│ │  스시코우지            [등록]││
│ │  ─────────────────────────││
│ │  을지다락              [등록]││
│ │  ─────────────────────────││
│ │  을지OB맥주            [등록]││
│ │                            ││
│ │  지금은 등록만 하고,        ││  ← sticky 하단 안내
│ │  나중에 식당평가 기록을      ││
│ │  완성해 주세요.             ││
│ └────────────────────────────┘│
│ (◁)                     (▷)  │
└──────────────────────────────┘
```

### 4-1. 지도에서 가져오기

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `display:flex`, `align-items:center`, `gap:12px`, `margin-bottom:16px` |
| 안내 텍스트 | "지도에서 가져오기", `font-size:13px`, `color:var(--text-sub)`, `white-space:nowrap` |
| 버튼 공통 | `36×36px`, `border-radius:10px`, `border:1px solid var(--border)`, `background:white` |
| 네이버 | 내부 "N" 텍스트, `font-weight:800`, `color:#03C75A`, `font-family:sans-serif` |
| 구글 | Google G 로고 SVG (`18×18px`) |
| 동작 | 탭 → alert "네이버지도 연동은 출시 후 지원됩니다" / "구글지도 연동은 출시 후 지원됩니다" |
| 구분선 | `height:1px`, `background:var(--border)`, `margin-bottom:16px` |

> v1에서는 비활성. v2에서 네이버 지도 저장 목록 / Google Maps 저장 목록 임포트 구현 예정.

### 4-2. 지역 드롭다운 (nyam-select)

드롭다운과 검색 인풋이 한 줄에 배치. `display:flex`, `gap:8px`, `margin-bottom:14px`.

**셀렉트 버튼**:

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `position:relative`, `display:inline-block`, `flex-shrink:0` |
| 버튼 | `display:flex`, `align-items:center`, `gap:6px`, `padding:7px 12px`, `border-radius:10px`, `border:1px solid var(--border)`, `background:var(--bg-card)`, `min-width:100px` |
| 텍스트 | `font-size:13px`, `font-weight:500`, `color:var(--text)`, `flex:1` |
| 화살표 | lucide `chevron-down` (`16×16px`), `color:var(--text-hint)` |
| hover | `border-color:var(--border-bold)` |
| open 상태 | `border-color:var(--accent-food)`, 화살표 `rotate(180deg)` |

**드롭다운 메뉴**:

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `position:absolute`, `top:calc(100% + 4px)`, `left:0`, `right:0` |
| 배경 | `background:var(--bg-elevated)`, `border:1px solid var(--border)`, `border-radius:12px`, `box-shadow:0 8px 28px rgba(0,0,0,0.12)`, `padding:4px`, `z-index:100` |
| 항목 | `padding:9px 12px`, `border-radius:8px`, `font-size:13px`, `font-weight:500`, `width:100%`, `text-align:left` |
| 항목 hover | `background:var(--bg)` |
| 선택됨 | `color:var(--accent-food)`, `font-weight:600` |
| 닫기 | 외부 클릭 시 자동 닫힘 (document click listener) |

**지역 목록** (온보딩 시드 6개):
`을지로`, `광화문`, `성수`, `강남`, `홍대`, `이태원`

- 기본 선택: `을지로` (첫 진입 시 자동 렌더)
- 지역 변경 → 해당 지역 맛집 리스트로 교체
- 이미 등록한 식당의 "완료" 상태는 지역 전환 후에도 유지 (전역 Set)
- **재진입 동작**: screen-record로 네비게이션할 때마다 `selectRecordArea('을지로')` 호출 → 드롭다운이 을지로로 리셋됨. 등록 완료 상태는 전역 Set으로 유지되므로 데이터 손실 없음
- 선택한 지역은 `users.preferred_areas`에 저장하지 않음 (온보딩 시드용, 실제 동네 설정은 Settings에서)

### 4-3. 검색 인풋 (ob-search)

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `position:relative`, `flex:1` |
| 인풋 | `width:100%`, `padding:9px 12px 9px 34px`, `border-radius:12px`, `border:1.5px solid var(--border)`, `background:var(--bg-card)`, `font-size:13px`, `color:var(--text)` |
| 포커스 | `border-color:var(--accent-food)` |
| 아이콘 | lucide `search` (`14×14px`), `color:var(--text-hint)`, `position:absolute`, `left:14px`, `top:50%`, `transform:translateY(-50%)` |
| placeholder | "직접 검색" |

**검색 결과 드롭다운**:

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `position:absolute`, `top:100%`, `left:0`, `right:0`, `z-index:20`, `margin-top:4px` |
| 배경 | `background:white`, `border:1px solid var(--border)`, `border-radius:10px`, `box-shadow:0 8px 24px rgba(0,0,0,0.1)` |
| 결과 행 | `padding:10px 16px`, `display:flex`, `align-items:center`, `gap:10px`, `border-bottom:1px solid var(--border)` |
| 표시 조건 | 인풋 비어 있으면 숨김, 텍스트 입력 시 표시 |
| 매칭 로직 | 식당 이름 또는 장르에 쿼리 포함 (includes). 매칭 결과 없으면 전체 목록 표시 (fallback) |
| 닫기 | `onblur` → `setTimeout(200ms)` 후 숨김 (클릭 이벤트 선처리 위한 딜레이) |

### 4-4. 식당 리스트

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `display:flex`, `flex-direction:column` (동적 렌더) |
| 행 | `display:flex`, `align-items:center`, `padding:11px 0`, `border-bottom:1px solid var(--border)`, `gap:10px` |
| 식당 이름 | `flex:1`, `font-size:14px`, `font-weight:500`, `color:var(--text)` |
| 등록 버튼 | `color:var(--accent-food)`, `font-size:13px`, `font-weight:600`, `background:none`, `border:none`, `padding:4px 0`, `white-space:nowrap` |
| 등록 완료 | 텍스트 "완료", `color:var(--text-hint)`, `pointer-events:none` |
| `:active` (버튼) | `opacity:0.5` |

**지역별 시드 데이터**:

| 지역 | 식당 목록 |
|------|----------|
| 을지로 | 을지면옥 (한식), 스시코우지 (일식), 을지다락 (바/주점), 을지OB맥주 (한식) |
| 광화문 | 미진 (한식), 토속촌 (한식), 광화문국밥 (한식) |
| 성수 | 레스토랑 오르되브르 (이탈리안), 카페 어니언 (카페), 다운타우너 (미국) |
| 강남 | 도쿄등심 (일식), 스시사이토 (일식), 한신포차 (한식) |
| 홍대 | 피자알볼로 (이탈리안), 르뱅앤블레 (프렌치), 옥동식 (한식) |
| 이태원 | 포잉 (기타), 레바논익스프레스 (지중해), 그리디키친 (미국) |

> 시드 데이터는 실제 DB restaurants 테이블에 존재하는 식당이어야 함. 온보딩 빌드 시 시드 마이그레이션 필요.

**검색 전용 시드** (지역 리스트에 없는 추가 결과):
`백종원의 역전우동 (일식)`, `스시효 (일식)`

### 4-5. 인터랙션 규칙

| 항목 | 규칙 |
|------|------|
| 등록 | 탭 → 버튼 텍스트 "등록" → "완료", `.registered` 클래스 추가 |
| 중복 방지 | 전역 `Set<string>` (식당 이름 기준). 이미 등록된 식당은 `pointer-events:none` |
| 지역 전환 | 드롭다운 변경 → 리스트 리렌더. 등록 완료 상태는 전역 Set으로 유지 |
| 검색 등록 | 검색 결과 행의 등록 버튼도 동일한 전역 Set에 추가 |
| 0개 등록 | fab-forward 진행 가능 (강제 아님) |
| XP | 식당 등록 시 XP 팝업 없음. 이름만 등록 = 종합 XP 0 (XP_SYSTEM § 4-1) |

### 4-6. 데이터 저장

```sql
-- 식당 등록 (이름만, 평가 없음)
INSERT INTO records (user_id, target_id, target_type, status)
VALUES (:user_id, :restaurant_id, 'restaurant', 'checked');
-- axis_x, axis_y, satisfaction, scene, comment = 모두 NULL
-- record_quality_xp = 0
```

> `status = 'checked'` 사용 (DATA_MODEL.md 정의: `'checked' | 'rated' | 'draft'`). 본 기록 플로우(RECORD_FLOW)에서 사분면/상황태그 보충 시 `'rated'`로 변경.

### 4-7. 하단 고정 안내

```
지금은 등록만 하고,
나중에 식당평가 기록을 완성해 주세요.
```

---

## 5. Step 2/3: 버블 생성 (screen-bubble)

```
┌──────────────────────────────┐
│  ┃━━━━┃━━━━┃────┃            │  ← Step 1 done(0.45), Step 2 active
├──────────────────────────────┤
│  내가 인정하는 미식가들끼리     │
│  숨겨진 맛집을 공유해요.       │
│  가족, 친구, 동료 —            │
│  나만의 버블을 만들어보세요.    │
├──────────────────────────────┤
│ ┌─ bg-card ─────────────────┐│
│ │                            ││
│ │ ┌────────────────────────┐ ││
│ │ │ [🏠] 가족         [추가] │ ││  ← bubble-template 카드
│ │ │      우리 가족만의 맛집   │ ││
│ │ └────────────────────────┘ ││
│ │ ┌────────────────────────┐ ││
│ │ │ [👥] 친구         [추가] │ ││
│ │ │      친구들과 찐맛집 공유 │ ││
│ │ └────────────────────────┘ ││
│ │ ┌────────────────────────┐ ││
│ │ │ [💼] 직장동료     [추가] │ ││
│ │ │      점심 맛집 같이 모으기│ ││
│ │ └────────────────────────┘ ││
│ │                            ││
│ │        초대하기 →           ││  ← accent-social 텍스트 버튼
│ │                            ││
│ │  세부 사항은 나중에          ││  ← sticky 하단 안내
│ │  언제든 변경할 수 있어요.    ││
│ └────────────────────────────┘│
│ (◁)                     (▷)  │
└──────────────────────────────┘
```

### 5-1. 버블 템플릿 카드 (bubble-template)

| 항목 | 스타일 |
|------|--------|
| 카드 | `background:var(--bg-card)`, `border-radius:16px`, `border:2px solid var(--border)`, `padding:16px`, `cursor:pointer` |
| 레이아웃 | `display:flex`, `align-items:center`, `gap:14px` |
| 카드 목록 간격 | `gap:10px`, `margin-bottom:16px` |
| `:active` | `transform:scale(0.98)` |
| `transition` | `all 0.2s` |

**아이콘 영역 (bt-icon)**:

| 항목 | 스타일 |
|------|--------|
| 크기 | `48×48px`, `border-radius:14px`, `flex-shrink:0` |
| 배경 | `background:var(--bg-page)` |
| 아이콘 | lucide, `22×22px`, 색상은 템플릿별 상이 |

**텍스트 영역 (bt-info)**:

| 항목 | 스타일 |
|------|--------|
| 이름 | `font-size:15px`, `font-weight:700`, `color:var(--text)` |
| 설명 | `font-size:12px`, `color:var(--text-sub)`, `margin-top:2px` |

**추가 버튼 (ob-register-btn)**: 식당 등록 버튼과 동일 스타일 (Section 4-4).

### 5-2. 템플릿 데이터

| 이름 | lucide 아이콘 | 아이콘 색상 | 설명 |
|------|-------------|-----------|------|
| 가족 | `home` | `var(--accent-food)` (#C17B5E) | 우리 가족만의 맛집 지도 |
| 친구 | `users` | `var(--accent-social)` (#7A9BAE) | 친구들과 찐맛집 공유 |
| 직장동료 | `briefcase` | `var(--caution)` (#C9A96E) | 점심 맛집 같이 모으기 |

### 5-3. 초대하기 버튼

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `text-align:center`, `margin-bottom:16px` |
| 텍스트 | "초대하기 →" |
| 스타일 | `background:none`, `border:none`, `font-size:14px`, `font-weight:600`, `color:var(--accent-social)`, `padding:8px 16px` |
| press | `opacity:0.5` (mousedown), `opacity:1` (mouseup) |
| 동작 | 클립보드에 초대 링크 복사 → alert "초대 링크가 복사되었습니다" |

> 실제 구현 시: `bubbles.invite_code` 생성 → 딥링크 URL 조립 → 클립보드 복사 → 토스트 표시

### 5-4. 인터랙션 규칙

| 항목 | 규칙 |
|------|------|
| 추가 | 탭 → "완료"로 변경, `.registered` 클래스 추가, "+5 XP" 팝업 표시 (첫 버블 생성 보너스 § 4-4). 2개째부터는 실제 XP 0이지만 팝업 동일 표시 |
| 중복 | 전역 `Set<string>` (버블 이름 기준), 이미 생성된 템플릿은 `pointer-events:none` |
| 0개 생성 | fab-forward 진행 가능 |
| 커스텀 이름 | 온보딩에서는 불가. 홈 진입 후 버블 설정에서 이름/설명 변경 |
| `.selected` 상태 | CSS에 정의되어 있으나 목업 JS에서 미사용. 향후 선택 피드백으로 활용 가능 |

**XP 팝업 애니메이션** (버블 추가 시):

| 항목 | 스타일 |
|------|--------|
| 요소 | `position:fixed`, `z-index:999`, `pointer-events:none` |
| 텍스트 | "+5 XP", `font-size:13px`, `font-weight:800`, `color:var(--brand)` (#FF6038) |
| 위치 | 버튼의 `getBoundingClientRect()` 기준 상단 |
| 애니메이션 | `0→40%`: `translateY(0→-18px)`, `scale(1→1.2)`, `opacity:1` → `40→100%`: `translateY(-40px)`, `scale(0.7)`, `opacity:0` |
| duration | `0.9s ease`, 종료 후 DOM 제거 |

### 5-5. 데이터 저장

```sql
-- 버블 생성 (온보딩 템플릿 기반, 디폴트 설정)
INSERT INTO bubbles (
  id, name, description, icon, icon_bg_color,
  focus_type,
  visibility, join_policy, content_visibility,
  created_by, invite_code, created_at
) VALUES (
  gen_random_uuid(),
  :template_name,          -- '가족' | '친구' | '직장동료'
  :template_desc,          -- '우리 가족만의 맛집 지도' | '친구들과 찐맛집 공유' | '점심 맛집 같이 모으기'
  :template_icon,          -- 'home' | 'users' | 'briefcase'
  NULL,                    -- icon_bg_color: 온보딩에서는 미설정, 프론트에서 디폴트 렌더
  'all',                   -- focus_type: 식당+와인 제한 없음
  'private',               -- 기본: 비공개
  'invite_only',           -- 기본: 초대 전용
  'rating_and_comment',    -- 기본: 양방향
  :user_id,
  :generated_invite_code,  -- nanoid(12) 등
  NOW()
);

-- 생성자를 owner로 등록
INSERT INTO bubble_members (bubble_id, user_id, role, status, joined_at)
VALUES (:bubble_id, :user_id, 'owner', 'active', NOW());
```

> `bubbles.created_by` 사용 (DATA_MODEL 기준). `owner_id` 필드는 존재하지 않음.
> `bubbles.description`에 템플릿 설명 문구 저장. 사용자가 나중에 버블 설정에서 변경 가능.
> 온보딩 버블은 `visibility='private'`, `join_policy='invite_only'`로 생성.

### 5-6. 하단 고정 안내

```
세부 사항은 나중에 언제든 변경할 수 있어요.
```

---

## 6. Step 3/3: 버블 탐색 (screen-explore)

```
┌──────────────────────────────┐
│  ┃━━━━┃━━━━┃━━━━┃            │  ← Step 1,2 done, Step 3 active
├──────────────────────────────┤
│  경험을 쌓으면,               │
│  맛잘알들의 세계가 열려요.     │
│  레벨이 오를수록 더 많은 버블에 │
│  들어가 모르는 맛잘알들과도     │
│  맛집을 나눌 수 있어요.        │
├──────────────────────────────┤
│ ┌─ bg-card ─────────────────┐│
│ │                            ││
│ │ ┌ explore-card ───────────┐││
│ │ │ [🏢] 삼성전자 DX...      │││  ← 탐색 카드
│ │ │      멤버 23명 · 87개    │││     탭 → 바텀시트
│ │ │                 Lv.2 이상│││
│ │ └─────────────────────────┘││
│ │ ┌ explore-card ───────────┐││
│ │ │ [💪] 클린식단 헬스맵      │││
│ │ │      멤버 14명 · 53개    │││
│ │ │                 Lv.3 이상│││
│ │ └─────────────────────────┘││
│ │ ┌ explore-card ───────────┐││
│ │ │ [🍻] 회식은 내가 잡는다   │││
│ │ │      멤버 19명 · 112개   │││
│ │ │                 Lv.4 이상│││
│ │ └─────────────────────────┘││
│ │ ┌ explore-card ───────────┐││
│ │ │ [🌿] 서울 비건 맛집지도   │││
│ │ │      멤버 27명 · 94개    │││
│ │ │                 Lv.3 이상│││
│ │ └─────────────────────────┘││
│ │                            ││
│ │  내가 만든 버블은 가입 조건을 ││  ← sticky 하단 안내
│ │  직접 설정해서, 원하는 사람들 ││
│ │  과만 맛집을 공유할 수 있어요.││
│ └────────────────────────────┘│
│ (◁)                     (▷)  │  ← ▷ = 홈 진입
└──────────────────────────────┘
```

### 6-1. 탐색 카드 (explore-card)

| 항목 | 스타일 |
|------|--------|
| 카드 | `background:var(--bg-card)`, `border-radius:16px`, `border:1px solid var(--border)`, `padding:16px`, `cursor:pointer` |
| 레이아웃 | `display:flex`, `align-items:center`, `gap:14px` |
| 카드 목록 | `flex-direction:column`, `gap:10px` |
| `transition` | `all 0.15s` |

**아바타 (ec-avatar)**:

| 항목 | 스타일 |
|------|--------|
| 크기 | `48×48px`, `border-radius:14px`, `flex-shrink:0` |
| 배경 | `background:var(--bg-page)` |
| 아이콘 | lucide, `22×22px`, `color:var(--text-sub)` |

**정보 (ec-info)**:

| 항목 | 스타일 |
|------|--------|
| 이름 | `font-size:15px`, `font-weight:700`, `color:var(--text)` |
| 메타 | `font-size:12px`, `color:var(--text-sub)`, `margin-top:2px`, "멤버 N명 · 맛집 N개 공유중" |

**레벨 표시**:
- `font-size:11px`, `font-weight:600`, `color:var(--text-hint)`, `white-space:nowrap`
- 우측 정렬 (flex item)
- 형식: "Lv.N 이상"

### 6-2. 시드 버블 데이터

| 이름 | lucide 아이콘 | 멤버 | 최대 | 맛집 | 최소레벨 | 설명 | 공개여부 | 유형 | 시작일 | 활성도 | 기록주기 |
|------|-------------|------|------|------|---------|------|---------|------|--------|--------|---------|
| 삼성전자 DX사업부 맛집 | `building-2` | 23 | 40 | 87 | 2 | 수원·영통 점심 맛집 & 회식 장소 공유 | 멤버만 | 양방향 | 2025.08 | 매우 활발 | 1.5일마다 |
| 클린식단 헬스맵 | `dumbbell` | 14 | 25 | 53 | 3 | 고단백 저지방 식단 맛집만 · 닭가슴살 말고 진짜 맛집 | 공개 | 양방향 | 2025.10 | 활발 | 2.4일마다 |
| 회식은 내가 잡는다 | `beer` | 19 | 30 | 112 | 4 | 단체석·코스·2차까지 검증된 회식 맛집만 | 공개 | 양방향 | 2025.05 | 매우 활발 | 1.8일마다 |
| 서울 비건 맛집지도 | `leaf` | 27 | 50 | 94 | 3 | 100% 비건 · 비건옵션 맛집 큐레이션 | 공개 | 양방향 | 2025.04 | 매우 활발 | 1.3일마다 |

**DB 필드 매핑**:

| 목업 표시 | DB 필드 | 값 |
|----------|---------|-----|
| "멤버만" | `bubbles.visibility` | `'private'` |
| "공개" | `bubbles.visibility` | `'public'` |
| "양방향" | `bubbles.content_visibility` | `'rating_and_comment'` |
| "일방향" | `bubbles.content_visibility` | `'rating_only'` |
| 멤버 수 | `bubbles.member_count` | 비정규화 캐시 (owner+admin+member) |
| 맛집 수 ("N개 공유중") | `bubbles.record_count` | 비정규화 캐시 (총 기록 수). `unique_target_count`(고유 장소 수)와 구분 — 카드에는 record_count 표시 |
| 최소 레벨 | `bubbles.min_level` | 가입 기준 |

**가입 조건 매핑**:

| 목업 표시 | DB 필드 매핑 |
|----------|-------------|
| "관리자 승인 필요" | `join_policy = 'manual_approve'` |
| "즉시 가입 가능" | `join_policy = 'auto_approve'` (min 조건 충족 시) 또는 `'open'` |
| "최소 기록 N개 이상" | `bubbles.min_records = N` |
| "최소 Lv.N 이상" | `bubbles.min_level = N` |

### 6-3. 바텀시트 상세 팝업

카드 탭 시 올라오는 바텀시트. 가입하지 않고 미리보기만 가능.

```
┌──────────────────────────────┐
│  ── 핸들 ──              [×] │
│  [아이콘] 삼성전자 DX사업부 맛집│  ← popup-header
│           수원·영통 점심 맛집  │     아이콘: 50×50px
│           [멤버만] [양방향]    │     pill 태그
│                              │
│  ┌────────┐ ┌────────┐       │  ← popup-stats-grid (2×2)
│  │시작일   │ │가입자   │       │
│  │2025.08  │ │23명     │       │
│  │         │ │17자리남음│       │
│  └────────┘ └────────┘       │
│  ┌────────┐ ┌────────┐       │
│  │활성도   │ │공유 맛집│       │
│  │매우 활발│ │87개     │       │
│  │1.5일마다│ │         │       │
│  └────────┘ └────────┘       │
│                              │
│  🛡️ 가입 조건                 │  ← popup-section-title
│  ┌ popup-info-list ─────────┐│
│  │ 🛡/⚡ 관리자 승인/즉시 가입 ││  ← shield-check or zap
│  │ ✓ 최소 기록 N개 이상       ││  ← check-circle
│  │ ✓ 최소 Lv.N 이상          ││
│  │ 👥 현재 N/M명 (여유 K자리) ││  ← users icon
│  └──────────────────────────┘│
│                              │
│  👁️ 가입 시 공개 범위          │
│  ┌ popup-info-list ─────────┐│
│  │ 🔓 내 기록이 멤버에게 공개  ││  선택한 기록만
│  │ 🔓 프로필·레벨·뱃지        ││  항상 공개
│  │ 🔒 사분면·점수 상세         ││  비공개
│  └──────────────────────────┘│
└──────────────────────────────┘
```

**오버레이 & 시트**:

| 항목 | 스타일 |
|------|--------|
| 오버레이 | `position:absolute`, `top:0`, `left:0`, `right:0`, `bottom:0`, `background:rgba(0,0,0,0.45)`, `z-index:90`, `align-items:flex-end`, `border-radius:42px`, `overflow:hidden` |
| 표시/숨김 | `display:none` ↔ `display:flex` (`.show` 클래스) |
| 시트 | `width:100%`, `max-height:75%`, `background:var(--bg-elevated)`, `border-radius:20px 20px 0 0`, `overflow-y:auto` |
| 애니메이션 | `slideUp 0.3s ease` (`translateY(100%)` → `translateY(0)`) |
| 닫기 | 오버레이 탭 (시트 외부) 또는 X 버튼. 시트 내부 탭은 `stopPropagation` |

**핸들**: `36×4px`, `border-radius:2px`, `background:var(--border-bold)`, `margin:10px auto 6px`

**헤더 (popup-header)**:

| 항목 | 스타일 |
|------|--------|
| 레이아웃 | `display:flex`, `align-items:flex-start`, `gap:12px`, `padding:8px 20px 12px` |
| 아이콘 | `50×50px`, `border-radius:14px`, `background:var(--bg-page)`, lucide `24×24px`, `color:var(--text-sub)` |
| 이름 | `font-size:17px`, `font-weight:700`, `color:var(--text)` |
| 설명 | `font-size:12px`, `color:var(--text-sub)`, `margin-top:2px` |
| 닫기 버튼 | `background:none`, `border:none`, `color:var(--text-hint)`, lucide `x` (`20×20px`) |

**pill 태그**: `margin-top:6px`, `display:flex`, `gap:4px`

| 타입 | 배경 | 텍스트색 |
|------|------|---------|
| 공개 | `#E8F0EB` | `var(--positive)` |
| 멤버만 | `var(--bg-page)` | `var(--text-hint)` |
| 양방향 | `var(--accent-social-light)` | `var(--accent-social)` |

- `font-size:10px`, `padding:2px 8px`, `border-radius:100px`, `font-weight:600`

**통계 그리드 (popup-stats-grid)**:

| 항목 | 스타일 |
|------|--------|
| 그리드 | `display:grid`, `grid-template-columns:1fr 1fr`, `gap:8px`, `padding:0 20px 16px` |
| 카드 | `background:var(--bg)`, `border:1px solid var(--border)`, `border-radius:12px`, `padding:12px` |
| 라벨 | `font-size:11px`, `color:var(--text-sub)`, `margin-bottom:4px`, lucide 아이콘 `12×12px` |
| 값 (숫자) | `font-size:18px`, `font-weight:700`, `color:var(--text)` |
| 값 (텍스트) | `font-size:15px` (`.popup-stat-value-sm`) |
| 보조 텍스트 | `font-size:10px`, `color:var(--text-hint)`, `margin-top:2px` |

| 위치 | 라벨 | lucide 아이콘 | 값 예시 | 보조 |
|------|------|-------------|---------|------|
| 좌상 | 시작일 | `calendar` | 2025.08 (sm) | — |
| 우상 | 가입자 | `users` | 23명 | "17자리 남음" |
| 좌하 | 활성도 | `activity` | 매우 활발 (sm) | "1.5일마다 기록" |
| 우하 | 공유 맛집 | `utensils` | 87개 | — | → `bubbles.record_count` |

**섹션 타이틀 (popup-section-title)**:
- `font-size:13px`, `font-weight:600`, `color:var(--text)`, `padding:12px 20px 8px`, `gap:6px`
- 아이콘: `14×14px`, `color:var(--text-sub)`
- 가입 조건 아이콘: lucide `shield-check`
- 공개 범위 아이콘: lucide `eye`

**정보 행 (popup-info-row)**:
- `display:flex`, `align-items:center`, `gap:8px`, `font-size:12px`, `color:var(--text)`
- 아이콘: `14×14px`, `flex-shrink:0`
- 우측 보조 텍스트: `font-size:10px`, `color:var(--text-hint)`, `margin-left:auto`

**가입 조건 아이콘/색상**:

| 조건 | lucide 아이콘 | 색상 |
|------|-------------|------|
| 관리자 승인 필요 | `shield-check` | `var(--positive)` |
| 즉시 가입 가능 | `zap` | `var(--caution)` |
| 최소 기록/레벨 충족 | `check-circle` | `var(--positive)` |
| 현재 인원 | `users` | `var(--text-hint)`, 텍스트 `color:var(--text-sub)` |

**공개 범위 (고정, 모든 버블 동일)**:

| 항목 | lucide 아이콘 | 색상 | 보조 |
|------|-------------|------|------|
| 내 기록이 멤버에게 공개 | `unlock` | `var(--accent-social)` | "선택한 기록만" |
| 프로필 · 레벨 · 뱃지 | `unlock` | `var(--accent-social)` | "항상 공개" |
| 사분면 · 점수 상세 | `lock` | `var(--text-hint)` | "비공개" |

### 6-4. 인터랙션 규칙

| 항목 | 규칙 |
|------|------|
| 카드 탭 | 바텀시트 열림 → `lucide.createIcons()` 호출 (동적 렌더 아이콘 초기화) |
| 바텀시트 닫기 | 오버레이 탭 (시트 외부) 또는 X 버튼 |
| 가입 액션 | 온보딩에서는 **미리보기만** (가입 불가 — 신규 유저는 레벨 부족). 가입 버튼 없음 |
| fab-forward | → 홈 진입 (`01_home.html`로 네비게이션) |

### 6-5. 하단 고정 안내

```
내가 만든 버블은 가입 조건을 직접 설정해서,
원하는 사람들과만 맛집을 공유할 수 있어요.
```

> 안내 텍스트 `line-height:1.7` (다른 스텝의 `1.5`와 다름 — 3줄이므로 더 넓게)

---

## 7. 온보딩 데이터 저장 요약

### 7-1. 식당 등록 (Step 1)

```sql
INSERT INTO records (user_id, target_id, target_type, status)
VALUES (:user_id, :restaurant_id, 'restaurant', 'checked');
-- satisfaction, axis_x, axis_y, scene, comment = NULL
-- record_quality_xp = 0
-- 본 기록 플로우에서 사분면 보충 시 status → 'rated', XP 적립 시작
```

### 7-2. 버블 생성 (Step 2)

```sql
INSERT INTO bubbles (id, name, description, icon, focus_type, visibility, join_policy, content_visibility, created_by, invite_code)
VALUES (gen_random_uuid(), :name, :desc, :icon, 'all', 'private', 'invite_only', 'rating_and_comment', :user_id, :invite_code);

INSERT INTO bubble_members (bubble_id, user_id, role, status)
VALUES (:bubble_id, :user_id, 'owner', 'active');
```

### 7-3. 온보딩 XP 정리

온보딩 중 트리거되는 XP를 XP_SYSTEM.md 기준으로 정확히 정리한다.

**기록 XP (§ 4-1)**:

| 시점 | 종합 XP | 근거 |
|------|---------|------|
| 식당 등록 (개당) | 0 | 이름만 등록 (`status='checked'`) = 0 XP |

**일회성 보너스 XP (§ 4-4)** — 온보딩 중 트리거 가능:

| 보너스 | 종합 XP | 트리거 시점 |
|--------|---------|-----------|
| 온보딩 완료 | +10 | Step 3 → 홈 진입 시 |
| 첫 버블 생성 | +5 | Step 2에서 첫 번째 버블 [추가] 시 |
| 첫 기록 | +5 | 온보딩 후 첫 `status='rated'` 기록 완성 시 (온보딩 중에는 checked이므로 미트리거) |
| 첫 버블 공유 | +3 | 온보딩 후 첫 공유 시 (온보딩 중에는 미트리거) |

**온보딩 완료 시 최대 종합 XP**: 10 (온보딩 완료) + 5 (첫 버블 생성) = **15 XP**

> - 목업은 XP_SYSTEM과 정합: 식당 등록 시 XP 팝업 없음 (0 XP), 버블 생성 시 "+5 XP" 팝업 표시.
> - 버블 생성 XP 팝업은 모든 추가에 동일하게 표시되나, 실제 종합 XP는 첫 번째만 +5 보너스 적립.

### 7-4. users 테이블 업데이트

```sql
-- 온보딩 완료 시
UPDATE users
SET onboarding_completed = true,
    updated_at = NOW()
WHERE id = :user_id;
```

> DATA_MODEL에 `onboarding_completed` 필드가 없다면 마이그레이션 추가 필요:
> `ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;`

---

## 8. 온보딩에서 하는 것 / 안 하는 것

### 하는 것

| 항목 | 방식 | 목적 |
|------|------|------|
| 앱 소개 | 인트로 헤드라인 1줄 + 서브텍스트 | 앱 정체성 전달 |
| 맛집 등록 | 지역 드롭다운 → 리스트 → [등록] / 직접 검색 | 콜드스타트 해소, records 씨딩 |
| 버블 생성 | 템플릿 카드 → [추가] + 초대 링크 | 소셜 기능 첫 경험, 초대 루프 |
| 버블 미리보기 | 공개 버블 탐색 + 상세 바텀시트 | 레벨업 동기 부여 |
| XP/레벨 소개 | Step 1 헤드라인 "경험치가 쌓여요" | 핵심 메커니즘 인지 |
| 일회성 보너스 XP | 온보딩 완료 +10, 첫 버블 생성 +5 | 초기 레벨업 부스트 (최대 15 XP) |

### 안 하는 것

| 항목 | 이유 |
|------|------|
| 맛집/와인 타입 선택 토글 | 진입 장벽 제거. 앱에서 자연스럽게 탐색 |
| 전국 지도 기반 동네 선택 | 복잡도 축소. 드롭다운으로 단순화 |
| 만족도 게이지 / 사분면 평가 | 온보딩은 등록만. 평가는 RECORD_FLOW에서 |
| 가봤음 / 가보고싶음 구분 | 단순 "등록"으로 통일 |
| 와인 온보딩 (사진 인식) | v1 스코프 외. 앱 진입 후 별도 플로우 |
| 위시리스트 생성 | 온보딩 복잡도 축소 |
| 프로필/닉네임 설정 | 소셜 로그인에서 자동 설정. Settings에서 변경 |
| 취향 카드 (2지선다) | 기록 데이터에서 자연스럽게 파악 |
| 건너뛰기 링크 | 모든 스텝 0개로 진행 가능하므로 불필요 |

---

## 9. 넛지 시스템 (온보딩 이후 Week 1~2)

### 넛지 유형 & 우선순위

| 순위 | 유형 | 트리거 | 빈도 | 침습도 |
|------|------|--------|------|--------|
| 1 | 미완성 기록 보충 | 앱 진입 시 `status='checked'` 기록 존재 | 매 진입 | 낮음 (앱 내) |
| 2 | 사진 감지 | 앱 진입 시 갤러리 음식 사진 | 매 진입 | 낮음 (앱 내) |
| 3 | 식사 후 넛지 | 위치+시간 (식사 후 1~2시간) | 1일 1회 | 중간 (푸시) |
| 4 | 버블 초대 리마인드 | 버블 생성했지만 `member_count=1` (본인만) | 1일 1회 | 낮음 (앱 내) |
| 5 | 주간 리마인드 | 미사용 7일+ | 주 1회 | 중간 (푸시) |

### 넛지 피로 방지
- 하루 최대 푸시 1개
- 앱 내 카드 동시 1개만
- "건너뛰기" 3회 → 해당 넛지 2주 중단
- 23:00~08:00 푸시 없음

### 피로도 점수

```
푸시 전송: +3 | 앱 내 카드: +1 | 무시: +2 | "아니요": +1
기록 완료: -5 (리셋)
피로도 > 10 → 48시간 중단 | > 20 → 1주 중단 | 매일 -1 자연 감소
```

---

## 10. 기능 해금 (기록 수 기반)

> 여기서 "기록"은 `status='rated'` (사분면 보충 완료)인 records만 카운트.

| 기록 수 | 해금 | 사용자 경험 |
|---------|------|-----------|
| 0~2 | 기본 홈 + 미완성(checked) 기록 목록 | "금방 채워질 거야" |
| 3~5 | 사분면에 점 보이기 시작 | "내 취향이 보이네" |
| 5~10 | 재방문 추천 작동 | "다시 가볼까?" |
| 10~20 | 상황별 추천 작동 (상황 2종 이상, 각 3개+) | "오늘 데이트인데..." |
| 20+ | 사분면 패턴 명확 | "나는 이런 타입이구나" |
| 50+ | 정교한 추천 + 프로필 정체성 | "을지로 Lv.5" |

---

## 11. 성공 지표

| 지표 | 목표 |
|------|------|
| 온보딩 완료율 (가입 → Step 3 완료) | > 80% |
| D1 리텐션 | > 40% |
| D7 리텐션 | > 25% |
| 첫 기록 보충 전환 (7일 내 checked → rated) | > 60% |
| D30 기록 수 (rated) | >= 10 |
| 넛지→기록 전환 | > 15% |
| 버블 생성율 (온보딩 중 1개+) | > 70% |
| 버블 초대 전환율 (초대 링크 생성) | > 30% |
