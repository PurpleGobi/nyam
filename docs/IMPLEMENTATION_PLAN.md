# Nyam — Parallel Implementation Plan

> 버전: 1.1.0 | 최종 업데이트: 2026-03-17
> 관련 문서: [PRD.md](./PRD.md) · [TECH_SPEC.md](./TECH_SPEC.md) · [DESIGN_SPEC.md](./DESIGN_SPEC.md)

---

## 1. 현재 상태

| 항목 | 상태 |
|------|------|
| SSOT 문서 (PRD, TECH_SPEC, DESIGN_SPEC) | 완료 |
| DB 스키마 (supabase/migrations 001-011) | 완료 |
| 프로젝트 설정 (package.json, tsconfig, next.config 등) | 완료 |
| CLAUDE.md (아키텍처 규칙) | 완료 |
| Supabase DB (리모트 17개 마이그레이션) | 완료 |
| **S0 Foundation** | **완료** — Supabase 클라이언트, 상수, 레이아웃, shadcn/ui |
| **S1 Auth** | **완료** — OAuth, proxy 가드, 로그인 UI, 약관 |
| **S2 Record** | **완료** — 3유형 기록 CRUD + AI 파이프라인 |
| **S3 Home** | **완료** — 5개 홈 섹션 + 지도 핀 시각화 |
| **S4 Social** | **완료** — 버블 CRUD + 초대 + 리액션 + 북마크 |
| **S5 Discovery** | **완료** — 검색/필터 + AI 추천 UI |
| **S6 Advanced** | **완료** — 비교 게임/궁합/Wrapped/프로필/알림/계정삭제 |
| `pnpm build` | 통과 |
| `pnpm lint` | 0 error, 0 warning |
| 총 파일 수 | 187개 (~12,000줄) |
| 최신 커밋 | `ba6f2e0` on `main` |

---

## 2. 아키텍처 규칙 (CLAUDE.md 요약)

```
개발 순서: entities → repositories → hooks → components → containers → pages → infrastructure
의존 방향: app → presentation → application → domain ← infrastructure
```

모든 스트림이 이 순서를 따른다. domain 계층은 스트림 간 공유되므로 **Foundation에서 먼저 완성**한다.

---

## 3. 병렬 스트림 구조

```
시간축 →

S0 Foundation ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
                      │
                      ├─→ S1 Auth       ██████░░░░░░░░░░░░░░░░░░░░░░░░░░
                      │                       │
                      ├─→ S2 Record     ░░░░░░████████████░░░░░░░░░░░░░░░░
                      │                                   │
                      ├─→ S3 Home       ░░░░░░░░░░████████████░░░░░░░░░░░░
                      │                                   │
                      ├─→ S4 Social     ░░░░░░░░░░░░░░████████████░░░░░░░░
                      │                                           │
                      ├─→ S5 Discovery  ░░░░░░░░░░░░░░░░░░████████████░░░░
                      │                                           │
                      └─→ S6 Advanced   ░░░░░░░░░░░░░░░░░░░░░░░░░░████████

의존 관계:
  S0 → S1 (Auth는 Foundation 완료 후)
  S0 → S2 (Record는 Foundation 완료 후)
  S1 + S2 → S3 (Home은 Auth + Record 엔티티 필요)
  S1 + S2 → S4 (Social은 Auth + Record 엔티티 필요)
  S2 + S4 → S5 (Discovery는 Record + Social 기반)
  S2 + S3 + S4 → S6 (Advanced는 대부분 기능 완료 후)

병렬 가능:
  S1 ∥ S2 (Auth와 Record domain 계층은 독립)
  S3 ∥ S4 (Home과 Social은 독립)
  S5는 S3/S4 진행 중에도 domain/application 계층 선행 가능
```

---

## 4. 스트림별 상세 계획

### S0. Foundation (모든 스트림의 선행 조건)

> 목표: 앱 골격 + 공유 인프라 + 전역 레이아웃

#### S0-1. Supabase 클라이언트

| 파일 | 역할 | TECH_SPEC 참조 |
|------|------|---------------|
| `src/infrastructure/supabase/client.ts` | 브라우저 클라이언트 (createBrowserClient) | 7-1 |
| `src/infrastructure/supabase/server.ts` | 서버 클라이언트 (createServerClient, cookies) | 7-1 |
| `src/infrastructure/supabase/admin.ts` | service_role 클라이언트 (AI 파이프라인용) | 7-1 |
| `src/infrastructure/supabase/types.ts` | DB 스키마 타입 (supabase gen types) | 3-0~3-6 |

#### S0-2. 공유 상수 (SSOT)

| 파일 | 내용 | TECH_SPEC 참조 |
|------|------|---------------|
| `src/shared/constants/categories.ts` | FOOD_CATEGORIES, COOKING_GENRES, WINE_TYPES | 5-1 |
| `src/shared/constants/tags.ts` | FLAVOR_TAGS, TEXTURE_TAGS, ATMOSPHERE_TAGS | 5-1 |
| `src/shared/constants/scenes.ts` | RESTAURANT_SCENES, WINE_SCENES, COOKING_SCENES | 5-1 |
| `src/shared/constants/routes.ts` | 라우트 경로 상수 | — |
| `src/shared/utils/cn.ts` | clsx + tailwind-merge | — |

#### S0-3. 전역 레이아웃

| 파일 | 역할 | DESIGN_SPEC 참조 |
|------|------|-----------------|
| `src/app/layout.tsx` | RootLayout — 폰트, Provider, AppShell | 3-1 |
| `src/app/globals.css` | Tailwind 4 + CSS 변수 (컬러, 그림자) | 2-1~2-6 |
| `src/presentation/components/layout/app-shell.tsx` | Header + Main + BottomNav 구조 | 3-1 |
| `src/presentation/components/layout/bottom-nav.tsx` | 5탭 내비 + FAB | 3-1, 3-2 |
| `src/presentation/components/layout/logo-link.tsx` | nyam 로고 (Comfortaa Bold) | 3-1 |
| `src/presentation/components/layout/header-actions.tsx` | 검색 + 알림 아이콘 | 3-1 |

#### S0-4. shadcn/ui 기본 컴포넌트

필요 시 `pnpm dlx shadcn@latest add` 로 추가. 초기 필수:

```
button, input, label, dialog, sheet, separator, tabs, badge,
scroll-area, select, checkbox, slider, card
```

#### S0-5. 공유 UI 컴포넌트

| 컴포넌트 | 역할 | DESIGN_SPEC 참조 |
|----------|------|-----------------|
| `empty-state.tsx` | 빈 상태 (아이콘 + 메시지 + CTA) | 6-2 |
| `section-header.tsx` | 섹션 제목 + 부제 | — |
| `search-bar.tsx` | 검색 입력 (돋보기 아이콘) | 4-7 |

#### 완료 기준

- [x] `pnpm dev` 실행 시 빈 홈 화면 + 하단 내비 + 헤더 표시
- [x] 각 탭 라우트(`/`, `/discover`, `/record`, `/groups`, `/profile`) 진입 가능
- [x] Supabase 연결 확인 (클라이언트 생성 성공)

---

### S1. Auth (인증)

> 목표: 로그인 → 세션 → 보호 라우트 → 프로필 기본

**선행**: S0 완료

#### Domain

| 파일 | 내용 |
|------|------|
| `domain/entities/user.ts` | User, UserStats 타입 |
| `domain/repositories/user-repository.ts` | UserRepository 인터페이스 |

#### Infrastructure

| 파일 | 내용 | TECH_SPEC 참조 |
|------|------|---------------|
| `infrastructure/repositories/supabase-user-repository.ts` | UserRepository 구현 | 3-1 |
| `src/app/auth/callback/route.ts` | OAuth 콜백 (Google, Kakao) | 7-1 |
| `src/app/auth/naver/callback/route.ts` | 네이버 커스텀 OAuth | 7-1 |
| `src/proxy.ts` (middleware) | 인증 가드 + 비활성 계정 처리 | 7-1 |

#### Application

| 파일 | 내용 |
|------|------|
| `application/hooks/use-auth.ts` | signIn, signOut, session, user |

#### Presentation

| 파일 | 내용 | DESIGN_SPEC 참조 |
|------|------|-----------------|
| `components/auth/login-buttons.tsx` | 4개 소셜 로그인 버튼 | 5-15 |
| `components/auth/terms-agreement.tsx` | 약관 동의 체크박스 | 5-15 |
| `containers/login-container.tsx` | 로그인 페이지 조합 | 5-15 |

#### Pages

| 파일 | 내용 |
|------|------|
| `app/auth/login/page.tsx` | LoginContainer 렌더링 |
| `app/terms/service/page.tsx` | 이용약관 |
| `app/terms/privacy/page.tsx` | 개인정보처리방침 |

#### 완료 기준

- [x] Google/Kakao/Apple 로그인 UI 구현 (Naver는 플레이스홀더)
- [ ] 로그인 시 users + user_stats + taste_dna_* 자동 생성 (DB 트리거) — 실제 OAuth 검증 필요
- [x] 미인증 시 `/auth/login` 리다이렉트
- [x] 이미 로그인 시 `/` 리다이렉트

---

### S2. Record (기록 — 핵심 기능)

> 목표: Phase 1 기록 생성 + AI 분석 파이프라인 + 기록 상세/수정

**선행**: S0 완료
**병렬 가능**: S1과 동시 진행 (domain 계층 독립)

#### S2-A. Domain 계층 (S1과 병렬)

| 파일 | 내용 |
|------|------|
| `domain/entities/restaurant.ts` | Restaurant, RestaurantStats 타입 |
| `domain/entities/record.ts` | Record, RecordPhoto, RecordTasteProfile, RecordAiAnalysis 타입 |
| `domain/repositories/record-repository.ts` | RecordRepository 인터페이스 (CRUD + 필터) |
| `domain/repositories/restaurant-repository.ts` | RestaurantRepository 인터페이스 |

#### S2-B. Infrastructure 계층

| 파일 | 내용 | TECH_SPEC 참조 |
|------|------|---------------|
| `infrastructure/repositories/supabase-record-repository.ts` | RecordRepository 구현 | 3-2 |
| `infrastructure/repositories/supabase-restaurant-repository.ts` | RestaurantRepository 구현 | 3-2 |
| `infrastructure/api/kakao-local.ts` | 카카오 장소 검색 클라이언트 | 4-1b, 4-1c |
| `infrastructure/storage/image-upload.ts` | Supabase Storage 업로드 + 리사이즈 | 6 |
| `di/repositories.ts` | DI 팩토리 함수 | 2-2 |

#### S2-C. API Routes (AI 파이프라인)

| 파일 | 역할 | TECH_SPEC 참조 |
|------|------|---------------|
| `app/api/restaurants/nearby/route.ts` | 카카오 카테고리 검색 (GPS → 주변 식당) | 4-1b |
| `app/api/restaurants/search/route.ts` | 카카오 키워드 검색 | 4-1c |
| `app/api/analyze-visit/route.ts` | 사진 AI 분석 (Gemini) — 기록 **전** | 4-0 |
| `app/api/records/enrich/route.ts` | 식당·메뉴 특정 — 기록 **후** 비동기 Step 1 | 4-1 Step 1 |
| `app/api/records/taste-profile/route.ts` | 맛 프로필 산출 — Step 2 (식당: 웹 리뷰 교차, 와인: WSET) | 4-1 Step 2 |
| `app/api/records/post-process/route.ts` | DNA 반영 — Step 3 (Taste DNA + Style DNA 업데이트) | 4-1 Step 3 |

#### S2-D. Application Hooks

| 파일 | 내용 |
|------|------|
| `application/hooks/use-create-record.ts` | 기록 생성 (사진 업로드 → 저장 → 비동기 파이프라인 트리거) |
| `application/hooks/use-record-detail.ts` | 기록 상세 조회 (+ AI 분석 결과) |
| `application/hooks/use-edit-record.ts` | 기록 수정 |
| `application/hooks/use-restaurant-search.ts` | 카카오 키워드 검색 (debounce) |
| `application/hooks/use-nearby-restaurants.ts` | GPS → 주변 식당 (SWR) |
| `application/hooks/use-geolocation.ts` | 브라우저 Geolocation |

#### S2-E. Presentation

| 컴포넌트 | 역할 | DESIGN_SPEC 참조 |
|----------|------|-----------------|
| `components/capture/photo-capture-sheet.tsx` | 사진 촬영/선택 (label + hidden input) | 4-6 |
| `components/capture/rating-scales.tsx` | 100점 슬라이더 (유형별 항목 자동 전환) | 4-3 |
| `components/capture/ai-result-card.tsx` | AI 분석 결과 카드 (식당명/장르/메뉴 추정) | 5-2 |
| `components/capture/nearby-restaurant-picker.tsx` | 주변 식당 선택 리스트 | 5-2 |
| `components/capture/quick-rating.tsx` | Phase 1 종합 평가 UI | 5-2 |
| `components/record/record-card.tsx` | 기록 카드 (리스트 아이템) | 4-2 |
| `components/record/photo-picker.tsx` | 사진 그리드 미리보기 + 삭제 | 4-6 |
| `components/record/category-tag.tsx` | 장르/태그 칩 | — |
| `components/record/rating-bars.tsx` | 읽기 전용 세부 평가 바 | 5-3 |
| `components/record/record-type-selector.tsx` | 식당/와인/요리 3탭 | 5-2 |
| `containers/quick-capture-container.tsx` | 기록 생성 페이지 조합 | 5-2 |
| `containers/record-detail-container.tsx` | 기록 상세 페이지 조합 | 5-3 |
| `containers/record-edit-container.tsx` | 기록 수정 페이지 조합 | 5-4 |

#### Pages

| 파일 | 내용 |
|------|------|
| `app/record/page.tsx` | QuickCaptureContainer |
| `app/records/[id]/page.tsx` | RecordDetailContainer |
| `app/records/[id]/edit/page.tsx` | RecordEditContainer |

#### 완료 기준

- [x] 식당/와인/요리 3유형 기록 생성 (사진 + 평가 + 저장)
- [x] 카카오 API 기반 주변 식당 매칭
- [x] AI 사진 분석 (Gemini) → 결과 카드 표시
- [x] 저장 후 비동기 파이프라인 (enrich → taste-profile → post-process)
- [x] 기록 상세/수정 페이지

---

### S3. Home (홈 대시보드)

> 목표: 5개 홈 섹션 구현

**선행**: S1 (인증) + S2-A (Record 엔티티)

#### Application Hooks

| 파일 | 내용 | PRD 참조 |
|------|------|---------|
| `application/hooks/use-profile.ts` | 프로필 + 통계 + DNA 조회 | 8-2-2 |
| `application/hooks/use-taste-dna.ts` | Food/Wine Taste DNA 데이터 | 8-2-3 |
| `application/hooks/use-style-dna.ts` | Style DNA (genre/area/scene) | 8-2-3 |
| `application/hooks/use-calendar-records.ts` | 월별 캘린더 기록 | 8-2-4 |
| `application/hooks/use-records-for-map.ts` | 지도용 기록 (내 기록 + 버블 멤버) | 8-2-6 |
| `application/hooks/use-todays-pick.ts` | Today's Pick 추천 | 8-2-1 |
| `application/hooks/use-friends-feed.ts` | 버블 멤버 최근 기록 | 8-2-7 |

#### Presentation

| 컴포넌트 | 역할 | DESIGN_SPEC 참조 |
|----------|------|-----------------|
| `components/home/todays-pick-card.tsx` | Today's Pick (사진 + 추천 이유) | 5-1 #1 |
| `components/home/home-profile-card.tsx` | 프로필 + Taste DNA + Style DNA | 5-1 #2 |
| `components/profile/taste-dna-radar.tsx` | 레이더 차트 (SVG, Food 6축 / Wine 7축) | 4-4 |
| `components/home/photo-calendar.tsx` | 포토 캘린더 (7열 그리드) | 5-1 #3 |
| `components/home/calendar-day-popup.tsx` | 날짜 탭 팝업 (2건+) | 5-1 #3 |
| `components/home/home-map-section.tsx` | 네이버/카카오 지도 토글 + 핀 | 5-1 #4 |
| `components/home/friends-feed-card.tsx` | 친구 피드 리스트 | 5-1 #5 |
| `containers/home-container.tsx` | 홈 5개 섹션 조합 | 5-1 |

#### Pages

| 파일 | 내용 |
|------|------|
| `app/page.tsx` | HomeContainer |

#### 완료 기준

- [x] Today's Pick 카드 (콜드 스타트 시 온보딩 카드)
- [x] 프로필 카드 + Taste DNA 레이더 차트 (Food/Wine 탭)
- [x] 포토 캘린더 (사진 썸네일 + 월 이동 + 통계)
- [x] 지도 섹션 (핀 시각화 + 기록 썸네일 — 실제 지도 SDK 연동은 미완)
- [x] 친구 피드 (버블 멤버 기록)

---

### S4. Social (버블 네트워킹)

> 목표: 버블 CRUD + 초대 + 멤버 관리 + 기록 공유 + 리액션

**선행**: S1 (인증) + S2-A (Record 엔티티)
**병렬 가능**: S3과 동시 진행

#### Domain

| 파일 | 내용 |
|------|------|
| `domain/entities/group.ts` | Group, GroupMembership, GroupStats 타입 |
| `domain/entities/reaction.ts` | Reaction 타입 |
| `domain/repositories/group-repository.ts` | GroupRepository 인터페이스 |

#### Infrastructure

| 파일 | 내용 |
|------|------|
| `infrastructure/repositories/supabase-group-repository.ts` | GroupRepository 구현 |

#### API Routes

| 파일 | 역할 | TECH_SPEC 참조 |
|------|------|---------------|
| `app/api/groups/invite/route.ts` | 초대 링크 생성 | 4-4 |

#### Application Hooks

| 파일 | 내용 | PRD 참조 |
|------|------|---------|
| `application/hooks/use-groups.ts` | 내 버블 목록 | 8-10-1 |
| `application/hooks/use-public-groups.ts` | 공개 버블 탐색 | 8-10-2 |
| `application/hooks/use-group-detail.ts` | 버블 상세 (정보 + 멤버 + 피드) | 8-11 |
| `application/hooks/use-group-actions.ts` | 생성, 가입, 탈퇴, 초대 | 8-10-3, 8-10-4 |
| `application/hooks/use-invite.ts` | 초대 토큰 → 버블 정보 조회 | 8-12 |
| `application/hooks/use-reactions.ts` | 리액션 조회 | 8-4-8 |
| `application/hooks/use-reaction-actions.ts` | 리액션 생성/삭제 | 8-4-8 |
| `application/hooks/use-bookmark-actions.ts` | 북마크 토글 | 8-4-9 |
| `application/hooks/use-bookmarks.ts` | 북마크 목록 | 8-13-7a |

#### Presentation

| 컴포넌트 | 역할 | DESIGN_SPEC 참조 |
|----------|------|-----------------|
| `components/group/group-card.tsx` | 버블 카드 (이름 + 멤버수 + 유형) | 5-9 |
| `components/group/group-member-list.tsx` | 멤버 리스트 (역할 뱃지) | 5-10 |
| `components/group/create-group-modal.tsx` | 버블 생성 모달 | 5-9 |
| `components/group/entry-requirements.tsx` | 가입 조건 표시 | 5-11 |
| `containers/groups-container.tsx` | 버블 목록 (내 버블 / 탐색 탭) | 5-9 |
| `containers/group-detail-container.tsx` | 버블 상세 | 5-10 |
| `containers/group-join-container.tsx` | 초대 링크 가입 | 5-11 |

#### Pages

| 파일 | 내용 |
|------|------|
| `app/groups/page.tsx` | GroupsContainer |
| `app/groups/[id]/page.tsx` | GroupDetailContainer |
| `app/groups/join/page.tsx` | GroupJoinContainer |

#### 완료 기준

- [x] 버블 생성 (이름, 설명, 접근/공유 방식)
- [x] 버블 초대 링크 생성 + 가입
- [x] 버블 피드 (공유된 기록)
- [x] 리액션 (좋아요, 유용해요, 맛있겠다, 댓글)
- [x] 북마크 CRUD + 목록 페이지

---

### S5. Discovery & Recommend (발견 + 추천)

> 목표: 검색/필터 기반 발견 + AI 맞춤 추천

**선행**: S2 (Record) + S4 (Social — 공개/버블 기록 접근)

#### API Routes

| 파일 | 역할 | TECH_SPEC 참조 |
|------|------|---------------|
| `app/api/recommend/route.ts` | AI 맛집 추천 (Taste DNA + 상황 + 위치) | 4-3 |

#### Application Hooks

| 파일 | 내용 | PRD 참조 |
|------|------|---------|
| `application/hooks/use-discover.ts` | 검색 + 장르/상황 필터 | 8-8 |
| `application/hooks/use-recommendation.ts` | AI 추천 요청/결과 | 8-9 |

#### Presentation

| 컴포넌트 | 역할 | DESIGN_SPEC 참조 |
|----------|------|-----------------|
| `containers/discover-container.tsx` | 검색바 + 필터 칩 + 결과 리스트 | 5-7 |
| `containers/recommend-container.tsx` | 상황 선택 + 위치 + AI 추천 결과 | 5-8 |

#### Pages

| 파일 | 내용 |
|------|------|
| `app/discover/page.tsx` | DiscoverContainer |
| `app/recommend/page.tsx` | RecommendContainer |

#### 완료 기준

- [x] 키워드 + 장르 + 상황 필터 검색
- [x] 검색 결과 기록 카드 리스트
- [x] AI 추천 (상황 필터 + 위치 + Taste DNA 기반 추천 결과 리스트)

---

### S6. Advanced Features (고급 기능)

> 목표: 비교 게임, 프로필 심화, Wrapped, 궁합, 알림, Phase 2, 계정 삭제

**선행**: S2 + S3 + S4 대부분 완료

#### S6-A. 프로필 심화

| 파일 | 내용 | PRD 참조 |
|------|------|---------|
| `application/hooks/use-update-profile.ts` | 닉네임 수정 | 8-13-2 |
| `application/hooks/use-records.ts` | 최근 기록 목록 | 8-13-6 |
| `components/profile/stats-summary.tsx` | 통계 (기록수/연속일/최장연속) | 5-12 |
| `components/profile/taste-type-card.tsx` | Taste DNA 3탭 (Food/Wine/Cooking) | 5-12 |
| `components/profile/level-badge.tsx` | 레벨 뱃지 + XP | 5-12 |
| `containers/profile-container.tsx` | 프로필 전체 조합 | 5-12 |
| `app/profile/page.tsx` | ProfileContainer | — |
| `app/profile/bookmarks/page.tsx` | 북마크 목록 | 5-18 |

#### S6-B. Phase 2 — AI 블로그 리뷰

| 파일 | 내용 | TECH_SPEC 참조 |
|------|------|---------------|
| `app/api/records/generate-review/route.ts` | 질문 생성 + 블로그 생성 | 4-2 |
| `application/hooks/use-record-completion.ts` | Phase 2 진행 상태 관리 | — |
| `components/review/ai-question-card.tsx` | AI 질문 + 선택지/자유입력 | 5-5 |
| `components/review/blog-preview.tsx` | 블로그 미리보기 | 5-5 |
| `containers/review-completion-container.tsx` | Phase 2 페이지 조합 | 5-5 |
| `app/records/[id]/complete/page.tsx` | ReviewCompletionContainer | — |

#### S6-C. Phase 3 — 비교 게임

| 파일 | 내용 | TECH_SPEC 참조 |
|------|------|---------------|
| `domain/entities/comparison.ts` | Comparison, ComparisonMatchup 타입 | 3-4 |
| `application/hooks/use-comparison.ts` | 비교 그룹 선택 + 토너먼트 진행 | — |
| `components/comparison/matchup-card.tsx` | 2개 기록 VS 카드 | 5-6 |
| `components/comparison/comparison-result.tsx` | 최종 결과 (우승 카드) | 5-6 |
| `containers/comparison-container.tsx` | 비교 게임 조합 | 5-6 |
| `app/comparison/page.tsx` | ComparisonContainer | — |

#### S6-D. 궁합 매칭

| 파일 | 내용 | TECH_SPEC 참조 |
|------|------|---------------|
| `app/api/compatibility/route.ts` | 궁합 점수 산출 (service_role) | 4-6 |
| `application/hooks/use-compatibility.ts` | 궁합 결과 조회 | — |
| `containers/compatibility-container.tsx` | 궁합 페이지 조합 | 5-14 |
| `app/compatibility/page.tsx` | CompatibilityContainer | — |

#### S6-E. 알림

| 파일 | 내용 | PRD 참조 |
|------|------|---------|
| `application/hooks/use-notifications.ts` | 알림 목록 + 미읽은 수 | 8-16 |
| `containers/notifications-container.tsx` | 알림 리스트 | 5-16 |
| `app/notifications/page.tsx` | NotificationsContainer | — |

#### S6-F. Wrapped (연간 리뷰)

| 파일 | 내용 | PRD 참조 |
|------|------|---------|
| `application/hooks/use-wrapped.ts` | 연간 통계 집계 | 8-17 |
| `containers/wrapped-container.tsx` | Wrapped 스토리 조합 | 5-13 |
| `app/wrapped/page.tsx` | WrappedContainer | — |

#### S6-G. 식당 상세

| 파일 | 내용 | PRD 참조 |
|------|------|---------|
| `application/hooks/use-restaurant-detail.ts` | 식당 정보 + 관련 기록 | 8-15 |
| `containers/restaurant-detail-container.tsx` | 식당 상세 조합 | 5-17 |
| `app/restaurants/[id]/page.tsx` | RestaurantDetailContainer | — |

#### S6-H. 계정 삭제

| 파일 | 내용 | TECH_SPEC 참조 |
|------|------|---------------|
| `app/api/auth/delete-account/route.ts` | 탈퇴 요청 (30일 유예) | 4-7 |
| `app/api/auth/cancel-deletion/route.ts` | 탈퇴 철회 | 4-7 |

#### S6-I. 기타

| 파일 | 내용 |
|------|------|
| `app/offline/page.tsx` | 오프라인 안내 (WifiOff 아이콘) |
| `presentation/providers/auth-provider.tsx` | Auth Context Provider |
| `presentation/providers/swr-provider.tsx` | SWR 글로벌 설정 |

#### 완료 기준

- [x] Phase 2 블로그 생성 API (AI 질문 → 매거진 스타일)
- [x] Phase 3 비교 게임 (토너먼트 브래킷 → VS 카드 → 우승 결과)
- [x] 프로필 (3탭 DNA + Style DNA + 통계 + 레벨)
- [x] 궁합 매칭 (버블 멤버 검색 → 점수 게이지 + 유사도 바)
- [ ] 알림 (hook 존재, 컨테이너 UI 미구현 — 빈 페이지)
- [x] Wrapped (연간 통계 카드 4종 + DNA 레이더)
- [x] 계정 삭제 (30일 유예 + 복구)

---

## 5. 파일 수 요약

| 스트림 | Domain | Infra | API Routes | App Hooks | Components | Containers | Pages | 합계 |
|--------|--------|-------|------------|-----------|------------|------------|-------|------|
| S0 Foundation | — | 4 | — | — | 6 | — | 1 | ~11 |
| S1 Auth | 2 | 3 | 2 | 1 | 2 | 1 | 3 | ~14 |
| S2 Record | 3 | 4 | 6 | 6 | 10 | 3 | 3 | ~35 |
| S3 Home | — | — | — | 7 | 7 | 1 | 1 | ~16 |
| S4 Social | 2 | 1 | 1 | 8 | 3 | 3 | 3 | ~21 |
| S5 Discovery | — | — | 1 | 2 | — | 2 | 2 | ~7 |
| S6 Advanced | 1 | — | 4 | 8 | 6 | 8 | 8 | ~35 |
| **합계** | **8** | **12** | **14** | **32** | **34** | **18** | **21** | **~139** |

---

## 6. 바이브 코딩 로드맵 (6시간 스프린트)

> 1인 + Claude Code. 6시간 집중 세션 1회로 전체 구현.
> 커밋과 Playwright 테스트는 **주요 마일스톤에서만** 실행 (총 4회).

### 원칙

- Claude Code가 코드 생성 → 사람은 방향 지시 + 빠른 확인
- `pnpm build`는 자주, `playwright test`와 커밋은 마일스톤에서만
- 완벽보다 동작 우선 — 빌드 깨지면 즉시 수정, 세부 폴리싱은 마지막에

### 테스트 파일 구조 (최소)

```
e2e/
├── helpers/auth.ts           # 테스트용 로그인 헬퍼
├── core.spec.ts              # Milestone 1: 기반 + 인증 + 기록 생성
├── home-social.spec.ts       # Milestone 2: 홈 + 버블
├── features.spec.ts          # Milestone 3: 발견 + 프로필 + 고급 기능
└── full-flow.spec.ts         # Milestone 4: 전체 E2E
```

---

### Hour 1 (0:00~1:00) — S0 Foundation + S1 Auth

```
[0:00~0:30] S0 Foundation
  - Supabase 클라이언트 3개 + types (supabase gen types)
  - shared/constants (categories, tags, scenes, routes) + utils/cn.ts
  - globals.css (Tailwind 4 + CSS 변수)
  - layout.tsx + AppShell + BottomNav + LogoLink + HeaderActions
  - shadcn/ui 일괄: button, input, label, dialog, sheet, separator, tabs, badge, scroll-area, select, checkbox, slider, card
  - 빈 페이지 라우트 5개 (/, /discover, /record, /groups, /profile)
  - empty-state, section-header, search-bar 공유 컴포넌트

[0:30~1:00] S1 Auth
  - domain: User, UserStats 엔티티 + UserRepository 인터페이스
  - infrastructure: supabase-user-repository
  - app/auth/callback/route.ts (Google, Kakao)
  - app/auth/naver/callback/route.ts
  - proxy.ts (미들웨어 인증 가드)
  - application/hooks/use-auth.ts
  - LoginContainer + login-buttons + terms-agreement
  - app/auth/login/page.tsx, terms/service, terms/privacy
```

> `pnpm build` 한 번 돌려서 타입 에러 없는지만 빠르게 확인

---

### Hour 2 (1:00~2:00) — S2 Record (Domain → Infrastructure → API)

```
[1:00~1:30] Domain + Infrastructure
  - domain: Record, Restaurant, RecordTasteProfile, RecordAiAnalysis 엔티티
  - domain: RecordRepository, RestaurantRepository 인터페이스
  - di/repositories.ts
  - infrastructure: supabase-record-repo, supabase-restaurant-repo
  - infrastructure/api/kakao-local.ts
  - infrastructure/storage/image-upload.ts

[1:30~2:00] API Routes + Application Hooks
  - app/api/restaurants/nearby/route.ts (카카오 카테고리 검색)
  - app/api/restaurants/search/route.ts (카카오 키워드 검색)
  - app/api/analyze-visit/route.ts (Gemini 사진 분석)
  - use-create-record, use-restaurant-search, use-nearby-restaurants, use-geolocation hooks
```

> `pnpm build` 확인

---

### Hour 3 (2:00~3:00) — S2 Record UI + AI Pipeline

```
[2:00~2:30] Record 생성 UI
  - photo-capture-sheet, record-type-selector, rating-scales, quick-rating
  - ai-result-card, nearby-restaurant-picker
  - QuickCaptureContainer + app/record/page.tsx

[2:30~3:00] AI Pipeline + Record 상세/수정
  - app/api/records/enrich/route.ts
  - app/api/records/taste-profile/route.ts
  - app/api/records/post-process/route.ts
  - use-record-detail, use-edit-record hooks
  - record-card, rating-bars, photo-picker, category-tag 컴포넌트
  - RecordDetailContainer + RecordEditContainer
  - app/records/[id]/page.tsx, app/records/[id]/edit/page.tsx
```

#### Milestone 1 커밋 (3:00)

```bash
pnpm build && pnpm lint
pnpm exec playwright test e2e/core.spec.ts
git commit -m "feat: foundation + auth + record CRUD + AI pipeline"
```

**e2e/core.spec.ts** 주요 케이스:
```typescript
test('홈 페이지 로드 + 하단 내비 5탭 표시')
test('각 탭 라우트 진입 가능')
test('미인증 → /auth/login 리다이렉트')
test('로그인 페이지: 소셜 버튼 + 약관 표시')
test('/record: 유형 3탭 + 평가 슬라이더 표시')
test('/records/[id]: 기록 상세 페이지 렌더링')
```

---

### Hour 4 (3:00~4:00) — S3 Home + S4 Social

```
[3:00~3:30] S3 Home 전체
  - use-profile, use-taste-dna, use-style-dna, use-calendar-records hooks
  - use-todays-pick, use-records-for-map, use-friends-feed hooks
  - todays-pick-card, home-profile-card, taste-dna-radar (SVG)
  - photo-calendar, calendar-day-popup
  - home-map-section, friends-feed-card
  - HomeContainer + app/page.tsx 연결

[3:30~4:00] S4 Social 전체
  - domain: Group, Reaction 엔티티 + GroupRepository 인터페이스
  - infrastructure: supabase-group-repository
  - app/api/groups/invite/route.ts
  - use-groups, use-group-detail, use-group-actions, use-invite hooks
  - use-reactions, use-reaction-actions, use-bookmark-actions, use-bookmarks
  - group-card, group-member-list, create-group-modal, entry-requirements
  - GroupsContainer, GroupDetailContainer, GroupJoinContainer
  - app/groups/page.tsx, app/groups/[id]/page.tsx, app/groups/join/page.tsx
```

#### Milestone 2 커밋 (4:00)

```bash
pnpm build && pnpm lint
pnpm exec playwright test e2e/home-social.spec.ts
git commit -m "feat: home dashboard + social bubbles"
```

**e2e/home-social.spec.ts** 주요 케이스:
```typescript
test('홈 5개 섹션 순서대로 렌더링')
test('포토 캘린더: 7열 그리드 + 월 이동')
test('Taste DNA 레이더 차트 렌더링')
test('/groups: 내 버블 / 탐색 탭 전환')
test('버블 생성 모달 열기')
test('리액션 버튼 표시')
```

---

### Hour 5 (4:00~5:00) — S5 Discovery + S6 Advanced

```
[4:00~4:20] S5 Discovery + Recommend
  - app/api/recommend/route.ts
  - use-discover, use-recommendation hooks
  - DiscoverContainer, RecommendContainer
  - app/discover/page.tsx, app/recommend/page.tsx

[4:20~4:40] S6-A Profile 심화
  - use-update-profile, use-records hooks
  - stats-summary, taste-type-card, level-badge
  - ProfileContainer + app/profile/page.tsx, app/profile/bookmarks/page.tsx

[4:40~5:00] S6-B/C Phase 2 블로그 + Phase 3 비교
  - app/api/records/generate-review/route.ts
  - use-record-completion hook
  - ai-question-card, blog-preview
  - ReviewCompletionContainer + app/records/[id]/complete/page.tsx
  - domain: Comparison 엔티티
  - use-comparison hook
  - matchup-card, comparison-result
  - ComparisonContainer + app/comparison/page.tsx
```

#### Milestone 3 커밋 (5:00)

```bash
pnpm build && pnpm lint
pnpm exec playwright test e2e/features.spec.ts
git commit -m "feat: discover, profile, phase 2 blog, phase 3 comparison"
```

**e2e/features.spec.ts** 주요 케이스:
```typescript
test('/discover: 검색바 + 필터 칩 표시')
test('/recommend: 상황 선택 + 추천 결과')
test('/profile: 통계 + DNA 3탭')
test('/records/[id]/complete: Phase 2 진행')
test('/comparison: 토너먼트 UI 표시')
```

---

### Hour 6 (5:00~6:00) — 나머지 + 통합 + 폴리싱

```
[5:00~5:20] S6 나머지 기능
  - 궁합: app/api/compatibility/route.ts + use-compatibility + CompatibilityContainer
  - 알림: use-notifications + NotificationsContainer + app/notifications/page.tsx
  - Wrapped: use-wrapped + WrappedContainer + app/wrapped/page.tsx
  - 식당 상세: use-restaurant-detail + RestaurantDetailContainer + app/restaurants/[id]/page.tsx
  - 계정 삭제: app/api/auth/delete-account/route.ts, cancel-deletion/route.ts
  - 오프라인: app/offline/page.tsx

[5:20~5:40] Provider + 와인/요리 분기
  - presentation/providers/auth-provider.tsx
  - presentation/providers/swr-provider.tsx
  - 와인 WSET 7축 분기 (rating-scales 내 조건부)
  - 요리 맛 특성 6축 수동 입력 분기

[5:40~6:00] 폴리싱
  - 빈 상태 / 로딩 스켈레톤 / 에러 처리
  - 빌드 에러·경고 전부 해결
  - 전체 Playwright 테스트 실행
```

#### Milestone 4 — 최종 커밋 (6:00)

```bash
pnpm build && pnpm lint
pnpm exec playwright test                # 전체 테스트 스위트
git commit -m "feat: all features complete — compatibility, wrapped, notifications, polish"
```

**e2e/full-flow.spec.ts** 주요 케이스:
```typescript
test('전체 플로우: 로그인 → 기록 생성 → 홈 확인 → 상세 → 수정')
test('전체 플로우: 버블 생성 → 기록 공유 → 리액션')
test('빈 상태: 기록 0건 홈 → 온보딩 안내')
test('모바일 뷰포트(390x844): 레이아웃 정상')
```

---

### 요약 타임라인

```
시간    내용                                  커밋      테스트
──────  ─────────────────────────────────────  ────────  ──────────────────
0:00    S0 Foundation + S1 Auth                —         pnpm build만
1:00    S2 Domain + Infra + API                —         pnpm build만
2:00    S2 Record UI + AI Pipeline             —         —
3:00    ── Milestone 1 ──                      commit    core.spec.ts
3:00    S3 Home + S4 Social                    —         —
4:00    ── Milestone 2 ──                      commit    home-social.spec.ts
4:00    S5 Discovery + S6 Advanced 전반        —         —
5:00    ── Milestone 3 ──                      commit    features.spec.ts
5:00    S6 나머지 + 와인/요리 + 폴리싱         —         —
6:00    ── Milestone 4 (최종) ──               commit    full-flow.spec.ts
──────────────────────────────────────────────────────────────────────────
총 6시간, 4 commits, 4 test files, ~139 files
```

---

## 7. 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| AI 파이프라인 복잡도 (S2-C) | 높음 | enrich → taste-profile → post-process 순차 테스트. 각 Step 독립 실행 가능하게 설계 |
| 카카오 API 호출 제한 | 중간 | 개발 중 mock 데이터 활용. 프로덕션은 캐싱 + rate limiting |
| Supabase RLS 디버깅 | 중간 | admin 클라이언트로 먼저 검증 후 RLS 적용 |
| 지도 SDK 로딩 (네이버/카카오) | 낮음 | 동적 로딩 + fallback UI |
| 와인 WSET 테이스팅 UI 복잡도 | 중간 | 식당 기록 먼저 완성 → 와인/요리는 유형별 분기로 점진 추가 |

---

## 8. 기록 유형별 구현 우선순위

모든 유형이 동일 컴포넌트를 공유하되, 유형별 분기가 있는 부분만 다르다.

```
1순위: 식당 (restaurant) — 가장 일반적, AI 파이프라인 전체 활용
2순위: 요리 (cooking) — AI 파이프라인 단순 (post-process만), 맛 특성 수동 입력
3순위: 와인 (wine) — WSET 7축 추가, AI+사용자 평균 로직
```

각 유형은 S2 내에서 순차 추가:
- S2 초기: 식당만 완전 구현
- S2 중기: 요리 분기 추가 (기존 UI 재활용 + 맛 특성 입력 추가)
- S2 후기: 와인 분기 추가 (WSET 슬라이더 + AI 병합 로직)
