# S1: Foundation — DB + Auth + Design System

> 모든 것의 기반. P1+P2 전체 스키마를 한 번에 생성하여 나중의 마이그레이션 고통을 방지한다.

---

## SSOT 참조

| 문서 | 역할 |
|------|------|
| `systems/DATA_MODEL.md` | 전체 DB 스키마, 테이블 정의, 관계 |
| `systems/AUTH.md` | 인증 플로우, 소셜 로그인 |
| `systems/DESIGN_SYSTEM.md` | 디자인 토큰, 컬러, 타이포그래피 |
| `00_PRD.md` | 기술 스택 (Next.js, Supabase, Tailwind, shadcn/ui) |

---

## 산출물

- [ ] Next.js + Supabase 프로젝트 초기화
- [ ] P1+P2 전체 DB 스키마 마이그레이션
- [ ] 모든 테이블 RLS 정책
- [ ] 소셜 인증 (구글/카카오/네이버/애플)
- [ ] Tailwind 디자인 토큰 설정
- [ ] Clean Architecture 폴더 구조 + 기본 레이아웃

---

## 태스크 목록

| # | 태스크 | 지침 문서 | 선행 |
|---|--------|----------|------|
| 1.1 | 프로젝트 초기화 | `01_project_init.md` | 없음 |
| 1.2 | 전체 DB 스키마 | `02_schema.md` | 1.1 |
| 1.3 | RLS 정책 | `03_rls.md` | 1.2 |
| 1.4 | 소셜 인증 | `04_auth.md` | 1.1 |
| 1.5 | 디자인 토큰 | `05_design_tokens.md` | 1.1 |
| 1.6 | 폴더 구조 + 레이아웃 | `06_layout.md` | 1.1, 1.5 |
| 1.7 | S1 검증 | `07_validation.md` | 전체 |

---

## 기술 스택 (PRD §7 + DESIGN_SYSTEM)

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (PostgreSQL + Auth + RLS + Edge Functions + Storage)
- 폰트: Pretendard Variable (본문), Comfortaa (로고)
- 아이콘: Lucide

## 완료 기준

```
□ pnpm dev → localhost:7911 접속
□ pnpm build 성공
□ Supabase 연결 + 모든 테이블 생성 확인 (P1+P2 전체)
□ RLS 테스트 (인증 없이 접근 차단)
□ 소셜 로그인/로그아웃 4종 (구글/카카오/네이버/애플) 동작
□ 디자인 토큰 CSS 변수 적용 (DESIGN_SYSTEM.md §1 전체)
□ src/ 폴더 구조가 CLAUDE.md 클린 아키텍처와 일치
```
