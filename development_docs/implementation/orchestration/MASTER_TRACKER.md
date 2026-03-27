# Master Tracker

> 전체 구현 진행 상황. LLM은 새 세션 시작 시 이 문서를 **먼저** 읽는다.

---

## 실행 전략: 웨이브 병렬 실행

순차 스프린트가 아닌 **웨이브 단위 병렬 실행**으로 최대 속도를 낸다.
각 웨이브에서 의존성이 해소된 작업을 최대한 병렬로 가동한다.

```
Wave 1 ━━ S1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  (1 세션)
Wave 2 ━━ S2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  (1 세션)
Wave 3 ━━ S3 ━━━━━━━━┓                         (최대 3 세션)
       ━━ S4(4.1~4.4)┃
       ━━ S6 ━━━━━━━━┛
Wave 4 ━━ S4.5~4.6 → S5 ━━━━━━━━━━━━━━━━━━━━  (최대 2 세션)
       ━━ S7 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Wave 5 ━━ S8 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  (1 세션)
Wave 6 ━━ S9 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  (1 세션)
```

---

## 웨이브 상세

### Wave 1 — Foundation (1 세션)
> 선행: 없음. 모든 것의 시작점.

| 세션 | 작업 | 완료 조건 |
|------|------|----------|
| **A** | S1 전체 (1.1→1.2+1.4+1.5 병렬→1.3+1.6→1.7) | `pnpm build` + RLS + 인증 4종 + 토큰 |

### Wave 2 — Core Recording (1 세션)
> 선행: Wave 1 완료. 앱의 핵심 UX이므로 단일 세션에서 집중.

| 세션 | 작업 | 완료 조건 |
|------|------|----------|
| **A** | S2 전체 (2.1→2.2~2.8 병렬→2.9→2.10→2.11) | 기록 생성→저장→조회 풀플로우 |

### Wave 3 — 3방향 병렬 (최대 3 세션)
> 선행: Wave 2 완료. 세 갈래가 서로 독립.

| 세션 | 작업 | 선행 | 완료 조건 |
|------|------|------|----------|
| **A** | **S3** 전체 (검색 + 카메라 + EXIF + 등록) | S2 | FAB→카메라/검색→기록→저장 풀플로우 |
| **B** | **S4** 4.1~4.4 (상세 L1~L8 + 기록 상세 + 찜) | S2 | 상세 렌더링 + 찜 CRUD (4.5는 S3 대기) |
| **C** | **S6** 전체 (XP 엔진 + 프로필 + 설정 + 알림) | S2 | XP 적립 + 프로필 + 설정 + 알림 동작 |

> **유동 규칙**: 세션 B가 4.4까지 완료하고 S3(세션 A)가 아직 진행 중이면:
> - S4.5는 S3 완료 대기이고, S7은 세션 C가 담당 (1스프린트 1세션 원칙)
> - **세션 B는 종료** → Wave 3은 2세션(A+C)으로 계속
> - S3 완료 후 세션 A가 S4.5→S4.6→S5로 이어받음

### Wave 4 — 2방향 병렬 (최대 2 세션)
> 선행: Wave 3의 완료 상황에 따라 유동 시작.

| 세션 | 작업 | 시작 조건 | 완료 조건 |
|------|------|----------|----------|
| **A** | **S4.5~4.6** → **S5** 전체 | S3 완료 → S4.5 착수 → S4 완료 → S5 착수 | 홈 + 추천 + Discover |
| **B** | **S7** 전체 (버블 시스템) | S6 완료 | 버블 생성/피드/랭킹/역할 + 크론 |

> **유동 규칙**:
> - S6이 Wave 3에서 먼저 끝나면 S7은 Wave 3 도중에 시작 가능 (Wave 3.5)
> - S7이 S5보다 먼저 끝나면 해당 세션은 S5를 도울 수 없음 (다른 코드 영역) → 세션 종료
> - S5가 S7보다 먼저 끝나면 해당 세션도 종료 → S8은 양쪽 완료 대기

### Wave 5 — Social Integration (1 세션)
> 선행: S4, S5, S7 **모두** 완료.

| 세션 | 작업 | 완료 조건 |
|------|------|----------|
| **A** | S8 전체 (팔로우 + L9 + 홈 소셜 + 공유 + 버블러 프로필) | 소셜 레이어 통합 완료 |

### Wave 6 — Onboarding & Polish (1 세션)
> 선행: S1~S8 **전체** 완료.

| 세션 | 작업 | 완료 조건 |
|------|------|----------|
| **A** | S9 전체 (온보딩 + 넛지 + E2E + 빌드 최적화) | 전체 플로우 완주 + `pnpm build` + LCP <3s |

---

## 웨이브 진행 현황

| Wave | 세션 수 | 상태 | 시작일 | 완료일 |
|------|---------|------|--------|--------|
| 1 (S1) | 1 | `not_started` | - | - |
| 2 (S2) | 1 | `not_started` | - | - |
| 3 (S3+S4+S6) | 최대 3 | `not_started` | - | - |
| 4 (S5+S7) | 최대 2 | `not_started` | - | - |
| 5 (S8) | 1 | `not_started` | - | - |
| 6 (S9) | 1 | `not_started` | - | - |

---

## 스프린트별 태스크 진행

### S1 — Foundation (Wave 1)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 1.1 | 프로젝트 초기화 (Next.js + Supabase) | `S1/01_project_init.md` | `not_started` | `pnpm build` 성공 |
| 1.2 | 전체 DB 스키마 생성 (P1+P2) | `S1/02_schema.md` | `not_started` | 마이그레이션 적용 + 타입 생성 |
| 1.3 | RLS 정책 설정 | `S1/03_rls.md` | `not_started` | RLS 테스트 통과 |
| 1.4 | 소셜 인증 (구글/카카오/네이버/애플) | `S1/04_auth.md` | `not_started` | 4종 로그인/로그아웃 플로우 동작 |
| 1.5 | 디자인 토큰 + Tailwind 설정 | `S1/05_design_tokens.md` | `not_started` | 토큰 적용 확인 |
| 1.6 | 클린 아키텍처 폴더 + 기본 레이아웃 | `S1/06_layout.md` | `not_started` | `pnpm build` + 레이어 의존성 확인 |
| 1.7 | S1 검증 | `S1/07_validation.md` | `not_started` | REVIEW_LOOP 전체 통과 |

### S2 — Core Recording (Wave 2)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 2.1 | domain 엔티티 (Record, Rating, Quadrant) | `S2/01_domain.md` | `not_started` | 타입 체크 통과 |
| 2.2 | 사분면 UI (가격x분위기 / 산미x바디) | `S2/02_quadrant_ui.md` | `not_started` | 터치/드래그 동작 확인 |
| 2.3 | 만족도 게이지 (1-100) | `S2/03_satisfaction.md` | `not_started` | 게이지 인터랙션 확인 |
| 2.4 | 아로마 팔레트 (와인 15섹터 3링) | `S2/04_aroma.md` | `not_started` | 3링 15섹터 선택 동작 |
| 2.5 | 와인 구조평가 (복합성/여운/균형) | `S2/05_structure.md` | `not_started` | 슬라이더 3개 + 만족도 자동산출 |
| 2.6 | 페어링 카테고리 (WSET 8종 그리드) | `S2/06_pairing.md` | `not_started` | 8카테고리 다중 선택 + AI 추천 |
| 2.7 | 씬태그 + 동행자 선택 | `S2/07_scene_tags.md` | `not_started` | 태그 토글 동작 |
| 2.8 | 사진 업로드 + Storage 연결 | `S2/08_photos.md` | `not_started` | 사진 촬영/선택→Storage 업로드→record_photos 저장 |
| 2.9 | 기록 저장 플로우 (Phase 1 + 2) | `S2/09_record_flow.md` | `not_started` | 기록 생성→조회 풀플로우 |
| 2.10 | infrastructure 연결 (Supabase) | `S2/10_infra.md` | `not_started` | 실제 DB 저장/조회 |
| 2.11 | S2 검증 | `S2/11_validation.md` | `not_started` | REVIEW_LOOP 전체 통과 |

### S3 — Search & Register (Wave 3, 세션 A)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 3.1 | 카메라 촬영 + AI 인식 경로 | `S3/01_camera_ai.md` | `not_started` | 촬영→AI 인식→pre-fill |
| 3.2 | 검색 UI + 자동완성 | `S3/02_search_ui.md` | `not_started` | 검색→결과 표시 |
| 3.3 | 식당 검색 (Nyam DB + 외부 API) | `S3/03_restaurant_search.md` | `not_started` | API 연동 확인 |
| 3.4 | 와인 검색 (Nyam DB + 라벨 OCR) | `S3/04_wine_search.md` | `not_started` | 검색 + OCR 동작 |
| 3.5 | 사진 EXIF GPS 검증 | `S3/05_exif.md` | `not_started` | 반경 200m 검증 동작 |
| 3.6 | 신규 등록 플로우 | `S3/06_register.md` | `not_started` | 식당/와인 신규 등록 |
| 3.7 | 검색→선택→기록 풀플로우 연결 | `S3/07_full_flow.md` | `not_started` | FAB→검색/카메라→기록→저장 |
| 3.8 | S3 검증 | `S3/08_validation.md` | `not_started` | REVIEW_LOOP 전체 통과 |

### S4 — Detail Pages (Wave 3 세션 B → Wave 4 세션 A)
| # | 태스크 | 지침 문서 | 상태 | 검증 | Wave |
|---|--------|----------|------|------|------|
| 4.1 | 식당 상세 L1~L8 | `S4/01_restaurant_detail.md` | `not_started` | 레이어 렌더링 확인 | **3B** |
| 4.2 | 와인 상세 L1~L8 | `S4/02_wine_detail.md` | `not_started` | 레이어 렌더링 확인 | **3B** |
| 4.3 | 기록 상세 페이지 | `S4/03_record_detail.md` | `not_started` | 기록 조회 + 수정/삭제 | **3B** |
| 4.4 | 찜(Wishlist) CRUD | `S4/04_wishlist.md` | `not_started` | 찜 추가/삭제 + 상세 하트 버튼 동작 | **3B** |
| 4.5 | 상세↔기록 플로우 연결 | `S4/05_detail_flow.md` | `not_started` | 상세→기록→상세 순환 | **4A** (S3 대기) |
| 4.6 | S4 검증 | `S4/06_validation.md` | `not_started` | REVIEW_LOOP 전체 통과 | **4A** |

### S5 — Home & Recommendation (Wave 4, 세션 A — S4 완료 후)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 5.1 | 앱 헤더 + FAB 공통 컴포넌트 | `S5/01_app_shell.md` | `not_started` | 헤더(glassmorphism) + FAB(+/←) |
| 5.2 | 홈 레이아웃 + 탭 구조 | `S5/02_home_layout.md` | `not_started` | 식당/와인 탭 전환 |
| 5.3 | 뷰 모드 (상세/리스트/캘린더/지도) | `S5/03_view_modes.md` | `not_started` | 4종 뷰 전환 |
| 5.4 | 필터 + 소팅 + 홈 검색 | `S5/04_filter_sort.md` | `not_started` | 노션 스타일 필터 + 검색 동작 |
| 5.5 | 통계 패널 | `S5/05_stats_panel.md` | `not_started` | 패널 토글 + 차트 렌더링 |
| 5.6 | AI 인사 + 넛지 스트립 | `S5/06_nudge.md` | `not_started` | AI 인사(5초 소멸) + 넛지 조건별 표시 |
| 5.7 | 추천 알고리즘 (7종) | `S5/07_recommendation.md` | `not_started` | 추천 카드 표시 |
| 5.8 | Discover 서브스크린 | `S5/08_discover.md` | `not_started` | 홈 내 서브스크린 탐색 동작 |
| 5.9 | S5 검증 | `S5/09_validation.md` | `not_started` | REVIEW_LOOP 전체 통과 |

### S6 — XP, Profile & Settings (Wave 3, 세션 C)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 6.1 | XP 계산 엔진 + 활성 XP 크론 | `S6/01_xp_engine.md` | `not_started` | XP 적립/레벨업 + 활성 XP 일일 갱신 |
| 6.2 | 프로필 페이지 (통계 + 맛 정체성) | `S6/02_profile.md` | `not_started` | 프로필 렌더링 |
| 6.3 | 설정 페이지 | `S6/03_settings.md` | `not_started` | 설정 변경 저장 |
| 6.4 | 알림 시스템 (인라인 드롭다운) | `S6/04_notifications.md` | `not_started` | 알림 표시 + 읽음 처리 |
| 6.5 | S6 검증 | `S6/05_validation.md` | `not_started` | REVIEW_LOOP 전체 통과 |

### S7 — Bubble System (Wave 4, 세션 B — S6 완료 후)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 7.1 | 버블 domain + infrastructure | `S7/01_bubble_domain.md` | `not_started` | 타입 + CRUD |
| 7.2 | 버블 생성/가입/초대 | `S7/02_bubble_create.md` | `not_started` | 생성→초대→가입 플로우 |
| 7.3 | 버블 상세 (피드/랭킹/멤버) | `S7/03_bubble_detail.md` | `not_started` | 탭 전환 + 뷰모드 |
| 7.4 | 댓글 + 리액션 | `S7/04_comments_reactions.md` | `not_started` | 댓글/리액션 CRUD |
| 7.5 | 버블 역할/권한 | `S7/05_roles.md` | `not_started` | 권한별 동작 확인 |
| 7.6 | 버블 랭킹 스냅샷 크론 | `S7/06_ranking_cron.md` | `not_started` | 주간 스냅샷 생성 + 등락 표시 |
| 7.7 | S7 검증 | `S7/07_validation.md` | `not_started` | REVIEW_LOOP 전체 통과 |

### S8 — Social Integration & Follow (Wave 5)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 8.1 | 팔로우/맞팔로우 시스템 | `S8/01_follow.md` | `not_started` | 팔로우→맞팔 플로우 |
| 8.2 | 상세 페이지 L9 (버블 멤버 기록) | `S8/02_detail_l9.md` | `not_started` | L9 렌더링 |
| 8.3 | 홈 팔로잉/추천 서브탭 | `S8/03_home_social.md` | `not_started` | 서브탭 + 피드 |
| 8.4 | 기록→버블 공유 | `S8/04_share.md` | `not_started` | 공유 플로우 |
| 8.5 | 버블러 프로필 | `S8/05_bubbler_profile.md` | `not_started` | 타인 프로필 조회 |
| 8.6 | S8 검증 | `S8/06_validation.md` | `not_started` | REVIEW_LOOP 전체 통과 |

### S9 — Onboarding & Polish (Wave 6)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 9.1 | 온보딩 풀 플로우 | `S9/01_onboarding.md` | `not_started` | 로그인→홈 완주 |
| 9.2 | 넛지 시스템 정교화 | `S9/02_nudge_polish.md` | `not_started` | 조건별 넛지 동작 |
| 9.3 | 전체 플로우 검증 | `S9/03_full_flow_test.md` | `not_started` | E2E 시나리오 통과 |
| 9.4 | 빌드 + 성능 최적화 | `S9/04_build_optimize.md` | `not_started` | `pnpm build` 성공 + LCP <3s |
| 9.5 | S9 최종 검증 | `S9/05_final_validation.md` | `not_started` | 전체 REVIEW_LOOP 통과 |

---

## 유동 실행 규칙

### 세션 배정 원칙

```
1. 현재 웨이브에서 의존성이 해소된 작업을 모두 확인한다
2. 해소된 작업이 N개 → 최대 N개 세션 병렬 가동
3. 해소된 작업이 1개 → 1개 세션만 가동
4. 해소된 작업이 0개 → 다른 세션의 선행 완료 대기
```

### 조기 전환 규칙

```
세션이 현재 작업 완료 → 다음 중 첫 번째 해당 항목 실행:

1. 같은 웨이브 내 미완료 작업이 있으면 → 계속
2. 다음 웨이브 작업의 선행 조건이 충족됐으면 → 즉시 착수 (웨이브 경계 무시)
3. 아무것도 해소 안 됐으면 → 세션 종료
```

**예시**: Wave 3에서 S6(세션 C)이 S3, S4보다 먼저 끝나면:
- S7의 선행(S1+S6)이 충족됨 → 세션 C가 바로 S7 착수 (Wave 4 조기 시작)

### 병렬 세션 간 충돌 방지

- 각 세션은 **서로 다른 스프린트**를 담당 (같은 스프린트를 두 세션이 나눠 작업하지 않음)
- 공유 파일(`shared/di/container.ts` 등)은 해당 스프린트의 domain 엔티티를 추가하는 방식이므로 충돌 최소화
- 머지 충돌 발생 시: 나중에 머지하는 세션이 해결

---

## 블로커 & 이슈

| # | 웨이브 | 설명 | 상태 | 해결 방법 |
|---|--------|------|------|----------|
| - | - | (아직 없음) | - | - |

---

## 갱신 규칙

- 태스크 시작 시: 상태를 `in_progress`로 변경, CURRENT_SPRINT.md 갱신
- 태스크 완료 시: 상태를 `done`으로 변경, 검증 결과 기록
- 블로커 발생 시: 상태를 `blocked`로 변경, 블로커 테이블에 기록
- 웨이브 완료 시: 웨이브 진행 현황 갱신, 다음 웨이브 세션 배정 결정
- **조기 전환 시**: 해당 세션이 다음 웨이브 작업을 시작하면 CURRENT_SPRINT에 기록
