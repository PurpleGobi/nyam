# Vibe Coder — Nyam 프로젝트 전용

자연어 요청만으로 Nyam 코드베이스에 기능을 추가/수정하는 바이브 코딩 하네스.

## 핵심 원칙

**사용자는 "무엇"만, AI 팀이 "어떻게"를 담당한다** — Nyam의 Clean Architecture(R1-R5), 코딩 컨벤션, Supabase 규칙을 완벽히 준수하면서 안전하게 코드를 작성/수정한다.

## 브라우저 QA

브라우저 QA는 전역 스킬 `/myqa`가 담당한다. 워크플로우에서 `Skill(skill: "myqa")`로 호출하며, 버그 발견 시 소스 수정 → atomic commit → 재검증까지 처리한다.

## 세션 시작 프로토콜

작업 시작 전 **반드시** 순서대로 읽는다 (루트 CLAUDE.md와 동기화):

```
1. WORKLOG.md       ← 최근 작업 맥락 (무엇을 했고, 무엇이 남았는지)
2. CODEBASE.md      ← 코드베이스 구조 인덱스 (어디에 뭐가 있는지)
3. CLAUDE.md        ← 프로젝트 규칙 (아키텍처, 게이트, 금지사항 — 루트)
```

## 아키텍처 절대 규칙 (R1-R5)

```
app → presentation → application → domain ← infrastructure
                                            ↑
                                    shared/di/ (조합 루트)
```

| 규칙 | 설명 |
|------|------|
| **R1** | domain은 외부 의존 0. React/Supabase/Next import 불가 |
| **R2** | infrastructure는 domain 인터페이스를 `implements`로 구현 |
| **R3** | application은 domain 인터페이스에만 의존. 구현체 직접 사용 금지 |
| **R4** | presentation은 application hooks만. shared/di/infrastructure/Supabase 직접 금지 (domain type import는 허용) |
| **R5** | app/은 라우팅만. page.tsx는 Container 렌더링만 |

## 구현 순서 (항상)

```
domain/entities → domain/repositories → infrastructure/repositories
→ shared/di/container.ts 등록 → application/hooks
→ presentation/components → presentation/containers → app/page.tsx
```

## 크리티컬 게이트

모든 작업 완료 시 반드시 통과:

```
□ pnpm build          에러 없음
□ pnpm lint           경고 0개
□ TypeScript          any/as any/@ts-ignore/! 0개
□ R1~R5               위반 없음
□ SSOT 정합성         코드가 systems/*.md 스펙과 일치
□ 보안                RLS 우회 없음, 키 노출 없음, SECURITY DEFINER 금지
□ 디자인 토큰         bg-white/text-black 하드코딩 없음
□ console.log         0개
```

## 구조

```
nyam/
├── .claude/                       ← vibe-coder 하네스 (이 폴더)
│   ├── CLAUDE.md                  ← 이 파일
│   ├── agents/
│   │   ├── codebase-analyst.md    — 프로젝트 문서/구조/패턴 분석
│   │   ├── requirements-clarifier.md — 사용자 Q&A로 요구사항 명확화
│   │   ├── request-planner.md     — 영향 분석, 구현 계획
│   │   ├── plan-reviewer.md       — 계획 일관성/정합성/완전성 검증 (최대 10회 루프)
│   │   ├── implementer.md         — R1-R5 준수 코드 작성/수정
│   │   ├── impl-checker.md        — 계획 대비 구현 완전성 검증 (최대 10회 루프)
│   │   ├── quality-guard.md       — 크리티컬 게이트 검증 (정적 분석)
│   │   └── integrator.md          — 조율 + WORKLOG/CODEBASE 갱신
│   └── skills/
│       └── vibe-coder/
│           └── skill.md           — 오케스트레이터 (전역 /myqa 스킬을 Skill tool로 호출)
└── _workspace/                    ← 실행 중 생성되는 중간 산출물
```

## 사용법

`/vibe-coder` 스킬을 트리거하거나, 자연어로 코드 변경을 요청한다.

## 실행 모드

| 모드 | 조건 | 투입 에이전트 |
|------|------|-------------|
| 풀 모드 | 모듈 단위 이상 변경 | 8명 전원 + myqa 스킬 |
| 축소 모드 | 단일 파일/함수 변경 | request-planner, plan-reviewer, implementer, impl-checker, quality-guard (requirements-clarifier는 Q&A 없이 간략 문서만 작성) |
| 캐시 모드 | 동일 세션 연속 요청 | request-planner, plan-reviewer, implementer, impl-checker, quality-guard, myqa, integrator |
| 단일 모드 | 분석/검증만 요청 | 해당 에이전트만 |

## 참조 문서 맵

| 필요한 정보 | 읽을 문서 |
|------------|----------|
| 최근 작업 맥락 | `WORKLOG.md` |
| 코드베이스 구조 | `CODEBASE.md` |
| 클린 아키텍처 / 네이밍 규칙 / 크리티컬 게이트 | 루트 `CLAUDE.md` (R1~R5 + 코딩 규칙 + 금지 사항 섹션) |
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
| 과거 문서 (참고용) | `_archive/` (pages, prototype, implementation_phases, implementation_shared, refactoring, research, simulations, system_brainstorming, 개념문서_원본 — 세부는 탐색) |
