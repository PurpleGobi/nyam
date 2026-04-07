---
name: vibe-coder
description: "Nyam 프로젝트 전용 바이브 코더. 자연어 요청으로 Clean Architecture R1-R5를 준수하면서 코드를 추가/수정한다. '기능 추가해줘', '이 함수 수정해줘', '새 페이지 만들어줘', '코드 수정', '기능 구현해줘', 'add feature', 'implement this', 'fix this code', '바이브 코딩', 'vibe coding', '리팩토링해줘', '버그 고쳐줘' 등 코드베이스 변경 작업에 이 스킬을 사용한다. 단, 프로젝트 초기 생성(scaffolding), 배포/CI-CD 설정, 디자인 시스템 구축은 범위 밖이다."
---

# Vibe Coder — Nyam 프로젝트 전용

사용자가 자연어로 "무엇"만 말하면, AI 에이전트 팀이 Nyam의 Clean Architecture R1-R5를 준수하면서 안전하게 구현한다.

## 실행 모드

**에이전트 팀** — 8명 에이전트 + myqa 스킬이 협업하며, 계획 검증 + 구현 완전성 검증 + 정적 분석 + 브라우저 QA 다중 검증 루프를 통해 품질을 보장한다.

## 에이전트 구성

| 에이전트 | 파일 | 역할 | 타입 |
|---------|------|------|------|
| codebase-analyst | `agents/codebase-analyst.md` | WORKLOG/CODEBASE 읽기, 프로젝트 상태 파악, R1-R5 검증 | general-purpose |
| requirements-clarifier | `agents/requirements-clarifier.md` | 사용자 Q&A로 요구사항 모호성 제거, 프로젝트 방향성 검증 | general-purpose |
| request-planner | `agents/request-planner.md` | 명확화된 요구사항 기반 영향 분석, Nyam 구현 순서 계획 | general-purpose |
| plan-reviewer | `agents/plan-reviewer.md` | 구현 계획의 일관성/정합성/완전성 검증 (최대 10회 루프) | general-purpose |
| implementer | `agents/implementer.md` | R1-R5 + 코딩 컨벤션 준수 코드 작성/수정 | general-purpose |
| impl-checker | `agents/impl-checker.md` | 계획 대비 구현 완전성 검증 — 누락/미완성 식별 (최대 10회 루프) | general-purpose |
| quality-guard | `agents/quality-guard.md` | 크리티컬 게이트 8항목 (정적 분석) | general-purpose |
| myqa | 전역 스킬 (`/myqa`) | headless browse 기반 브라우저 QA + 버그 수정 | 전역 스킬 — `Skill(skill: "myqa")` 호출 |
| integrator | `agents/integrator.md` | 조율, 루프 관리, 보고서, WORKLOG/CODEBASE 갱신 | general-purpose |

## 워크플로우

### Phase 1: 준비 (오케스트레이터 직접 수행)

1. **세션 시작 프로토콜 실행**:
   - `WORKLOG.md` 읽기 — 최근 작업 맥락, 미완료 항목
   - `CODEBASE.md` 읽기 — 코드베이스 구조 인덱스
   - `CLAUDE.md` 읽기 — 프로젝트 규칙 확인
2. 사용자 자연어 요청에서 추출:
   - **요청 내용**: 어떤 기능을 추가/수정하고 싶은지
   - **관련 영역**: 어떤 레이어/모듈에 해당하는지
3. **`_workspace/` 초기화**:
   - 이전 작업 산출물이 남아있으면 **전부 삭제** 후 디렉토리 재생성
   - `rm -rf _workspace && mkdir -p _workspace`
   - 이전 산출물이 다음 작업을 오염시키는 것을 방지 (캐시 모드 제외)
4. **실행 모드 결정** (아래 모드 결정 로직 참조)
5. **캐시 모드일 때만** `_workspace/_codebase_profile.md`를 보존 (3단계에서 삭제하지 않음)

### Phase 2: 팀 실행 (에이전트 순차 협업)

| 순서 | 작업 | 담당 | 의존 | 산출물 |
|------|------|------|------|--------|
| 2-1 | 코드베이스 분석 | `codebase-analyst` | Phase 1 완료 | `_workspace/_codebase_profile.md` |
| 2-2 | 요구사항 명확화 (사용자 Q&A) | `requirements-clarifier` | 2-1 | `_workspace/_clarified_requirements.md` |
| 2-3 | 레이어별 영향 분석 | `request-planner` | 2-1, 2-2 | `_workspace/_impact_analysis.md` |
| 2-4 | 구현 계획 수립 | `request-planner` | 2-2, 2-3 | `_workspace/_implementation_plan.md` |
| 2-4.5 | 계획 검증 루프 | `plan-reviewer` ↔ `request-planner` | 2-4 | `_workspace/_plan_review.md` (PASS까지 최대 10회) |
| 2-5 | 코드 구현 (Nyam 순서) | `implementer` | 2-4.5 PASS | 변경된 코드 파일들 |
| 2-5.5 | 구현 완전성 검증 루프 | `impl-checker` ↔ `implementer` | 2-5 | `_workspace/_impl_check.md` (PASS까지 최대 10회) |
| 2-6 | 크리티컬 게이트 검증 (정적) | `quality-guard` | 2-5.5 PASS | `_workspace/_verification_report.md` |
| 2-7 | 브라우저 QA + 버그 수정 | 전역 `/myqa` — `Skill(skill: "myqa")` 호출 | 2-6 통과 시 | myqa 리포트 |
| 2-8 | 통합 보고 + 문서 갱신 | `integrator` | 2-6, 2-7 완료 시 | `_workspace/_change_summary.md` + WORKLOG/CODEBASE 갱신 |

**요구사항 명확화 (2-2):**

```
round_count = 0
MAX_ROUNDS = 2

requirements-clarifier가:
  1. _codebase_profile.md + 관련 SSOT 문서 읽기
  2. 사용자 요청을 프로젝트 방향성·스프린트·기존 스펙과 대조
  3. 모호성 식별 → 질문 목록 생성 (최대 5개)
  4. 오케스트레이터를 통해 사용자에게 질문 전달

while round_count < MAX_ROUNDS:
    사용자 응답 수신
    모호성 잔존 여부 평가
    
    if 모든 모호성 해소:
        break → _clarified_requirements.md 작성
    else:
        round_count += 1
        추가 질문 생성 (더 구체적 선택지 제시)

_clarified_requirements.md 작성 → request-planner에게 전달
```

> **축소 모드 예외**: 단일 파일/함수 수정 같은 명확한 요청은 Q&A 없이 간략한 _clarified_requirements.md만 작성하고 바로 진행한다.

**계획 검증 루프 (2-4 ↔ 2-4.5):**

```
plan_loop = 0
MAX_PLAN_LOOPS = 10

while plan_loop < MAX_PLAN_LOOPS:
    if plan_loop == 0:
        request-planner가 구현 계획 수립
    else:
        request-planner가 plan-reviewer 피드백 기반으로 계획 수정

    plan-reviewer가 일관성/정합성/완전성 검증
    
    if PASS:
        break → 2-5 (코드 구현)로 진행
    else:
        plan_loop += 1
        plan-reviewer FAIL 피드백 → request-planner에게 전달

if plan_loop == MAX_PLAN_LOOPS and FAIL:
    사용자에게 에스컬레이션: 잔존 계획 문제 + 수동 판단 요청
```

> **핵심**: 계획이 완전히 검증될 때까지 구현에 들어가지 않는다.

**구현 완전성 검증 루프 (2-5 ↔ 2-5.5):**

```
impl_loop = 0
MAX_IMPL_LOOPS = 10

while impl_loop < MAX_IMPL_LOOPS:
    if impl_loop == 0:
        implementer가 코드 구현 (Nyam 구현 순서 준수)
    else:
        implementer가 impl-checker 피드백 기반으로 보완

    impl-checker가 계획 대비 구현 완전성 검증
    
    if PASS:
        break → 2-6 (크리티컬 게이트)로 진행
    else:
        impl_loop += 1
        impl-checker 누락/미완성 목록 → implementer에게 전달

if impl_loop == MAX_IMPL_LOOPS and FAIL:
    사용자에게 에스컬레이션: 미구현 항목 목록 + 수동 구현 가이드
```

> **핵심**: 계획의 모든 항목이 구현된 후에야 quality-guard로 넘어간다.

**코드 품질 검증 루프 (2-6 ↔ 2-7):**

```
qa_loop = 0
MAX_QA_LOOPS = 10

while qa_loop < MAX_QA_LOOPS:
    quality-guard가 크리티컬 게이트 8항목 검증 (정적 분석)
    
    if 정적 게이트 FAIL:
        loop_count += 1
        quality-guard가 FAIL 항목 → implementer에게 전달
        continue  # 정적 분석 먼저 통과해야 함

    # 오케스트레이터는 반드시 아래 도구를 호출한다:
    Skill(skill: "myqa", args: "{변경된 페이지 URL 또는 변경 범위 설명}")
    # SKIP 조건: dev 서버 미실행 또는 browse 바이너리 미설치일 때만
    # myqa는 버그 발견 시 직접 소스 수정 + atomic commit + 재검증까지 수행
    
    if myqa가 코드를 수정했으면:
        quality-guard 재검증 (myqa 수정이 게이트를 깨뜨리지 않았는지 확인)
        if 재검증 FAIL:
            loop_count += 1
            quality-guard FAIL 항목 → implementer에게 전달
            continue
    
    if myqa 결과 모든 이슈 resolved 또는 SKIP:
        break → 2-8 (통합 보고 + 문서 갱신)으로 진행
    else:  # deferred 이슈 존재
        loop_count += 1
        myqa 리포트의 deferred 이슈 → implementer에게 전달 (스크린샷 증거 포함)
        implementer가 수정 → quality-guard 재검증

if qa_loop == MAX_QA_LOOPS and FAIL:
    사용자에게 에스컬레이션
```

> **3단 검증 파이프라인**: plan-reviewer(계획 완전성) → impl-checker(구현 완전성) → quality-guard(코드 품질). 각 단계가 PASS해야 다음으로 넘어간다. 모든 루프는 최대 10회.

**대규모 변경 분할**: 영향 분석(2-3)에서 변경 파일 10개 이상 감지 시, 여러 Sub-Phase로 분할. 각 Sub-Phase별로 구현-검증 루프 반복.

**병렬 실행 원칙**:
- 오케스트레이터는 독립적인 Agent 호출을 **한 메시지에 여러 Agent tool을 동시 포함**하여 병렬 실행한다
- `_implementation_plan.md`의 **병렬 그룹(G1, G2...)**을 따른다: 같은 그룹 내 작업은 동시 실행, 그룹 간은 순차
- codebase-analyst의 코드 스캔/grep 검증도 병렬로 수행 (독립적인 Glob/Grep/Read를 동시 호출)
- 병렬 실행 후 모든 결과를 수집한 뒤 다음 단계로 진행

**팀원 간 소통 흐름:**
- `codebase-analyst` 완료 → `requirements-clarifier`, `request-planner`, `implementer`, `quality-guard`에게 `_codebase_profile.md` 전달
- `requirements-clarifier` → 사용자 Q&A (최대 2라운드) → `_clarified_requirements.md` 작성
- `request-planner`는 `_clarified_requirements.md` 기반으로: 영향 분석 → 구현 계획
- `request-planner` 완료 → `plan-reviewer`가 계획 검증 (PASS까지 최대 10회 루프)
- `plan-reviewer` PASS → `implementer`에게 `_implementation_plan.md` 전달
- `implementer` 완료 → `impl-checker`가 구현 완전성 검증 (PASS까지 최대 10회 루프)
- `impl-checker` PASS → `quality-guard`에게 변경 파일 목록 전달
- `quality-guard` 검증 실패 → `implementer`에게 `_verification_report.md` 전달
- `quality-guard` 검증 통과 → `myqa` 스킬 실행 (선택적 — dev 서버 + browse 바이너리 필요)
- `myqa` deferred 이슈 존재 → `implementer`에게 리포트 전달 (스크린샷 포함)
- `myqa` 완료 (모든 이슈 resolved) 또는 SKIP → `integrator`에게 `_verification_report.md` + QA 리포트 전달
- `integrator`는 전체 산출물을 읽고 `_change_summary.md` 작성 + WORKLOG/CODEBASE 갱신

### Phase 3: 통합 (오케스트레이터 직접 수행)

1. 전체 산출물 완성도 확인
2. 크리티컬 게이트 최종 확인 (정적 8항목 PASS + 브라우저 QA PASS/SKIP)
3. `_change_summary.md` 기반 사용자 최종 보고:
   - 레이어별 변경 파일
   - 크리티컬 게이트 결과 (정적 + 브라우저 QA)
   - myqa 리포트 요약 (수정된 이슈 / deferred 이슈)
   - WORKLOG/CODEBASE 갱신 여부
   - 주의사항 및 후속 권장 사항
4. `_codebase_profile.md` 캐시 유지 (다음 실행 시 재사용)

## 작업 규모별 모드

| 사용자 요청 패턴 | 실행 모드 | 투입 에이전트 | 생략 단계 |
|----------------|----------|-------------|----------|
| "이 함수 수정해줘", 단일 파일/함수 | **축소 모드** | requirements-clarifier(간략), request-planner, plan-reviewer, implementer, impl-checker, quality-guard | 2-1 스킵, 2-2 Q&A 없이 간략 문서만, 2-7 스킵, 2-8 간략화 |
| "기능 추가해줘", "새 페이지 만들어줘" | **풀 모드** | 에이전트 8명 + myqa 스킬 | 없음 |
| 영향 분석 결과 10개+ 파일 | **풀 + 분할** | 에이전트 8명 + myqa 스킬 | Sub-Phase별 구현-검증 |
| 동일 세션 연속 요청 | **캐시 모드** | request-planner, plan-reviewer, implementer, impl-checker, quality-guard, myqa, integrator | 2-1 스킵 |
| "분석만", "검증만" | **단일 모드** | 해당 에이전트만 | 불필요 단계 스킵 |

### 모드 결정 로직

```
1. 사용자 요청이 분석/검증만? → 단일 모드
2. 기존 _codebase_profile.md 존재? → 캐시 모드 후보
3. 명시적 단일 파일/함수 대상? → 축소 모드
4. 그 외 → 풀 모드
5. (런타임 전환) 영향 분석 결과 <= 3개 파일 → 축소 모드로 전환
6. (런타임 전환) 영향 분석 결과 >= 10개 파일 → 풀 + 분할로 전환
```

## 데이터 전달 프로토콜

| 전략 | 방식 | 용도 |
|------|------|------|
| 파일 기반 | `_workspace/` 내 마크다운 | 에이전트 간 중간 산출물 |
| 직접 수정 | `src/`, `supabase/migrations/` | implementer의 코드 변경 |
| 문서 갱신 | `WORKLOG.md`, `CODEBASE.md` | integrator의 문서 갱신 |
| 호출 인자 | SendMessage 인자 | 초기 컨텍스트 전달 |

### 파일명 컨벤션

```
_workspace/
├── _codebase_profile.md          ← codebase-analyst (Nyam 문서 기반 분석)
├── _clarified_requirements.md    ← requirements-clarifier (사용자 Q&A 결과)
├── _impact_analysis.md           ← request-planner (레이어별 영향)
├── _implementation_plan.md       ← request-planner (Nyam 구현 순서)
├── _plan_review.md              ← plan-reviewer (계획 검증 결과)
├── _impl_check.md               ← impl-checker (구현 완전성 검증 결과)
├── _verification_report.md       ← quality-guard (크리티컬 게이트 8항목)
└── _change_summary.md            ← integrator (보고서 + 문서 갱신 내역)

# myqa 산출물 (전역 /myqa 스킬이 생성, 경로는 myqa SKILL.md 참조)
```

## 에러 핸들링

| 에러 유형 | 전략 | 상세 |
|----------|------|------|
| WORKLOG.md/CODEBASE.md 미존재 | **폴백** | 직접 코드 스캔으로 대체. 프로필에 명시 |
| 요구사항 모호 | **Q&A** | requirements-clarifier가 사용자와 최대 2라운드 Q&A로 해소 |
| 2라운드 후에도 모호 | **폴백** | 가장 보수적 기본값으로 확정하고 명시. 설계 진행 |
| 요청이 PRD 방향성과 불일치 | **확인** | requirements-clarifier가 사용자에게 경고 후 진행 여부 확인 |
| 요청이 현재 스프린트 범위 밖 | **확인** | requirements-clarifier가 사용자에게 고지 후 진행 여부 확인 |
| R1-R5 위반 가능성 | **중단** | 위반하지 않는 대안 제시. 불가피하면 사용자 확인 |
| systems/*.md 스펙과 불일치 | **중단** | 스펙 우선 원칙. 사용자에게 보고 |
| 코드 구현 실패 | **재시도** | 1회 자동 재시도. 반복 실패 시 에스컬레이션 |
| 크리티컬 게이트 실패 | **루프** | implementer에게 이슈 전달. 최대 3회 |
| myqa deferred 이슈 | **루프** | myqa가 수정 못 한 이슈 → implementer에게 전달. 최대 3회 |
| 3회 루프 후에도 FAIL | **중단** | 실패 게이트 내역 + 변경사항 + 수동 수정 가이드 |
| 통합 보고 실패 | **스킵** | 간략 요약으로 대체 |
| DB 스키마 변경 필요 | **확인** | 마이그레이션 파일 생성 포함. 직접 SQL 금지 |
| 문서에 없는 기능 추가 요청 | **확인** | 사용자에게 스코프 확인 |

## 테스트 시나리오

### 정상 흐름: 새 기능 추가

**프롬프트**: "식당 상세 페이지에 즐겨찾기 기능 추가해줘"

**기대 결과**:
- **Phase 1**: WORKLOG/CODEBASE/CLAUDE.md 읽기, 풀 모드 결정
- **2-1**: `_codebase_profile.md` — 현재 식당 관련 레이어 분석, DATA_MODEL.md 참조
- **2-2**: requirements-clarifier가 사용자에게 Q&A:
  - "즐겨찾기 대상이 식당만인지, 와인도 포함인지?" (블로커)
  - "즐겨찾기 목록을 별도 탭으로 볼 수 있어야 하는지?" (중요)
  - "버블 내 즐겨찾기 공유 여부?" (선택, 기본값: 공유 안 함)
  → 사용자 응답 수신 → `_clarified_requirements.md` 작성
- **2-3**: `_impact_analysis.md` — domain(Favorite entity, FavoriteRepository), infrastructure(SupabaseFavoriteRepository), shared/di, application(useFavorite), presentation(FavoriteButton + RestaurantDetailContainer), 영향 범위
- **2-4**: `_implementation_plan.md` — domain → infrastructure → DI → application → presentation 순서
- **2-5**: implementer가 순서대로 코드 작성 (R1-R5 준수)
- **2-6**: quality-guard가 크리티컬 게이트 8항목 검증 → PASS
- **2-7**: myqa 스킬이 브라우저 QA 수행 — 360px 렌더링, 콘솔 에러, 인터랙션 확인 + 버그 발견 시 자동 수정 (dev 서버 실행 중이면)
- **2-8**: integrator가 보고서 작성 + WORKLOG.md 갱신
- **Phase 3**: 사용자에게 최종 보고

### 축소 흐름: 단일 함수 수정

**프롬프트**: "useRestaurant hook에서 에러 핸들링 개선해줘"

**기대 결과**:
- **Phase 1**: 축소 모드 결정 (단일 파일)
- **2-1 스킵**: codebase-analyst 호출 안 함
- **2-2 간략화**: requirements-clarifier가 Q&A 없이 간략한 _clarified_requirements.md 작성 (명확한 요청이므로)
- **2-3~2-4**: request-planner가 빠르게 분석, `application/hooks/use-restaurant.ts` 수정 계획
- **2-5**: implementer가 hook 수정 (R3 준수: domain 인터페이스만 참조)
- **2-6**: quality-guard가 게이트 검증
- **2-7 스킵**: myqa 생략 (UI 변경 없으므로)
- **2-8 간략화**: 간단한 보고서 + WORKLOG.md 갱신

### Q&A 흐름: 모호한 요청

**프롬프트**: "이 프로젝트 좀 개선해줘"

**기대 결과**:
- **Phase 1**: 풀 모드 시작
- **2-1**: codebase-analyst 정상 수행
- **2-2**: requirements-clarifier가 모호성 감지:
  - 라운드 1: "어떤 측면을 개선하고 싶으신가요? A) 성능 B) UI/UX C) 코드 품질 D) 보안"
  - 사용자: "코드 품질"
  - 라운드 2: "코드 품질 중 어떤 영역? A) 타입 안전성 강화 B) 미사용 코드 정리 C) 컨벤션 통일"
  - 사용자: "A"
  → `_clarified_requirements.md` 확정: "TypeScript 타입 안전성 강화"
- **2-3~2-7**: 정상 실행

### 에러 흐름: R1-R5 위반 감지

**시나리오**: implementer가 presentation에서 infrastructure를 직접 import

**기대 결과**:
- **2-6**: quality-guard가 게이트 4(R1-R5) FAIL 감지 → R4 위반 보고
- **루프 1**: implementer가 shared/di 경유로 수정 → quality-guard 재검증 → PASS
- **2-7**: myqa PASS (또는 dev 서버 미실행 시 SKIP)
- **2-8**: integrator가 "검증 루프 1회 실행, R4 위반 수정됨" 보고
