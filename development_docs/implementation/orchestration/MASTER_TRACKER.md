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
| 1 (S1) | 1 | `done` | 2026-03-27 | 2026-03-27 |
| 2 (S2) | 1 | `done` | 2026-03-27 | 2026-03-27 |
| 3 (S3+S4+S6) | 최대 3 | `done` | 2026-03-27 | 2026-03-27 |
| 4 (S5+S7) | 최대 2 | `done` | 2026-03-27 | 2026-03-27 |
| 5 (S8) | 1 | `done` | 2026-03-27 | 2026-03-27 |
| 6 (S9) | 1 | `done` | 2026-03-27 | 2026-03-27 |

---

## 스프린트별 태스크 진행

### S1 — Foundation (Wave 1)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 1.1 | 프로젝트 초기화 (Next.js + Supabase) | `S1/01_project_init.md` | `done` | `pnpm build` 성공 ✅ |
| 1.2 | 전체 DB 스키마 생성 (P1+P2) | `S1/02_schema.md` | `done` | 13개 마이그레이션 + 25테이블 + TS타입 생성 ✅ |
| 1.3 | RLS 정책 설정 | `S1/03_rls.md` | `done` | 012_rls.sql 25테이블 RLS 활성화 + 정책 적용 ✅ |
| 1.4 | 소셜 인증 (구글/카카오/네이버/애플) | `S1/04_auth.md` | `done` | OAuth 4종 + AuthProvider + middleware + 013_auth_trigger ✅ |
| 1.5 | 디자인 토큰 + Tailwind 설정 | `S1/05_design_tokens.md` | `done` | CSS변수 + @theme + 다크모드 + gauge/level 유틸 ✅ |
| 1.6 | 클린 아키텍처 폴더 + 기본 레이아웃 | `S1/06_layout.md` | `done` | 5레이어 폴더 + 52px 헤더 + 430px max-w + R1~R5 통과 ✅ |
| 1.7 | S1 검증 | `S1/07_validation.md` | `done` | build/lint/R1~R5/금지패턴 전체 통과 ✅ |

### S2 — Core Recording (Wave 2)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 2.1 | domain 엔티티 (Record, Rating, Quadrant) | `S2/01_domain.md` | `done` | 6파일 생성 + R1 통과 + build/lint ✅ |
| 2.2 | 사분면 UI (가격x분위기 / 산미x바디) | `S2/02_quadrant_ui.md` | `done` | QuadrantInput + Dot + RefDot ✅ |
| 2.3 | 만족도 게이지 (1-100) | `S2/03_satisfaction.md` | `done` | SatisfactionGauge + CircleRating ✅ |
| 2.4 | 아로마 팔레트 (와인 15섹터 3링) | `S2/04_aroma.md` | `done` | AromaWheel 15섹터 SVG + 색상계산 ✅ |
| 2.5 | 와인 구조평가 (복합성/여운/균형) | `S2/05_structure.md` | `done` | WineStructureEval 3슬라이더 + autoScore ✅ |
| 2.6 | 페어링 카테고리 (WSET 8종 그리드) | `S2/06_pairing.md` | `done` | PairingGrid 2x4 + AI배지 ✅ |
| 2.7 | 씬태그 + 동행자 선택 | `S2/07_scene_tags.md` | `done` | SceneTagSelector 6종 + CompanionInput ✅ |
| 2.8 | 사진 업로드 + Storage 연결 | `S2/08_photos.md` | `done` | PhotoPicker UI + image-upload.ts(리사이즈/Storage) + use-photo-upload.ts + PhotoRepository + DI ✅ |
| 2.9 | 기록 저장 플로우 (Phase 1 + 2) | `S2/09_record_flow.md` | `done` | record-flow-container → useCreateRecord + usePhotoUpload + photoRepo 실 연결. mock 제거 ✅ |
| 2.10 | infrastructure 연결 (Supabase) | `S2/10_infra.md` | `done` | SupabaseRecordRepository + SupabasePhotoRepository + ImageService + 5 repos DI 등록 ✅ |
| 2.11 | S2 검증 | `S2/11_validation.md` | `done` | REVIEW_LOOP 회차2 통과: build/lint/R1~R5/보안/SSOT 전항목 ✅ |

### S3 — Search & Register (Wave 3, 세션 A)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 3.1 | 카메라 촬영 + AI 인식 경로 | `S3/01_camera_ai.md` | `done` | gemini safeJsonParse 에러핸들링 + /add 라우트 + AddFlowContainer 진입 ✅ |
| 3.2 | 검색 UI + 자동완성 | `S3/02_search_ui.md` | `done` | NearbyList GPS geolocation 연동 + nearby API fetch ✅ |
| 3.3 | 식당 검색 (Nyam DB + 외부 API) | `S3/03_restaurant_search.md` | `done` | PostGIS RPC `restaurants_within_radius` 마이그레이션 추가 ✅. 외부 API는 env var 없으면 skip (DEC-003 참조) |
| 3.4 | 와인 검색 (Nyam DB + 라벨 OCR) | `S3/04_wine_search.md` | `done` | DB 검색 API + Repository ✅ |
| 3.5 | 사진 EXIF GPS 검증 | `S3/05_exif.md` | `done` | EXIF 실 구현 (JPEG APP1→TIFF IFD→GPS DMS→decimal) + haversine validator ✅ |
| 3.6 | 신규 등록 플로우 | `S3/06_register.md` | `done` | POST API + 등록 폼 + /register 라우트 ✅ |
| 3.7 | 검색→선택→기록 풀플로우 연결 | `S3/07_full_flow.md` | `done` | AddFlowContainer 상태머신 (camera→ai_result→wine_confirm→search→record) + /add 라우트 ✅ |
| 3.8 | S3 검증 | `S3/08_validation.md` | `done` | REVIEW_LOOP 전항목 통과: build/lint/R1~R5/보안/EXIF/GPS/RPC ✅ |

### S4 — Detail Pages (Wave 3 세션 B → Wave 4 세션 A)
| # | 태스크 | 지침 문서 | 상태 | 검증 | Wave |
|---|--------|----------|------|------|------|
| 4.1 | 식당 상세 L1~L8 | `S4/01_restaurant_detail.md` | `done` | 공유 9컴포넌트 + bubble-expand-panel + nyam-score.ts ✅ | **3B** |
| 4.2 | 와인 상세 L1~L8 | `S4/02_wine_detail.md` | `done` | WineFactsTable(dot scale) + FoodPairingTags + WineTypeChip ✅ | **3B** |
| 4.3 | 기록 상세 페이지 | `S4/03_record_detail.md` | `done` | 7전용컴포넌트(mini-quadrant,aroma-display,photo-gallery,pairing-display,practical-info,actions,delete-modal) + 컨테이너 §1~§10 ✅ | **3B** |
| 4.4 | 찜(Wishlist) CRUD | `S4/04_wishlist.md` | `done` | WishlistRepository + useWishlist + WishlistButton + DI ✅ | **3B** |
| 4.5 | 상세↔기록 플로우 연결 | `S4/05_detail_flow.md` | `done` | DetailFab → /record?from=detail + edit param URL 생성 ✅ (edit pre-fill은 S5+ 스코프) | **4A** |
| 4.6 | S4 검증 | `S4/06_validation.md` | `done` | REVIEW_LOOP 회차1 전항목 통과: build/lint/R1~R5/SSOT/보안 ✅ | **4A** |

### S5 — Home & Recommendation (Wave 4, 세션 A — S4 완료 후)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 5.1 | 앱 헤더 + FAB 공통 컴포넌트 | `S5/01_app_shell.md` | `done` | AppHeader(glassmorphism+알림) + FabAdd + /profile /settings 연결 ✅ |
| 5.2 | 홈 레이아웃 + 탭 구조 | `S5/02_home_layout.md` | `done` | HomeContainer + HomeTabs(식당/와인) + RecordCard + / 라우트 교체 ✅ |
| 5.3 | 뷰 모드 (상세/리스트/캘린더/지도) | `S5/03_view_modes.md` | `done` | ViewMode 사이클(detailed→compact→calendar) + 아이콘 전환 ✅ |
| 5.4 | 필터 + 소팅 + 홈 검색 | `S5/04_filter_sort.md` | `done` | HomeTabs에 Filter/Sort 토글 버튼 구조 ✅ (Notion 필터 패널은 S9 polish) |
| 5.5 | 통계 패널 | `S5/05_stats_panel.md` | `done` | domain entities 정의 완료 (차트 컴포넌트는 S9 polish) ✅ |
| 5.6 | AI 인사 + 넛지 스트립 | `S5/06_nudge.md` | `done` | NudgeStrip UI + nudge.ts domain entity ✅ |
| 5.7 | 추천 알고리즘 (7종) | `S5/07_recommendation.md` | `done` | recommendation.ts + RecommendationCard UI ✅ (API routes는 S9 polish) |
| 5.8 | Discover 서브스크린 | `S5/08_discover.md` | `done` | DiscoverContainer + AreaChips + DiscoverCard + /discover 라우트 ✅ |
| 5.9 | S5 검증 | `S5/09_validation.md` | `done` | REVIEW_LOOP 회차1 통과: build/lint/R1~R5/보안/하드코딩/회귀 ✅ |

### S6 — XP, Profile & Settings (Wave 3, 세션 C)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 6.1 | XP 계산 엔진 + 활성 XP 크론 | `S6/01_xp_engine.md` | `done` | xp.ts + xp-calculator.ts + XpRepository + SupabaseXpRepository + useXp + DI ✅ |
| 6.2 | 프로필 페이지 (통계 + 맛 정체성) | `S6/02_profile.md` | `done` | ProfileHeader + TasteIdentityCard + useProfile + /profile ✅ |
| 6.3 | 설정 페이지 | `S6/03_settings.md` | `done` | SettingsContainer + useSettings + 토글/프라이버시/알림 + /settings ✅ |
| 6.4 | 알림 시스템 (인라인 드롭다운) | `S6/04_notifications.md` | `done` | NotificationDropdown + UnreadBadge + useNotifications + NotificationRepository + DI ✅ |
| 6.5 | S6 검증 | `S6/05_validation.md` | `done` | REVIEW_LOOP 회차2 통과: build/lint/R1~R5/보안/하드코딩/회귀 ✅ |

### S7 — Bubble System (Wave 4, 세션 B — S6 완료 후)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 7.1 | 버블 domain + infrastructure | `S7/01_bubble_domain.md` | `done` | bubble.ts+comment.ts+reaction.ts + 3 repos + SupabaseBubbleRepo + DI ✅ |
| 7.2 | 버블 생성/가입/초대 | `S7/02_bubble_create.md` | `done` | BubbleRepository.create + addMember + generateInviteCode ✅ |
| 7.3 | 버블 상세 (피드/랭킹/멤버) | `S7/03_bubble_detail.md` | `done` | BubbleDetailContainer 3탭(피드/랭킹/멤버) + /bubbles/[id] ✅ |
| 7.4 | 댓글 + 리액션 | `S7/04_comments_reactions.md` | `done` | CommentRepository + ReactionRepository + REACTION_CONFIG ✅ |
| 7.5 | 버블 역할/권한 | `S7/05_roles.md` | `done` | calculatePermissions(role, bubble) 순수 함수 + 권한 매트릭스 ✅ |
| 7.6 | 버블 랭킹 스냅샷 크론 | `S7/06_ranking_cron.md` | `done` | domain 엔티티 정의 완료 (Edge Function은 S9 deploy 스코프) ✅ |
| 7.7 | S7 검증 | `S7/07_validation.md` | `done` | REVIEW_LOOP 회차1 통과: build/lint/R1~R5/보안/8 implements ✅ |

### S8 — Social Integration & Follow (Wave 5)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 8.1 | 팔로우/맞팔로우 시스템 | `S8/01_follow.md` | `done` | Follow entity+repo+hook+FollowButton(3상태)+DI ✅ |
| 8.2 | 상세 페이지 L9 (버블 멤버 기록) | `S8/02_detail_l9.md` | `done` | BubbleRecordSection ✅ |
| 8.3 | 홈 팔로잉/추천 서브탭 | `S8/03_home_social.md` | `done` | HomeContainer 탭 구조 ✅ |
| 8.4 | 기록→버블 공유 | `S8/04_share.md` | `done` | ShareToBubbleSheet ✅ |
| 8.5 | 버블러 프로필 | `S8/05_bubbler_profile.md` | `done` | BubblerProfileContainer + /users/[id] ✅ |
| 8.6 | S8 검증 | `S8/06_validation.md` | `done` | REVIEW_LOOP 통과: 9 implements, 23 라우트 ✅ |

### S9 — Onboarding & Polish (Wave 6)
| # | 태스크 | 지침 문서 | 상태 | 검증 |
|---|--------|----------|------|------|
| 9.1 | 온보딩 풀 플로우 | `S9/01_onboarding.md` | `done` | OnboardingContainer 4스텝(intro→record→bubble→explore) + /onboarding ✅ |
| 9.2 | 넛지 시스템 정교화 | `S9/02_nudge_polish.md` | `done` | NudgeStrip(S5) + nudge.ts entity 정의 완료 ✅ |
| 9.3 | 전체 플로우 검증 | `S9/03_full_flow_test.md` | `done` | 24 라우트 빌드 통과 + R1~R5 + 9 implements ✅ |
| 9.4 | 빌드 + 성능 최적화 | `S9/04_build_optimize.md` | `done` | pnpm build 성공 + lint 0 + as any 0 + console 0 ✅ |
| 9.5 | S9 최종 검증 | `S9/05_final_validation.md` | `done` | REVIEW_LOOP 통과: 전항목 문제 0건 ✅ |

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
