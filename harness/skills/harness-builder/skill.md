---
name: harness-builder
description: "사용자 맞춤형 에이전트 팀 하네스를 설계·생성하는 메타 하네스. '하네스 만들어줘', '에이전트 팀 구성해줘', '워크플로우 자동화해줘', '하네스 설계', 'harness 빌드', '에이전트 팀 설계', '나만의 하네스', '커스텀 하네스', 'build harness', 'create agent team' 등 에이전트 팀 하네스 제작 요청에 이 스킬을 사용한다. 단, 기존 하네스의 사용법 안내, 하네스 개념 설명, 하네스 목록 조회는 이 스킬의 범위가 아니다."
---

# Harness Builder — 맞춤형 하네스 제작 파이프라인

사용자와의 대화를 통해 니즈를 파악하고, 맞춤형 에이전트 팀 하네스를 설계·생성한다.

## 실행 모드

**에이전트 팀** — 5명이 SendMessage로 직접 통신하며 교차 검증한다.

## 에이전트 구성

| 에이전트 | 파일 | 역할 | 타입 |
|---------|------|------|------|
| needs-analyst | `.claude/agents/needs-analyst.md` | 사용자 인터뷰, 요구사항 구조화 | general-purpose |
| workflow-architect | `.claude/agents/workflow-architect.md` | Phase·의존관계·병렬구조 설계 | general-purpose |
| agent-designer | `.claude/agents/agent-designer.md` | 에이전트 역할·산출물·통신 정의 | general-purpose |
| skill-engineer | `.claude/agents/skill-engineer.md` | 오케스트레이터 skill.md·CLAUDE.md 작성 | general-purpose |
| harness-reviewer | `.claude/agents/harness-reviewer.md` | 완성도·정합성·실행가능성 검증 | general-purpose |

## 워크플로우

### Phase 1: 준비 (오케스트레이터 직접 수행)

1. 사용자 요청에서 추출한다:
   - **도메인**: 어떤 분야의 하네스를 만들고 싶은지
   - **목적**: 어떤 작업을 자동화하고 싶은지
   - **하네스 이름**: 영문 kebab-case (예: `blog-writer`, `code-reviewer`)
   - **기존 자료** (선택): 참고할 기존 하네스, 워크플로우 문서 등
2. `_workspace/` 디렉토리를 프로젝트 루트에 생성한다
3. 최종 산출물 경로를 결정한다: 프로젝트 루트에 `{harness-name}/` 폴더
4. 요청이 충분히 구체적인지 판단한다:
   - **구체적**: 도메인, 워크플로우 단계, 기대 산출물이 모두 명확 → Phase 2로 진행
   - **모호함**: needs-analyst 인터뷰부터 시작 → Phase 2의 작업 1로 진행

### Phase 2: 팀 구성 및 실행

팀을 구성하고 작업을 할당한다. 작업 간 의존 관계는 다음과 같다:

| 순서 | 작업 | 담당 | 의존 | 산출물 |
|------|------|------|------|--------|
| 1 | 니즈 분석 (사용자 인터뷰) | needs-analyst | 없음 | `_workspace/00_needs_brief.md` |
| 2 | 워크플로우 설계 | workflow-architect | 작업 1 | `_workspace/01_workflow_blueprint.md` |
| 3a | 에이전트 정의서 작성 | agent-designer | 작업 1, 2 | `_workspace/02_agent_specs.md` + `{harness-name}/.claude/agents/*.md` |
| 3b | 오케스트레이터·CLAUDE.md 작성 | skill-engineer | 작업 1, 2 | `{harness-name}/.claude/skills/{skill-name}/skill.md` + `{harness-name}/.claude/CLAUDE.md` |
| 4 | 하네스 검증 | harness-reviewer | 작업 3a, 3b | `_workspace/03_review_report.md` |

작업 3a(에이전트 정의)와 3b(스킬·CLAUDE.md)는 **병렬 실행**한다. 둘 다 작업 1(니즈)과 2(워크플로우)에만 의존하므로 동시에 시작할 수 있다. 단, skill-engineer는 agent-designer의 에이전트 파일 목록과 타입 정보를 수신해야 하므로, agent-designer가 에이전트 파일 생성을 완료한 뒤 skill-engineer가 에이전트 구성표를 최종 확정한다.

**팀원 간 소통 흐름:**
- needs-analyst 완료 → workflow-architect에게 워크플로우 분석·의존 관계 맵 전달, agent-designer에게 에이전트 역할 제안·품질 기준 전달, skill-engineer에게 전체 브리프 전달
- workflow-architect 완료 → agent-designer에게 통신 흐름·데이터 흐름 전달, skill-engineer에게 Phase 구조·의존 관계·에러 핸들링·모드 테이블 전달
- agent-designer 완료 → skill-engineer에게 에이전트 파일 목록·타입 전달
- skill-engineer 완료 → harness-reviewer에게 skill.md·CLAUDE.md 전달
- harness-reviewer는 모든 산출물을 교차 검증. 🔴 필수 수정 발견 시 해당 에이전트에게 수정 요청 → 재작업 → 재검증 (최대 2회)

### Phase 3: 통합 및 최종 산출물

리뷰어의 보고서를 기반으로 최종 하네스를 정리한다:

1. 프로젝트 루트에 `{harness-name}/.claude/` 폴더로 최종 하네스 파일셋을 확인한다:
   ```
   {harness-name}/
   └── .claude/
       ├── CLAUDE.md
       ├── agents/
       │   ├── {agent-1}.md
       │   └── ...
       └── skills/
           └── {skill-name}/
               └── skill.md
   ```
2. 리뷰 보고서의 🔴 필수 수정이 모두 반영되었는지 확인한다
3. 사용자에게 최종 보고한다:
   - 하네스 구조 요약
   - 에이전트 팀 구성
   - 사용법 (트리거 명령어, 자연어 예시)
   - 설치 방법: `cp -r {harness-name}/.claude/ /path/to/target-project/.claude/`
   - 검증 결과 요약

## 작업 규모별 모드

사용자 요청의 범위에 따라 투입 에이전트를 조절한다:

| 사용자 요청 패턴 | 실행 모드 | 투입 에이전트 |
|----------------|----------|-------------|
| "하네스 만들어줘", "에이전트 팀 구성해줘" | **풀 파이프라인** | 5명 전원 |
| "이 워크플로우로 하네스 만들어줘" (상세 워크플로우 제공) | **설계 모드** | architect + designer + engineer + reviewer (analyst 스킵) |
| "이 에이전트 정의 검토해줘" (기존 하네스 파일 제공) | **검증 모드** | reviewer 단독 |
| "에이전트 역할만 정의해줘" | **에이전트 모드** | analyst + designer |

**기존 파일 활용**: 사용자가 워크플로우 문서, 에이전트 정의서 등 기존 자료를 제공하면, 해당 자료를 `_workspace/`의 적절한 위치에 복사하고 해당 단계의 에이전트는 건너뛴다.

## 데이터 전달 프로토콜

| 전략 | 방식 | 용도 |
|------|------|------|
| 파일 기반 | `_workspace/` 디렉토리 | 중간 분석 산출물 저장 |
| 파일 기반 | `{harness-name}/.claude/` (프로젝트 루트) | 최종 하네스 파일셋 |
| 메시지 기반 | SendMessage | 실시간 핵심 정보 전달, 수정 요청 |

파일명 컨벤션: `{순번}_{산출물명}.md`

## 에러 핸들링

| 에러 유형 | 전략 |
|----------|------|
| 사용자 요구사항이 모호함 | needs-analyst가 구조화된 인터뷰로 구체화. 3회 질문 후에도 모호하면 합리적 기본값으로 진행하고 "가정" 섹션에 기록 |
| 실현 불가능한 요구사항 | needs-analyst가 대안을 제시하고 제약 사항에 명시 |
| 에이전트 수 초과 (7명+) | workflow-architect가 역할 합치기 또는 확장 스킬 분리를 제안 |
| 정합성 오류 발견 | harness-reviewer가 해당 에이전트에 수정 요청 → 재작업 → 재검증 (최대 2회) |
| 재작업 2회 후에도 미해결 | 미해결 항목과 수동 수정 가이드를 사용자에게 보고 |

## 테스트 시나리오

### 정상 흐름
**프롬프트**: "블로그 글 작성을 자동화하는 하네스를 만들어줘. 주제 리서치부터 초안 작성, SEO 최적화, 교정까지."
**기대 결과**:
- 니즈 브리프: 블로그 워크플로우 4단계, 에이전트 4~5명 제안
- 워크플로우 청사진: Phase 구조, 리서치→초안 병렬 불가 (의존), SEO+교정 병렬 가능
- `blog-writer/.claude/agents/` — researcher.md, writer.md, seo-specialist.md, editor.md, (reviewer.md)
- `blog-writer/.claude/skills/blog-writer/skill.md` — 풀 파이프라인 + 축소 모드(초안만/SEO만)
- `blog-writer/.claude/CLAUDE.md` — 구조 요약
- 검증 보고서: 8항목 전체 🟢

### 기존 파일 활용 흐름
**프롬프트**: "이 워크플로우 문서를 기반으로 하네스 만들어줘" + 워크플로우 문서 첨부
**기대 결과**:
- 워크플로우 문서를 `_workspace/01_workflow_blueprint.md`로 활용
- needs-analyst 스킵, workflow-architect는 기존 문서 기반으로 보완만 수행
- 나머지 에이전트 정상 실행

### 에러 흐름
**프롬프트**: "뭔가 자동화하고 싶은데 하네스 만들어줘"
**기대 결과**:
- needs-analyst가 인터뷰 시작: "어떤 분야의 작업을 자동화하고 싶으신가요?"
- 3라운드 인터뷰 후 니즈 브리프 작성
- 이후 정상 흐름 진행
