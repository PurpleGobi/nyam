# Nyam v2 — 프로젝트 규칙 & 개발 실행 가이드

---

## 프로젝트 구조

```
nyam/
├── CLAUDE.md                       # 이 파일 (최상위 규칙)
├── development_docs/               # 설계 + 구현 문서
│   ├── 00_PRD.md                   #   제품 정의
│   ├── 00_IA.md                    #   화면 맵, 스프린트 순서
│   ├── systems/                    #   횡단 시스템 규칙 (SSOT)
│   │   ├── DATA_MODEL.md           #     DB 스키마, 테이블, 관계
│   │   ├── AUTH.md                 #     인증, 권한, RLS, 프라이버시
│   │   ├── RATING_ENGINE.md        #     사분면, 아로마, 평가
│   │   ├── DESIGN_SYSTEM.md        #     디자인 토큰, 컬러, 컴포넌트
│   │   ├── XP_SYSTEM.md            #     경험치, 레벨, 어뷰징 방지
│   │   └── RECOMMENDATION.md       #     추천 알고리즘 7종
│   ├── pages/                      #   페이지별 구현 스펙 (01~12)
│   ├── prototype/                  #   인터랙티브 목업 HTML
│   └── implementation/             #   개발 실행 문서
│       ├── orchestration/          #     진행 추적 (MASTER_TRACKER, CURRENT_SPRINT 등)
│       ├── phases/                 #     스프린트별 지침 (S1~S10)
│       └── shared/                 #     공통 패턴 (클린 아키텍처, 테스트, 규칙)
└── src/                            # 코드 (구현 시작 시 생성)
```

---

## 세션 시작 프로토콜

```
1. CLAUDE.md                                          ← 이 파일
2. development_docs/implementation/orchestration/MASTER_TRACKER.md   ← 현재 어디까지
3. development_docs/implementation/orchestration/CURRENT_SPRINT.md   ← 다음 태스크 + 컨텍스트
4. 해당 phase overview (phases/SN_xxx/00_overview.md)
5. 해당 태스크의 세부 지침 문서
6. SSOT 문서 (overview에 명시된 systems/*.md, pages/*.md, prototype/*.html)
```

---

## 작업 루프

```
태스크 시작
  │
  ├─ MASTER_TRACKER 상태 → in_progress
  ├─ CURRENT_SPRINT 갱신 (태스크 #, 제목, 시작 시각)
  │
  ├─ SSOT 문서 + 목업 읽기
  ├─ domain → infrastructure → application → presentation → app 순서로 구현
  ├─ 목 데이터로 UI 먼저 → 인프라 연결은 나중
  │
  ├─ 🔄 검증-수정 루프 (최대 10회, 매회 처음부터 검토)
  │   │
  │   │  ⚠️ 매 회차마다 이전 검토 결과를 신뢰하지 않는다.
  │   │     수정이 새로운 문제를 만들 수 있으므로, 처음 검토하듯 전체를 다시 확인한다.
  │   │
  │   ├─ 1. 크리티컬 게이트 전체 실행 (빌드/린트/타입/R1~R5/SSOT/목업/보안/모바일)
  │   ├─ 2. SSOT 문서 다시 읽고 → 구현 누락/불일치 확인
  │   ├─ 3. prototype/*.html 대조 → UI 차이 확인
  │   │
  │   ├─ 문제 발견 → 수정 → 루프 반복 (카운트 +1)
  │   ├─ 문제 없음 → 루프 종료 → MASTER_TRACKER 상태 → done
  │   └─ 10회 도달 → 사용자에게 보고 (잔여 이슈 목록 제시)
  │
  └─ CURRENT_SPRINT 갱신 (완료 기록 + 다음 태스크 프리뷰)
```

세션 종료 시: CURRENT_SPRINT "컨텍스트 노트"에 인수인계 사항 기록.

### 검증-수정 루프 상세

```
적절한 규모의 구현 완료 (태스크 1개 또는 관련 태스크 묶음)
  │
  ├─ [회차 1] 크리티컬 게이트 실행
  │   ├─ pnpm build + pnpm lint
  │   ├─ R1~R5 grep 검증
  │   ├─ SSOT 문서 재확인 (해당 태스크의 systems/*.md + pages/*.md)
  │   ├─ prototype/*.html UI 대조
  │   ├─ 360px 모바일 확인
  │   └─ 발견된 이슈 → 수정
  │
  ├─ [회차 2~N] 수정 후 재검증 — 이전 회차 결과를 신뢰하지 않고 처음부터 전체 재검토
  │   ├─ 크리티컬 게이트 전항목 재실행 (이전에 통과한 항목도 다시)
  │   ├─ SSOT 문서를 다시 읽고 처음 보듯 대조
  │   ├─ 새로운 이슈 발견 → 수정 → 다음 회차
  │   └─ 이슈 없음 → 완료
  │
  └─ 최대 10회. 10회 후에도 이슈 → 사용자에게 잔여 이슈 보고
```

---

## 문서 우선순위 & 정합성

```
CLAUDE.md > systems/*.md > pages/*.md > 00_PRD.md
```

- 코드와 문서가 충돌 → **코드를 문서에 맞춘다**
- 문서가 명백히 틀림 → 사용자에게 알리고 확인 후 수정
- **문서에 없는 기능은 자의적으로 추가하지 않는다**
- 구현 중 설계 결정이 필요하면 → `implementation/orchestration/DECISIONS_LOG.md`에 기록

### 문서-목업-코드 동기화

```
목업 수정 → 문서 반영 → 코드 반영 (어느 한쪽만 수정하는 것은 금지)
```

| 변경 대상 | 반영해야 할 곳 |
|-----------|---------------|
| `prototype/*.html` | → `pages/*.md` 또는 `systems/*.md` |
| `pages/*.md` | → 관련 코드 + `prototype/*.html` |
| `systems/*.md` | → 관련 `pages/*.md` + `prototype/*.html` + 코드 모두 |

---

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
| **R4** | presentation은 application hooks + shared/di만. Supabase/infrastructure 직접 금지 | `grep -r "from '@supabase\|from '.*infrastructure" src/presentation/` |
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

// presentation/containers/ — shared/di에서 받으므로 R4 준수
import { restaurantRepo } from '@/shared/di/container'
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
□ SSOT 정합성         코드가 systems/*.md + pages/*.md 스펙과 일치
□ 목업 정합성         UI가 prototype/*.html과 일치
□ 보안                RLS 우회 없음, 키 노출 없음, SECURITY DEFINER 금지
□ 모바일              360px에서 레이아웃 깨짐 없음
```

스프린트 완료 시 추가:
```
□ 이전 스프린트 기능 회귀 없음
□ DECISIONS_LOG에 주요 결정 기록
□ MASTER_TRACKER 갱신
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

## 스프린트 구조 (10 스프린트, 68 태스크)

| Sprint | 핵심 | 선행 |
|--------|------|------|
| **S1** Foundation | DB 전체 스키마(P1+P2) + RLS + 인증 4종 + 디자인 토큰 | 없음 |
| **S2** Core Recording | 사분면 + 만족도 + 아로마 15섹터 3링 + 구조평가 + 페어링 8종 + 기록 플로우 | S1 |
| **S3** Search | 카메라(Primary) + 검색 + OCR + EXIF GPS + 등록 + 풀플로우 | S1, S2 |
| **S4** Detail Pages | 식당/와인 L1~L8 + 기록 상세 + 찜 CRUD | S1, S2 |
| **S5** Home | 앱 셸 + 탭 + 4종 뷰 + 필터/소팅 + 통계 + 추천 7종 + 넛지 + Discover 서브스크린 | S1~S4 |
| **S6** XP & Profile | XP 엔진 + 활성 XP 크론 + 프로필 + 설정 + 알림 | S2 |
| **S7** Bubble | 생성/가입/초대 + 5종 가입정책 + 피드/랭킹/멤버 + 댓글/리액션 + 역할 + 랭킹 크론 | S1, S6 |
| **S8** Integration | 팔로우/맞팔 + L9 + 홈 소셜 탭 + 버블 공유 + 버블러 프로필 | S4, S5, S7 |
| **S9** Onboarding | 온보딩(로그인→맛집등록→버블생성→탐색→홈) + 넛지 정교화 + E2E + 최적화 | 전체 |
| **S10** Maps | 식당 드릴다운 지도 + 와인 산지 3단계 드릴다운 지도 + SVG 데이터 | S6 |

상세 태스크 목록 → `development_docs/implementation/orchestration/MASTER_TRACKER.md`
의존성 그래프 → `development_docs/implementation/orchestration/DEPENDENCY_MAP.md`

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
| 현재 진행 상황 | `implementation/orchestration/MASTER_TRACKER.md` |
| 다음 할 일 | `implementation/orchestration/CURRENT_SPRINT.md` |
| 의존성/순서 | `implementation/orchestration/DEPENDENCY_MAP.md` |
| 과거 결정 | `implementation/orchestration/DECISIONS_LOG.md` |
| 검증 방법 | `implementation/orchestration/REVIEW_LOOP.md` |
| 클린 아키텍처 패턴 | `implementation/shared/CLEAN_ARCH_PATTERN.md` |
| 테스트 전략 | `implementation/shared/TESTING_STRATEGY.md` |
| 네이밍/규칙 | `implementation/shared/CONVENTIONS.md` |
| 스프린트 상세 | `implementation/phases/SN_xxx/00_overview.md` |
| DB 스키마 | `systems/DATA_MODEL.md` |
| 인증/권한/RLS | `systems/AUTH.md` |
| 사분면/아로마/평가 | `systems/RATING_ENGINE.md` |
| 디자인 토큰/컴포넌트 | `systems/DESIGN_SYSTEM.md` |
| XP/레벨/어뷰징 | `systems/XP_SYSTEM.md` |
| 추천 알고리즘 | `systems/RECOMMENDATION.md` |
| 페이지별 스펙 | `pages/01~12_*.md` |
| 비주얼 레퍼런스 | `prototype/*.html` |
