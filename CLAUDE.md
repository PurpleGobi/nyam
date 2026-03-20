# Nyam v2 — 프로젝트 대원칙

---

## ⚠️ 최우선 규칙: 폴더 구조 & 문서-목업 동기화

prototype 의 목업 html 을 수정할때마다 해당 내용들이 개발 문서에 잘 반영됭어 있는지 확인하고 업데이트 한다. 

### 프로젝트 폴더 구조

```
nyam/
├── CLAUDE.md                    # 이 파일 (최상위 원칙)
├── development_docs/            # 🔑 구현용 설계 문서 (SSOT)
│   ├── 00_PRD.md               #   제품 정의
│   ├── 00_IA.md                #   화면 맵, 스프린트 순서
│   ├── systems/                #   횡단 시스템 규칙 (DB, 인증, 평가, XP, 추천, 디자인)
│   ├── pages/                  #   페이지별 구현 스펙
│   ├── prototype/              #   인터랙티브 목업 HTML
│   └── POST_LAUNCH.md          #   개발 완료 후 문서 압축 가이드
├── docs/                        # 기타 문서
│   └── research/               #   리서치 자료 (개발에 직접 안 씀)
├── old_nyam/                    # v1 코드 아카이브 (참조 금지)
└── src/                         # (구현 시작 시 생성)
```

> **old_nyam/ 폴더는 참조하지 않는다.** 사용자가 명시적으로 요청할 때만 참조.

### 문서-목업 동기화 원칙 (절대 규칙)

코드 구현 시작 전까지는 아래 사이클을 반복한다:

```
목업 수정 → 문서 반영 → 일관성 확인 (어느 한쪽만 수정하는 것은 금지)
```

| 변경 대상 | 반영해야 할 곳 |
|-----------|---------------|
| `prototype/*.html` | → `pages/*.md` 또는 `systems/*.md` |
| `pages/*.md` | → `prototype/*.html` |
| `systems/*.md` | → 관련 `pages/*.md` + `prototype/*.html` 모두 |

### 문서 우선순위
```
CLAUDE.md > systems/*.md > pages/*.md > 00_PRD.md
```

### 문서와 코드가 충돌할 때
- 구현 중: **코드를 문서에 맞춘다**
- 문서가 명백히 틀린 경우: 사용자에게 알리고 확인 후 수정
- **문서에 없는 기능은 자의적으로 추가하지 않는다**

---

## 커맨드

```bash
pnpm dev          # localhost:7911
pnpm build        # 프로덕션 빌드 (스프린트 끝나면 반드시 확인)
pnpm lint         # ESLint (경고 0개 유지)
```

---

## 수정 대원칙

- **근본 원인 해결**: 우회(workaround)가 아닌 근본적인 원인을 찾아 수정
- **보안 절대 불가침**: RLS 우회, 권한 상승 등 보안 무력화 금지
- **부작용 최소화**: 수정이 다른 기능에 영향 주지 않는지 검증
- **affects 3개 이상 변경** → 사용자에게 먼저 확인 → 승인 후 진행
- **DB 스키마 변경** → 반드시 마이그레이션 파일로

---

## Clean Architecture (절대 규칙)

```
app → presentation → application → domain ← infrastructure
```

| 규칙 | 설명 |
|------|------|
| **R1** | domain은 어떤 레이어에도 의존 금지. React, Supabase import 불가 |
| **R2** | infrastructure는 domain 인터페이스를 구현 |
| **R3** | application은 domain 인터페이스에만 의존. 구현체 직접 사용 금지 |
| **R4** | presentation은 application hooks만 사용. Supabase 직접 호출 금지 |
| **R5** | app/은 라우팅만. page.tsx는 Container 렌더링만 |

### src/ 폴더 구조

```
src/
├── app/                         # Next.js App Router (라우팅만)
│   ├── (main)/                  # 홈, discover, record, restaurants/[id], wines/[id], bubbles, profile
│   ├── auth/                    # 인증
│   ├── onboarding/              # 온보딩
│   └── api/                     # API Routes
├── presentation/                # UI Layer — components(순수 UI), containers(hook+조합), hooks(UI상태)
├── application/                 # Use Case Layer — hooks(비즈니스), useCases
├── domain/                      # Core Layer (순수) — entities, repositories(인터페이스), services
├── infrastructure/              # Infra Layer — repositories(Supabase 구현체), api, supabase
└── shared/                      # utils, constants
```

### Component vs Container

| 구분 | 위치 | 규칙 |
|------|------|------|
| **Component** | `presentation/components/` | 순수 UI, props만. application hook 금지 |
| **Container** | `presentation/containers/` | hook 호출 + Component 조합. 시각적 스타일링 금지 |

### 기능별 개발 순서

```
domain/entities → domain/repositories → infrastructure → application/hooks → components → containers → app/page.tsx
```

---

## 바이브코딩 원칙

### 스프린트 워크플로
```
1. 문서 읽기 (CLAUDE.md → systems/ → pages/ → prototype/)
2. domain 타입 정의
3. 화면 만들기 (UI 먼저, 목 데이터로)
4. 인프라 연결 (Supabase)
5. pnpm build 확인
```

### 속도 원칙
- 동작하는 코드 먼저 → 리팩토링은 나중에
- 3회 반복 전까지 추출 금지 (YAGNI)
- 한 스프린트 = 하나의 온전한 기능

### "나중에" 허용되지 않는 것
- 클린 아키텍처 레이어 위반 (R1~R5)
- DB 스키마 구조 / RLS 정책
- 타입 정의 (`any` 금지)

---

## 오류 대처

```
❌ 증상 숨기기 (as any, @ts-ignore, 빈 catch, ! 단언)
✅ 원인 찾기 (타입 추적, 레이어 점검, 문서 affects 확인)
```

- **타입 에러** → `domain/entities` 수정 또는 `infrastructure`에서 변환
- **Supabase 에러** → RLS 정책 수정 (SECURITY DEFINER 금지) 또는 마이그레이션
- **UI 깨짐** → props/null 처리, 모바일 우선, 디자인 토큰 확인
- **빌드 에러** → 즉시 수정 (다음 작업 넘어가지 않음)

---

## Supabase 원칙

- 스키마 변경은 `supabase/migrations/` 파일로만 (직접 SQL 금지)
- 모든 테이블 RLS 활성화, SECURITY DEFINER 금지
- `SUPABASE_SERVICE_ROLE_KEY`, 외부 API 키 → 서버 전용 (클라이언트 노출 금지)

---

## UI/UX 원칙

- **모바일 퍼스트**: 360px 기준, 터치 타겟 44x44px, 하단 내비 h-20
- **디자인 토큰 필수**: `bg-background`, `text-foreground` (하드코딩 금지)
- **컬러 분리**: 식당 `#FF6038` / 와인 `#6B4C8A`
- **빈 상태**: 모든 목록에 빈 상태 디자인 + CTA 필수

---

## 코딩 규칙

- TypeScript strict, `any`/`as any`/`@ts-ignore` 금지
- ESLint 경고 0개, `console.log` 금지
- 절대 경로 `@/` 사용 (상대 경로는 같은 폴더 내에서만)

```
파일: kebab-case    컴포넌트: PascalCase    hook: use- prefix
타입: PascalCase    상수: UPPER_SNAKE_CASE
```

---

## 금지 사항

| 금지 | 이유 |
|------|------|
| `as any`, `@ts-ignore`, `!` 남발 | 타입 안전성 파괴 |
| SECURITY DEFINER | RLS 우회 |
| Component에서 Supabase 직접 호출 | R4 위반 |
| `bg-white` 하드코딩 | 다크모드 깨짐 |
| 문서에 없는 기능 추가 | 스코프 크립 |
| 목업만 수정하고 문서 미반영 (또는 반대) | 문서-목업 불일치 |
| 마이그레이션 없이 스키마 변경 | 환경 불일치 |

---

## 스프린트 순서 (P1+P2 통합, 9 스프린트)

> S1에서 P2 테이블 포함 전체 스키마 생성. 온보딩은 마지막.

| Sprint | 문서 | 산출물 |
|--------|------|--------|
| **S1** | DATA_MODEL + AUTH + DESIGN_SYSTEM | P1+P2 전체 DB, RLS, 인증, 디자인 토큰 |
| **S2** | RATING_ENGINE + RECORD_FLOW | 사분면 UI, 아로마 팔레트, 기록 저장 |
| **S3** | SEARCH_REGISTER | 검색/등록 + 평가 연결 |
| **S4** | RESTAURANT_DETAIL + WINE_DETAIL | 상세 페이지 L1~L8 |
| **S5** | HOME + RECOMMENDATION | 홈 타임라인, 추천 7종, Discover |
| **S6** | XP_SYSTEM + PROFILE + SETTINGS | XP/레벨/뱃지, 프로필, 설정 |
| **S7** | BUBBLE | 버블 전체 (생성/공유/피드/댓글/리액션/통계/알림) |
| **S8** | BUBBLE 통합 + FOLLOW | 상세 L9, 홈 버블 피드, 공유 연결, 팔로우 |
| **S9** | ONBOARDING + 마무리 | 온보딩 풀 플로우, 넛지, 전체 검증 |
