# 구현 완료 후 관리 체계

> 모든 Phase 1 기능이 동작하면, 상세 문서 17개를 운영 문서 3개로 압축한다.

---

## 1. 전환 시점

```
Phase A (현재 — 상세 분리)              Phase B (전환 — 압축 관리)
─────────────────────────────────────┬──────────────────────────────
문서 = Claude 프롬프트 단위            │  문서 = 변경 영향 확인용
파일 17개 (systems 6 + pages 9 + 2)  │  파일 3개
스프린트별 문서 참조                    │  수정 시에만 참조
─────────────────────────────────────┤
                              전체 기능 1회 동작 확인 시점에 전환
```

---

## 2. 최종 관리 문서 (3개)

### 2-1. `docs/PRD.md`

**역할**: 제품이 무엇이고, 왜 만들었고, 어디로 가는가

**담아야 할 내용**:
- 제품 정의 (한 줄 요약, 핵심 가치 3가지)
- 타겟 유저
- 차별점 (경쟁사 대비)
- Phase별 범위 (현재 구현 상태 반영)
- 비즈니스 모델
- 성공 지표

**형식**:
```markdown
# Nyam PRD
## 제품 정의
## 차별점
## Phase별 범위
  ### Phase 1 (구현 완료) — 체크리스트
  ### Phase 2 (계획)
  ### Phase 3 (계획)
## 비즈니스 모델
## 성공 지표
```

**통합 대상**: `00_PRD.md` 거의 그대로. Phase 1 항목에 구현 상태 반영만.

---

### 2-2. `docs/SYSTEM_RULES.md`

**역할**: 여러 페이지가 공유하는 횡단 규칙. 수정 시 영향 범위 파악용.

**담아야 할 내용** (섹션별):

```markdown
# SYSTEM_RULES

## Rating Engine
affects: Record, RestaurantDetail, WineDetail, Home
- 사분면 축 정의 (식당: 가격×분위기, 와인: 산미×바디)
- 만족도 범위, 점 크기/색상 매핑
- 상황 태그 목록 + 색상
- 와인 향 팔레트 규칙
- 만족도 자동 산출 공식

## XP System
affects: Record, Profile, Bubble, Home
- XP 획득 테이블 (활동별 XP)
- 레벨 테이블 (레벨-XP-색상)
- 적립 로직 (어떤 축에 적립되는가)
- 소셜 활용 규칙 (자동 가중치 아님, 필터/정렬만)

## Recommendation
affects: Home, RestaurantDetail, WineDetail
- Phase 1 알고리즘 (재방문, 상황별, 찜, 권위, 페어링)
- 스코어링 공식
- 콜드스타트 해소 기준
- API 엔드포인트 + 캐싱 정책

## Data Model
affects: 전체
- 핵심 테이블 스키마 (현재 상태 기준)
- 엔티티 관계도
- 상황 태그 ENUM

## Auth & RLS
affects: 전체
- 인증 방식 (소셜 로그인)
- RLS 정책 요약
- 환경변수 관리 규칙

## Design System
affects: 전체
- 컬러 토큰 (식당/와인/공통)
- 만족도 색상 매핑
- 상황 태그 색상
- 레벨 뱃지 색상
- 타이포 스케일
- 점 크기 매핑
```

**형식 규칙**:
- 각 섹션 첫 줄에 `affects:` 태그 필수
- 구현된 현재 상태만 기록 (리서치/대안/검토 과정은 archive)
- `Ctrl+F`로 찾을 수 있게 키워드 충분히

**통합 대상**: `systems/` 6개 파일 → 각각 하나의 섹션으로

---

### 2-3. `docs/PAGE_SPECS.md`

**역할**: 페이지별 현재 구현 상태. 수정 시 의존성 확인용.

**담아야 할 내용** (섹션별):

```markdown
# PAGE_SPECS

## Onboarding
depends_on: Auth, DataModel
- 플로우 요약 (3 Step)
- 넛지 시스템 요약 (유형, 빈도, 피로 관리)
- 기능 해금 기준 (기록 수별)

## Home
depends_on: DataModel, RatingEngine, Recommendation, XP
- 화면 구성 요약 (타임라인, 넛지 카드, 추천 접이식)
- 상태별 홈 (기록 0/5/20+)

## Search & Register
depends_on: DataModel, RatingEngine
- 검색 플로우 (식당/와인)
- 사진 등록 플로우 (EXIF+AI)
- 재방문 플로우
- 예외 처리 요약

## Record Flow
depends_on: RatingEngine, SearchRegister, DataModel
- 식당 기록 플로우 (사분면 → 태그 → 확장 → 저장)
- 와인 기록 플로우 (사분면 → 향 → 복합성 → 저장)
- 저장 후 처리 (XP 적립, 레벨 체크)

## Restaurant Detail
depends_on: DataModel, RatingEngine, DesignSystem
- 9-Layer 구조 요약
- 빈 상태 패턴
- 데이터 소스 매핑

## Wine Detail
depends_on: DataModel, RatingEngine, DesignSystem
- 식당과의 차이점 요약
- 와인 전용 디자인 토큰
- 데이터 소스 매핑

## Profile
depends_on: DataModel, XP, Bubble
- 프로필 구성 (미식 정체성, 레벨, 버블 활동)
- Wrapped 공유 (개인정보/디테일 게이지)
- 프라이버시 기본값

## Bubble (Phase 2)
depends_on: DataModel, Auth, XP
- 버블 유형/역할 요약
- 공유/리액션/댓글 규칙
- 피드 규칙 (시간순, 알고리즘 없음)

## Settings
depends_on: Auth, DataModel
- 설정 항목 목록
```

**형식 규칙**:
- 각 섹션 첫 줄에 `depends_on:` 태그 필수
- 와이어프레임/상세 UI는 생략 (코드가 곧 스펙)
- 핵심 규칙과 예외 사항만 기록

**통합 대상**: `pages/` 9개 파일 → 각각 하나의 섹션으로

---

## 3. 압축 절차

```
Step 1: Phase 1 전체 동작 확인
Step 2: 코드 기준으로 각 문서 내용 검증 (문서 ≠ 코드이면 코드 기준으로 수정)
Step 3: PRD.md 작성 (00_PRD.md 기반, 구현 상태 반영)
Step 4: SYSTEM_RULES.md 작성 (systems/ 6개 → 6 섹션)
Step 5: PAGE_SPECS.md 작성 (pages/ 9개 → 9 섹션)
Step 6: 원본 이동: docs/v2_plan/ → docs/v2_plan/archive/
Step 7: CLAUDE.md에서 SSOT 경로 업데이트
```

---

## 4. 문서 간 의존성 맵 (압축 후)

```
CLAUDE.md (프로젝트 대원칙)
    │
    ├── 참조 ──→ PRD.md (무엇을, 왜)
    │
    ├── 참조 ──→ SYSTEM_RULES.md (횡단 규칙)
    │               │
    │               ├── Rating Engine ←──┐
    │               ├── XP System ←──────┤
    │               ├── Recommendation ←─┤── PAGE_SPECS의 각 페이지가 참조
    │               ├── Data Model ←─────┤
    │               ├── Auth & RLS ←─────┤
    │               └── Design System ←──┘
    │
    └── 참조 ──→ PAGE_SPECS.md (페이지별 규칙)
                    │
                    ├── Onboarding ──→ Auth, DataModel
                    ├── Home ──→ DataModel, Rating, Recommendation, XP
                    ├── Search ──→ DataModel, Rating
                    ├── Record ──→ Rating, Search, DataModel
                    ├── Restaurant ──→ DataModel, Rating, Design
                    ├── Wine ──→ DataModel, Rating, Design
                    ├── Profile ──→ DataModel, XP
                    ├── Bubble ──→ DataModel, Auth, XP
                    └── Settings ──→ Auth, DataModel
```

---

## 5. 수정 워크플로 (압축 후)

```
수정하고 싶은 게 생김
      │
      ├─ 한 페이지 안에서 완결 → 그냥 코딩
      │
      └─ SYSTEM_RULES에 걸리는 변경
             │
             ▼
        해당 섹션의 affects 확인 (10초)
             │
             ├─ 영향 1~2개 → 섹션 한 줄 수정 → 코딩
             └─ 영향 3개+ → 이건 "설계 변경" → 사용자 확인
```

**파일 3개니까 문서 수정이 5분을 넘길 일이 없다.**

---

## 6. 최종 파일 구조

```
docs/
├── PRD.md                    # 제품 정의
├── SYSTEM_RULES.md           # 횡단 규칙 (affects 태그)
├── PAGE_SPECS.md             # 페이지별 규칙 (depends_on 태그)
│
└── v2_plan/
    └── archive/              # 원본 보존 (의사결정 근거 추적)
        ├── 00_PRD.md
        ├── 00_IA.md
        ├── systems/
        ├── pages/
        └── research/
```

`CLAUDE.md`의 SSOT 섹션도 이 구조에 맞게 업데이트:

```markdown
## 설계 문서 (SSOT)
| 문서 | 역할 | 경로 |
|------|------|------|
| PRD | 제품 정의, 페이즈 범위 | docs/PRD.md |
| SYSTEM_RULES | 횡단 규칙 (affects 태그) | docs/SYSTEM_RULES.md |
| PAGE_SPECS | 페이지별 규칙 (depends_on 태그) | docs/PAGE_SPECS.md |
```

---

## 7. Apple 로그인 — 로컬 개발 환경 설정

> 프로덕션 도메인: `nyam.ai` / Apple OAuth는 등록된 도메인으로만 콜백 가능

### 방법 A — Supabase 콜백 경유 (권장)

Apple Developer 설정은 프로덕션 도메인만 등록하고, 코드에서 `redirectTo`로 로컬 리다이렉트:

```
Apple Developer Console 설정:
  Domains:     nyam.ai, <project-ref>.supabase.co
  Return URLs: https://<project-ref>.supabase.co/auth/v1/callback
```

```typescript
// 로컬 개발 시
await supabase.auth.signInWithOAuth({
  provider: 'apple',
  options: {
    redirectTo: 'http://localhost:7911/auth/callback',
  },
});

// 프로덕션
await supabase.auth.signInWithOAuth({
  provider: 'apple',
  options: {
    redirectTo: 'https://nyam.ai/auth/callback',
  },
});
```

흐름: 브라우저 → Apple 로그인 → Supabase 콜백 → `redirectTo`(localhost)로 리다이렉트

### 방법 B — Service ID에 localhost 추가

Apple Developer → Service ID → Configure에서 localhost를 직접 등록:

```
Domains:     nyam.ai, localhost
Return URLs: https://nyam.ai/auth/callback, http://localhost:7911/auth/callback
```

- Apple이 localhost를 허용하는 경우도 있지만 **거부될 수 있음**
- 프로덕션 배포 전 localhost 항목 제거 필요

### 방법 C — ngrok / Cloudflare Tunnel

로컬 서버를 HTTPS 터널로 노출:

```bash
ngrok http 7911
# 또는
cloudflared tunnel --url http://localhost:7911
```

발급된 URL(예: `https://xxxx.ngrok-free.app`)을 Apple Developer Return URL에 등록.

- 매번 URL이 바뀌므로 Apple Developer 설정도 갱신 필요 (유료 ngrok은 고정 도메인 가능)
- 팀원 공유 시 각자 터널 필요

### 권장 순서

```
1순위: 방법 A (Supabase 경유) — 설정 변경 없이 로컬 동작
2순위: 방법 C (ngrok) — A가 안 될 경우 확실한 대안
3순위: 방법 B (localhost 직접) — Apple 정책에 따라 불안정
```
