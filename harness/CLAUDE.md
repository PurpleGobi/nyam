# Harness Builder — 하네스 제작 하네스

사용자와의 대화를 통해 니즈를 파악하고, 맞춤형 에이전트 팀 하네스를 설계·생성하는 메타 하네스.

## 핵심 원칙

**하네스로 하네스를 만든다** — 이 프로젝트 자체가 `.claude/CLAUDE.md`와 에이전트 팀을 활용하는 하네스이며, 새로운 하네스를 생성할 때도 동일한 구조(`.claude/CLAUDE.md` + `agents/` + `skills/`)를 따른다.

## 구조

```
harness-builder/                  ← 프로젝트 루트
├── .claude/                      ← 하네스 빌더 자체의 하네스
│   ├── CLAUDE.md                 ← 이 파일 (하네스 빌더 설명서)
│   ├── agents/
│   │   ├── needs-analyst.md      — 니즈 분석가 (사용자 인터뷰, 요구사항 구조화)
│   │   ├── workflow-architect.md — 워크플로우 설계자 (Phase·의존관계·병렬구조 설계)
│   │   ├── agent-designer.md     — 에이전트 설계자 (역할·산출물·통신 프로토콜 정의)
│   │   ├── skill-engineer.md     — 스킬 엔지니어 (오케스트레이터 skill.md 작성)
│   │   └── harness-reviewer.md   — 하네스 검증자 (완성도·정합성·실행가능성 검증)
│   └── skills/
│       └── harness-builder/
│           └── skill.md          — 오케스트레이터 (팀 조율, 워크플로우, 에러핸들링)
├── _workspace/                   ← 제작 과정 중간 산출물
│   ├── 00_needs_brief.md
│   ├── 01_workflow_blueprint.md
│   ├── 02_agent_specs.md
│   └── 03_review_report.md
└── {harness-name}/               ← 완성된 하네스 (루트에 새 폴더로 생성)
    └── .claude/
        ├── CLAUDE.md
        ├── agents/
        │   └── *.md
        └── skills/
            └── {skill-name}/
                └── skill.md
```

## 사용법

`/harness-builder` 스킬을 트리거하거나, "하네스 만들어줘", "에이전트 팀 구성해줘" 같은 자연어로 요청한다.

## 산출물

### 중간 산출물 (`_workspace/`)
- `_workspace/00_needs_brief.md` — 사용자 니즈 분석 결과
- `_workspace/01_workflow_blueprint.md` — 워크플로우 청사진
- `_workspace/02_agent_specs.md` — 에이전트 스펙 종합
- `_workspace/03_review_report.md` — 검증 보고서

### 최종 산출물 (프로젝트 루트에 새 폴더)
- `{harness-name}/.claude/` — 완성된 하네스 파일셋 (CLAUDE.md + agents/ + skills/)

완성된 하네스는 프로젝트 루트에 `{harness-name}/` 폴더로 생성된다. 사용자는 이 폴더를 대상 프로젝트에 복사하여 사용한다:
```bash
cp -r {harness-name}/.claude/ /path/to/target-project/.claude/
```
