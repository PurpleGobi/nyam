# Nyam v2 — 프로젝트 규칙 & 개발 실행 가이드

---
## 세션 시작 프로토콜

작업 시작 전 아래를 **반드시** 순서대로 Read:

```
1. WORKLOG.md                         ← 최근 작업 맥락 (무엇을 했고, 무엇이 남았는지)
2. CODEBASE.md                        ← 코드베이스 구조 인덱스 (어디에 뭐가 있는지)
3. CLAUDE.md                          ← 프로젝트 규칙 (아키텍처, 게이트, 금지사항 — 이 파일)
```

## 프로젝트 구조

```
nyam/
├── CLAUDE.md                       # 이 파일 (최상위 규칙)
├── development_docs/               # 설계 + 시스템 SSOT
│   ├── 00_PRD.md                   #   제품 정의
│   ├── 00_IA.md                    #   화면 맵
│   ├── POST_LAUNCH.md              #   출시 후 로드맵
│   └── systems/                    #   횡단 시스템 규칙 (SSOT 10개)
│       ├── DATA_MODEL.md           #     DB 스키마, 테이블, RPC, RLS
│       ├── AUTH.md                 #     인증, 권한, RLS 정책
│       ├── DESIGN_SYSTEM.md        #     디자인 토큰, 컴포넌트
│       ├── RECORD_SYSTEM.md        #     사분면/아로마/3-Phase/AI 리뷰/카메라 3모드/검색·dedup
│       ├── XP_SYSTEM.md            #     경험치/레벨 + Prestige
│       ├── BUBBLE_SYSTEM.md        #     버블 생애주기, 자동 공유, 랭킹
│       ├── SOCIAL_SYSTEM.md        #     팔로우, 댓글, 리액션, 알림
│       ├── RECOMMENDATION.md       #     Phase 1 규칙 + CF 알고리즘
│       ├── MAP_LOCATION.md         #     지도, 생활권, 와인 산지
│       └── QUERY_OPTIMIZATION.md   #     쿼리 원칙, 인덱스, RPC
├── _archive/                       # 과거 문서 (pages, prototype, 개념문서, refactoring 등)
└── src/                            # 코드
```

---

## 작업 루프

**커밋할 때마다** WORKLOG.md에 작업 엔트리 추가/갱신 (10개 초과 시 가장 오래된 것 삭제).

## 기술 스택

- Next.js (App Router) + TypeScript strict + Tailwind + shadcn/ui
- Supabase (PostgreSQL + Auth + RLS + Edge Functions + Storage)
- 폰트: Pretendard Variable (본문), Comfortaa (로고)
- 아이콘: Lucide
- AI: Gemini Vision (사진 분석, OCR)
- 외부 API: 카카오맵, 네이버 지도, 구글 Places

```bash
pnpm dev          # localhost:7911
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint (경고 0개 유지)
```

---

## Clean Architecture (절대 규칙)

```
app → presentation → application → domain ← infrastructure
                                            ↑
                                    shared/di/ (조합 루트)
```

| 규칙 | 설명 | 검증 |
|------|------|------|
| **R1** | domain은 외부 의존 0. React/Supabase/Next import 불가 | `grep -r "from 'react\|from '@supabase\|from 'next" src/domain/` |
| **R2** | infrastructure는 domain 인터페이스를 `implements`로 구현 | `grep -rL "implements" src/infrastructure/repositories/` |
| **R3** | application은 domain 인터페이스에만 의존. 구현체 직접 사용 금지 | `grep -r "from '.*infrastructure" src/application/` |
| **R4** | presentation은 application hooks만. shared/di/infrastructure/Supabase 직접 금지 (domain type import는 허용) | `grep -r "from '@supabase\|from '.*infrastructure\|from '.*shared/di" src/presentation/` |
| **R5** | app/은 라우팅만. page.tsx는 Container 렌더링만 | 수동 확인 |

### src/ 폴더 구조

```
src/
├── app/                    # Next.js App Router (라우팅만)
│   ├── (main)/             #   홈, discover, restaurants/[id], wines/[id], bubbles, profile
│   ├── auth/               #   인증
│   ├── onboarding/         #   온보딩
│   └── api/                #   API Routes
├── presentation/           # components(순수 UI, props만) + containers(hook+조합, 스타일 금지) + hooks(UI 상태)
├── application/            # hooks(비즈니스 로직) + useCases
├── domain/                 # entities + repositories(인터페이스) + services (순수, 외부 의존 0)
├── infrastructure/         # repositories(Supabase 구현체) + api + supabase
└── shared/                 # utils + constants + di/(조합 루트)
```

### DI 패턴

```typescript
// shared/di/container.ts — 유일하게 infrastructure를 import하는 조합 루트
import { SupabaseRestaurantRepository } from '@/infrastructure/repositories/...'
import type { RestaurantRepository } from '@/domain/repositories/...'
export const restaurantRepo: RestaurantRepository = new SupabaseRestaurantRepository()

// application/hooks/ — shared/di에서 repo를 가져와 비즈니스 로직 수행
import { restaurantRepo } from '@/shared/di/container'

// presentation/containers/ — application hooks만 사용 (shared/di 직접 접근 금지)
import { useRestaurantDetail } from '@/application/hooks/use-restaurant-detail'
```

### 기능 구현 순서

```
domain/entities → domain/repositories → infrastructure → application/hooks
→ presentation/components → presentation/containers → app/page.tsx
```

---

## 크리티컬 게이트

태스크 완료 시 **모두** 통과해야 다음으로 진행. 하나라도 실패하면 즉시 수정.

```
□ pnpm build          에러 없음
□ pnpm lint           경고 0개
□ TypeScript          any/as any/@ts-ignore/! 0개
□ R1~R5               위반 없음 (위 grep 명령으로 확인)
□ SSOT 정합성         코드가 systems/*.md 스펙과 일치
□ 보안                RLS 우회 없음, 키 노출 없음, SECURITY DEFINER 금지
□ 모바일              360px에서 레이아웃 깨짐 없음
```

---

## 코딩 규칙

```
파일: kebab-case       컴포넌트: PascalCase     hook: use- prefix
타입: PascalCase       상수: UPPER_SNAKE_CASE    CSS변수: --kebab-case
```

- 절대 경로 `@/` 사용 (상대 경로는 같은 폴더 내에서만)
- `console.log` 금지
- 디자인 토큰 필수 (`bg-background`, `text-foreground` — `bg-white`, `text-black` 등 하드코딩 금지)
- 컬러 분리: 식당 `--accent-food` / 와인 `--accent-wine` / 브랜드 `--brand`(로고 전용)
- 모바일 퍼스트: 360px 기준, 터치 타겟 44x44px
- 빈 상태: 모든 목록에 빈 상태 디자인 + CTA 필수

---

## Supabase 규칙

- 스키마 변경 → `supabase/migrations/` 파일로만 (직접 SQL 금지)
- 모든 테이블 RLS 활성화
- SECURITY DEFINER 함수 사용 금지
- `SUPABASE_SERVICE_ROLE_KEY`, 외부 API 키 → 서버 전용 (클라이언트 노출 금지)

---

## 수정 대원칙

- **근본 원인 해결**: 우회(workaround) 금지
- **보안 절대 불가침**: RLS 우회, 권한 상승 금지
- **부작용 최소화**: 수정이 다른 기능에 영향 주지 않는지 검증
- **affects 3개 이상 변경** → 사용자에게 먼저 확인
- **DB 스키마 변경** → 반드시 마이그레이션 파일로

---

## 속도 원칙

- 동작하는 코드 먼저 → 리팩토링은 나중에
- 3회 반복 전까지 추출 금지 (YAGNI)
- 한 스프린트 = 하나의 온전한 기능
- **"나중에" 허용 안 되는 것**: R1~R5 위반, DB 스키마/RLS, 타입 정의(`any` 금지)

---

## 오류 대처

```
❌ as any, @ts-ignore, 빈 catch, ! 단언으로 증상 숨기기
✅ 타입 추적 → domain/entities 수정 또는 infrastructure에서 변환
```

| 에러 유형 | 대처 |
|----------|------|
| 타입 에러 | `domain/entities` 수정 또는 `infrastructure`에서 변환 |
| Supabase 에러 | RLS 정책 수정 또는 마이그레이션 |
| UI 깨짐 | props/null 처리, 디자인 토큰 확인, 360px 뷰포트 확인 |
| 빌드 에러 | 즉시 수정 (다음 작업 넘어가지 않음) |
| 레이어 위반 | 코드를 올바른 레이어로 이동 |

---

## 스프린트 구조 (11 스프린트, 68+ 태스크)

> ※ 모든 스프린트 개발 완료 — 상세 계획/태스크는 `_archive/implementation_phases/` 참조.
> 이후 유지보수·개선 작업은 WORKLOG.md 엔트리 기반으로 진행한다.

| Sprint | 핵심 | 선행 | 상태 |
|--------|------|------|------|
| **S0** Design System CSS | globals.css 토큰 + Tailwind 매핑 + page-component map | 없음 | 완료 |
| **S1** Foundation | DB 전체 스키마(P1+P2) + RLS + 인증 4종 + 디자인 토큰 | 없음 | 완료 |
| **S2** Core Recording | 사분면 + 만족도 + 아로마 16섹터 3링 + 구조평가 + 페어링 8종 + 기록 플로우 | S1 | 완료 |
| **S3** Search | 카메라(Primary) + 검색 + OCR + EXIF GPS + 등록 + 풀플로우 | S1, S2 | 완료 |
| **S4** Detail Pages | 식당/와인 L1~L8 + 기록 상세 + 찜 CRUD | S1, S2 | 완료 |
| **S5** Home | 앱 셸 + 탭 + 4종 뷰 + 필터/소팅 + 통계 + 추천 7종 + 넛지 + Discover 서브스크린 | S1~S4 | 완료 |
| **S6** XP & Profile | XP 엔진 + 활성 XP 크론 + 프로필 + 설정 + 알림 | S2 | 완료 |
| **S7** Bubble | 생성/가입/초대 + 5종 가입정책 + 피드/랭킹/멤버 + 댓글/리액션 + 역할 + 랭킹 크론 | S1, S6 | 완료 |
| **S8** Integration | 팔로우/맞팔 + L9 + 홈 소셜 탭 + 버블 공유 + 버블러 프로필 | S4, S5, S7 | 완료 |
| **S9** Onboarding | 온보딩(로그인→맛집등록→버블생성→탐색→홈) + 넛지 정교화 + E2E + 최적화 | 전체 | 완료 |
| **S10** Maps | 식당 드릴다운 지도 + 와인 산지 3단계 드릴다운 지도 + SVG 데이터 | S6 | 부분완료 (country/region 2단계 완료, sub_region/appellation 3·4단계 미착수 — MAP_LOCATION §7.3 참조) |

---

## 문서화 의무

### WORKLOG.md 갱신 규칙
- **갱신 트리거**: **커밋할 때마다** (세션 종료를 자동 감지할 수 없으므로, 커밋 시점에 반드시 갱신)
- **엔트리 형식**: 날짜 + 번호 + 제목 / 영역 / 맥락 / 미완료 / 다음 (4줄 이내)
- **롤링**: 최대 10개. 11번째 추가 시 가장 오래된 것 삭제
- **불변 규칙**: 미완료 항목이 있으면 반드시 기록. "없음"이라도 명시

### CODEBASE.md 갱신 규칙
- **갱신 트리거**: 새 모듈/디렉토리 추가, DI 등록 변경, 레이어 구조 변경, 마이그레이션 추가
- **갱신 범위**: 해당 섹션만 수정 (전체 재작성 금지)
- **불변 규칙**: 코드 내용 복사 금지. 경로, 역할, 상태만 기록

### 불변 원칙
- WORKLOG.md와 CODEBASE.md는 **코드 변경과 동급으로 취급** — 갱신 누락은 크리티컬 게이트 실패
- 새 세션은 이 두 파일을 먼저 읽고 작업 시작 (코드 탐색 전)
- 문서가 코드 현실과 불일치 시 → 문서를 코드에 맞춰 즉시 수정

---

## 금지 사항

| 금지 | 이유 |
|------|------|
| `as any`, `@ts-ignore`, `!` 남발 | 타입 안전성 파괴 |
| `SECURITY DEFINER` | RLS 우회 |
| Component에서 Supabase/infrastructure import | R4 위반 |
| `bg-white`, `text-black` 하드코딩 | 다크모드 깨짐 |
| 문서에 없는 기능 추가 | 스코프 크립 |
| 마이그레이션 없이 스키마 변경 | 환경 불일치 |
| `console.log` | 프로덕션 오염 |
| infrastructure를 presentation에서 직접 import | R4 위반 (shared/di 경유) |
| 목업만 수정하고 문서/코드 미반영 | 동기화 파괴 |

---

## 참조 문서 맵

| 필요한 정보 | 읽을 문서 |
|------------|----------|
| 코드베이스 구조 | `CODEBASE.md` |
| 최근 작업 맥락 | `WORKLOG.md` |
| 제품 정의 | `development_docs/00_PRD.md`, `00_IA.md`, `POST_LAUNCH.md` |
| DB 스키마 / RPC / RLS | `development_docs/systems/DATA_MODEL.md` |
| 인증/권한/RLS 정책 | `development_docs/systems/AUTH.md` |
| 기록/평가/3-Phase/AI 리뷰 | `development_docs/systems/RECORD_SYSTEM.md` |
| 디자인 토큰/컴포넌트 | `development_docs/systems/DESIGN_SYSTEM.md` |
| XP/레벨/Prestige | `development_docs/systems/XP_SYSTEM.md` |
| 버블 시스템 (생애주기/자동공유/랭킹) | `development_docs/systems/BUBBLE_SYSTEM.md` |
| 소셜 (팔로우/댓글/리액션/알림) | `development_docs/systems/SOCIAL_SYSTEM.md` |
| 추천/CF 알고리즘 | `development_docs/systems/RECOMMENDATION.md` |
| 지도/위치/생활권/와인 산지 | `development_docs/systems/MAP_LOCATION.md` |
| 쿼리 최적화/인덱스/RPC 카탈로그 | `development_docs/systems/QUERY_OPTIMIZATION.md` |
| 과거 문서 (참고용) | `_archive/` (pages, prototype, refactoring, implementation_phases, implementation_shared, research, simulations, system_brainstorming, 개념문서_원본 — 세부는 `_archive/` 탐색) |
