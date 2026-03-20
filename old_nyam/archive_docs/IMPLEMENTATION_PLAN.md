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

---
---

# Post-Audit Implementation Plan

> 버전: 1.0.0 | 작성일: 2026-03-18
> 근거 문서: [IMPLEMENTATION_AUDIT.md](./IMPLEMENTATION_AUDIT.md)

구현 감사(Audit) 결과 발견된 P0/P1 미구현 항목 5건의 상세 구현 계획.

---

## 총괄 요약

| # | 항목 | 우선순위 | 예상 소요 | 의존성 | 상태 |
|---|------|----------|-----------|--------|------|
| 0 | DESIGN_SPEC Wine DNA Note 정정 | P0 | - | 없음 | 완료 (2026-03-18) |
| 1 | 미들웨어 연결 | P0 | 10분 | 없음 | 미착수 |
| 2 | 친구 피드 연결 | P1 | 30분 | 없음 | 미착수 |
| 3 | XP 보너스 구현 | P1 | 2시간 | 없음 | 미착수 |
| 4 | 계정 삭제 Cron | P1 | 1.5시간 | Vercel 배포 환경 | 미착수 |
| 5 | 상권명 매핑 생성 | P1 | 1시간 | 없음 | 미착수 |

**총 소요: ~5시간** (항목 0 완료 제외) | 항목 1-2-5는 병렬 가능, 3-4는 독립

---

## 1. 미들웨어 연결 (P0, 10분)

### 현황

- `src/proxy.ts`에 완전한 미들웨어 로직 존재 (89줄)
  - 인증 확인 → 비활성 계정 체크 → 약관 동의 체크
  - `PUBLIC_ROUTES` 화이트리스트, API/정적 경로 스킵
  - `config.matcher` 패턴 정의 완료
- **문제**: Next.js는 `middleware.ts` 파일명만 자동 감지. `proxy.ts`는 무시됨

### 구현 단계

#### Step 1: 파일 이름 변경

```bash
git mv src/proxy.ts src/middleware.ts
```

#### Step 2: export 이름 변경

```typescript
// src/middleware.ts

// Before (line 14):
export async function proxy(request: NextRequest) {

// After:
export async function middleware(request: NextRequest) {
```

`config` export는 그대로 유지 (Next.js 컨벤션과 일치).

#### Step 3: import 참조 업데이트

프로젝트 내 `proxy`를 import하는 파일이 있으면 `middleware`로 변경.

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/proxy.ts` → `src/middleware.ts` | 파일명 변경 |
| `src/middleware.ts` | `proxy` → `middleware` 함수명 변경 |

### 검증

- [ ] `pnpm build` 성공
- [ ] 프로젝트 내 `proxy` import 참조가 없는지 확인 (grep "from.*proxy")
- [ ] 미인증 상태로 `/` 접근 시 `/auth/login` 리다이렉트
- [ ] 인증 후 `is_deactivated=true` 계정으로 접근 시 `/auth/login?error=account_deactivated` 리다이렉트
- [ ] `terms_agreed_at=null` 계정으로 접근 시 `/auth/consent` 리다이렉트
- [ ] PUBLIC_ROUTES (`/auth/login`, `/terms/*`, `/offline`) 정상 접근

### 리스크

- 낮음. 로직 변경 없이 파일명/함수명만 변경

---

## 2. 친구 피드 연결 (P1, 30분)

### 현황

- **Hook**: `src/application/hooks/use-friends-feed.ts` — 완전 구현
  - `useFriendsFeed(limit = 20)` → `{ records: RecordWithPhotos[], isLoading, error, mutate }`
  - group_memberships → record_shares → records 조회, 자신 제외, createdAt 내림차순
- **Component**: `src/presentation/components/home/friends-feed-card.tsx` — 완전 구현
  - Props: `nickname`, `profileImageUrl`, `recordTitle`, `thumbnailUrl`, `recordType`, `createdAt`, `onClick`
- **Container**: `src/presentation/containers/home-container.tsx` — 하드코딩 플레이스홀더 (lines 99-108)

### 구현 단계

#### Step 1: home-container.tsx에 hook + component 연결

```typescript
// src/presentation/containers/home-container.tsx

// 추가 import
import { useFriendsFeed } from "@/application/hooks/use-friends-feed"
import { FriendsFeedCard } from "@/presentation/components/home/friends-feed-card"

// Container 함수 내부에 hook 호출 추가
const { records: friendsRecords, isLoading: friendsLoading } = useFriendsFeed(5)
```

#### Step 2: 플레이스홀더를 실제 렌더링으로 교체

```tsx
{/* 5. Friends Feed */}
<SectionHeader title="친구 피드" subtitle="버블 멤버의 최근 기록" />
{friendsLoading ? (
  <div className="space-y-3">
    {Array.from({ length: 3 }, (_, i) => (
      <div key={i} className="h-20 animate-pulse rounded-2xl bg-neutral-100" />
    ))}
  </div>
) : friendsRecords.length === 0 ? (
  <div className="rounded-2xl bg-white p-6 shadow-[var(--shadow-sm)] text-center">
    <p className="text-sm text-neutral-400">
      버블에 가입하면 친구들의 기록을 볼 수 있어요
    </p>
  </div>
) : (
  <div className="space-y-3">
    {friendsRecords.map((record) => (
      <FriendsFeedCard
        key={record.id}
        nickname={record.user?.nickname ?? "익명"}
        profileImageUrl={record.user?.profileImageUrl ?? null}
        recordTitle={record.title ?? "무제"}
        thumbnailUrl={record.photos?.[0]?.thumbnailUrl ?? null}
        recordType={record.recordType}
        createdAt={record.createdAt}
        onClick={() => router.push(`/records/${record.id}`)}
      />
    ))}
  </div>
)}
```

> **참고**: `RecordWithPhotos` 타입에 `user` 필드(닉네임, 프로필 이미지)가 join되어 있는지 확인 필요. 없으면 `use-friends-feed.ts`에서 user 정보를 함께 fetch하도록 보강.

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/presentation/containers/home-container.tsx` | hook import + 플레이스홀더 → 실제 렌더링 |

### 검증

- [ ] 버블 미가입 시 빈 상태 메시지 표시
- [ ] 버블 가입 + 공유 기록 있을 때 FriendsFeedCard 렌더링
- [ ] 카드 클릭 시 `/records/[id]` 이동
- [ ] 로딩 중 스켈레톤 표시

### 리스크

- `RecordWithPhotos` 타입에 user join 데이터가 없을 수 있음 → hook 수정 필요할 수 있음 (영향도: 낮음)

---

## 3. XP 보너스 구현 (P1, 2시간)

### 현황

- **TECH_SPEC 5-5 기준 XP 보너스**:
  - Phase 1 완료: +5 XP ← **미구현**
  - Phase 2 완료: +15 XP ← 구현 완료 (`generate-review/route.ts:293-320`)
  - Phase 3 완료: +5 XP ← **미구현**
  - 신규 장르 기록: +10 XP ← **미구현**
  - 7일 연속 기록: +20 XP ← **미구현**
  - 4종류 사진 촬영: +3 XP ← **미구현**
- `calculateNyamLevel()` 함수가 `generate-review/route.ts`에 인라인 정의됨 (재사용 불가)
- `post-process/route.ts`에서는 `total_records`만 증가, XP 로직 없음

### 구현 단계

#### Step 1: calculateNyamLevel을 공유 유틸로 추출

```typescript
// src/shared/utils/xp.ts

export function calculateNyamLevel(points: number): number {
  if (points >= 3600) return 30
  if (points >= 1200) return Math.floor(15 + (points - 1200) * 15 / 2400)
  if (points >= 300) return Math.floor(5 + (points - 300) * 10 / 900)
  return Math.floor(1 + points * 4 / 300)
}

export interface XpBonus {
  reason: string
  points: number
}

export function collectXpBonuses(params: {
  isNewGenre: boolean
  consecutiveDays: number
  photoTypeCount: number
}): XpBonus[] {
  const bonuses: XpBonus[] = []
  if (params.isNewGenre) bonuses.push({ reason: "new_genre", points: 10 })
  if (params.consecutiveDays >= 7) bonuses.push({ reason: "7day_streak", points: 20 })
  if (params.photoTypeCount >= 4) bonuses.push({ reason: "4type_photos", points: 3 })
  return bonuses
}
```

#### Step 2: post-process/route.ts에 Phase 1 XP (+5) + 보너스 로직 추가

```typescript
// src/app/api/records/post-process/route.ts 수정

import { calculateNyamLevel, collectXpBonuses, calculateConsecutiveDays } from "@/shared/utils/xp"

// user_stats 업데이트 섹션 (기존 lines 199-208) 교체:

// 1. Phase 1 기본 XP
let xpEarned = 5

// 2. 사진 수 조회 (record select에 photos 미포함이므로 별도 쿼리)
const { count: photoCount } = await admin
  .from("record_photos")
  .select("*", { count: "exact", head: true })
  .eq("record_id", record.id)

// 3. 연속 기록 일수 조회
const { data: recentRecords } = await admin
  .from("records")
  .select("created_at")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
  .limit(30)

// 4. 신규 장르 체크
const { count: genreCount } = await admin
  .from("records")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id)
  .eq("genre", record.genre)

const xpBonuses = collectXpBonuses({
  isNewGenre: (genreCount ?? 0) <= 1,  // 이번 기록 포함 1건이면 신규
  consecutiveDays: calculateConsecutiveDays(
    recentRecords?.map(r => r.created_at) ?? []
  ),
  photoTypeCount: photoCount ?? 0,
})
xpEarned += xpBonuses.reduce((sum, b) => sum + b.points, 0)

// 6. user_stats 업데이트
const { data: stats } = await admin
  .from("user_stats")
  .select("points, total_records")
  .eq("user_id", user.id)
  .single()

const currentPoints = stats?.points ?? 0
const newPoints = currentPoints + xpEarned

await admin.from("user_stats").upsert({
  user_id: user.id,
  points: newPoints,
  nyam_level: calculateNyamLevel(newPoints),
  total_records: (stats?.total_records ?? 0) + 1,
  updated_at: new Date().toISOString(),
}, { onConflict: "user_id" })

// 7. phase_completions 기록
await admin.from("phase_completions").insert({
  record_id: record.id,
  user_id: user.id,
  phase: 1,
  xp_earned: xpEarned,
})
```

#### Step 3: 7일 연속 기록 계산 헬퍼

```typescript
// src/shared/utils/xp.ts에 추가
// Note: SupabaseClient 타입을 shared에서 직접 import하면 아키텍처 위반.
// 이 함수는 post-process API route에서만 호출되므로, route 파일 내 인라인 구현도 가능.
// 여기서는 Supabase 의존성 없이 날짜 배열을 받는 순수 함수로 분리.

export function calculateConsecutiveDays(dates: string[]): number {
  if (!dates.length) return 0

  // 날짜 중복 제거 + 내림차순 정렬
  const unique = [...new Set(dates.map(d => d.split("T")[0]))]
    .sort((a, b) => b.localeCompare(a))

  let streak = 1
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1])
    const curr = new Date(unique[i])
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) streak++
    else break
  }
  return streak
}

// post-process/route.ts에서 사용:
// const { data: recentRecords } = await admin
//   .from("records").select("created_at")
//   .eq("user_id", user.id)
//   .order("created_at", { ascending: false }).limit(30)
// const streak = calculateConsecutiveDays(
//   recentRecords?.map(r => r.created_at) ?? []
// )
```

#### Step 4: Phase 3 XP (+5) — comparison 완료 시

```typescript
// src/app/api/comparison/route.ts (또는 비교 완료 API)
// 비교 게임 결과 저장 후:

import { calculateNyamLevel } from "@/shared/utils/xp"

// Phase 3 XP 부여
const { data: stats } = await admin
  .from("user_stats")
  .select("points")
  .eq("user_id", user.id)
  .single()

const newPoints = (stats?.points ?? 0) + 5

await admin.from("user_stats").upsert({
  user_id: user.id,
  points: newPoints,
  nyam_level: calculateNyamLevel(newPoints),
  updated_at: new Date().toISOString(),
}, { onConflict: "user_id" })

await admin.from("phase_completions").insert({
  record_id: winnerId,
  user_id: user.id,
  phase: 3,
  xp_earned: 5,
})
```

#### Step 5: generate-review/route.ts의 인라인 함수 제거

```typescript
// src/app/api/records/generate-review/route.ts

// Before (lines 225-230): 인라인 calculateNyamLevel 삭제
// After: import { calculateNyamLevel } from "@/shared/utils/xp"
```

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/shared/utils/xp.ts` | **신규** — calculateNyamLevel, collectXpBonuses, calculateConsecutiveDays |
| `src/app/api/records/post-process/route.ts` | Phase 1 XP + 보너스 로직 추가 |
| `src/app/api/records/generate-review/route.ts` | 인라인 함수 → shared import |
| `src/presentation/containers/comparison-container.tsx` (또는 비교 결과 저장 API) | Phase 3 XP 로직 추가 — 현재 API route 미존재 시 신규 생성 필요 |

### 검증

- [ ] Phase 1 기록 생성 → user_stats.points +5
- [ ] 신규 장르 기록 → 추가 +10
- [ ] 7일 연속 기록 → 추가 +20
- [ ] 4종류 사진 촬영 → 추가 +3
- [ ] Phase 2 완료 → +15 (기존 로직 유지 확인)
- [ ] Phase 3 완료 → +5
- [ ] nyam_level이 포인트에 따라 정확히 계산

### 리스크

- `phase_completions` 테이블: DB에 존재 확인됨 (`004_records.sql:149-156`)
- 동시성: 같은 유저가 동시에 여러 기록 저장 시 race condition → `points + xpEarned` 방식 대신 RPC 사용 고려
- `calculateConsecutiveDays`의 타임존 처리 (Asia/Seoul 기준 — UTC 날짜 비교 시 자정 전후 오차 가능)
- Phase 3 XP: 비교 게임 결과 저장 API가 별도로 없을 수 있음 → 클라이언트 측 비교 결과를 서버에 전송하는 route 신규 생성 필요 여부 확인

---

## 4. 계정 삭제 Cron (P1, 1.5시간)

### 현황

- **TECH_SPEC 4-7 기준**: 30일 유예 후 데이터 영구 삭제 (특정 순서)
- `src/app/api/auth/delete-account/route.ts` — 탈퇴 요청만 처리 (is_deactivated=true + account_deletions INSERT)
- `src/app/api/auth/cancel-deletion/route.ts` — 탈퇴 철회
- **Cron 작업 (실제 삭제)**: **미구현**

### TECH_SPEC 삭제 순서 (4-7, CASCADE 활용)

```
a. Supabase Storage 파일 삭제 (record_photos → storage_path)
b. records DELETE → CASCADE로 record_photos, record_journals,
   record_ai_analyses, record_taste_profiles, record_shares,
   bookmarks, reactions, phase_completions 자동 삭제
c. comparisons DELETE → CASCADE → comparison_matchups
d. groups (owner) 처리 (이관 or 삭제)
e. group_memberships DELETE (비소유 그룹)
f. notifications DELETE
g. taste_dna_restaurant/wine/cooking DELETE
h. style_dna_restaurant_*/wine_*/cooking_* DELETE
i. user_stats DELETE
j. users DELETE
k. supabase.auth.admin.deleteUser(userId)
```

> **Note**: `record_photos`에는 `user_id` 컬럼이 없음. `records` 테이블을 통해 JOIN 필요.
> `records` DELETE 시 CASCADE로 대부분의 하위 테이블이 자동 삭제되므로, Storage 파일만 먼저 수동 삭제.

### 구현 단계

#### Step 1: Vercel Cron 설정

```json
// vercel.json (프로젝트 루트)
{
  "crons": [
    {
      "path": "/api/cron/process-deletions",
      "schedule": "0 3 * * *"
    }
  ]
}
```

> 매일 오전 3시(UTC) = 한국시간 12시(정오) 실행

#### Step 2: Cron API Route 생성

```typescript
// src/app/api/cron/process-deletions/route.ts

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 유예 기간 만료된 계정 조회
  const { data: deletions } = await admin
    .from("account_deletions")
    .select("user_id")
    .lte("scheduled_at", new Date().toISOString())
    .eq("status", "pending")

  if (!deletions?.length) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0

  for (const { user_id } of deletions) {
    try {
      // TECH_SPEC 4-7 CASCADE 기반 삭제 순서

      // a. Storage 파일 삭제 (record_photos에 user_id 없음 → records JOIN)
      const { data: records } = await admin
        .from("records")
        .select("id")
        .eq("user_id", user_id)

      if (records?.length) {
        const recordIds = records.map(r => r.id)
        const { data: photos } = await admin
          .from("record_photos")
          .select("photo_url")
          .in("record_id", recordIds)

        if (photos?.length) {
          const paths = photos
            .map(p => p.photo_url)
            .filter(Boolean)
            .map(url => url.split("/").pop()!)
            .filter(Boolean)
          if (paths.length) {
            await admin.storage.from("record-photos").remove(paths)
          }
        }
      }

      // b. records DELETE → CASCADE 자동 삭제:
      //    record_photos, record_ai_analyses, record_taste_profiles,
      //    record_shares, bookmarks, reactions, phase_completions
      await admin.from("records").delete().eq("user_id", user_id)

      // c. comparisons DELETE → CASCADE → comparison_matchups
      await admin.from("comparisons").delete().eq("user_id", user_id)

      // d. groups (owner) — 다른 멤버에게 이관 or 삭제
      const { data: ownedGroups } = await admin
        .from("groups")
        .select("id")
        .eq("owner_id", user_id)

      if (ownedGroups?.length) {
        for (const group of ownedGroups) {
          const { data: nextOwner } = await admin
            .from("group_memberships")
            .select("user_id")
            .eq("group_id", group.id)
            .neq("user_id", user_id)
            .eq("role", "admin")
            .limit(1)
            .single()

          if (nextOwner) {
            await admin.from("groups").update({ owner_id: nextOwner.user_id }).eq("id", group.id)
          } else {
            await admin.from("groups").delete().eq("id", group.id)
          }
        }
      }

      // e. group_memberships (비소유 그룹)
      await admin.from("group_memberships").delete().eq("user_id", user_id)

      // f. notifications
      await admin.from("notifications").delete().eq("user_id", user_id)

      // g. Taste DNA
      await admin.from("taste_dna_restaurant").delete().eq("user_id", user_id)
      await admin.from("taste_dna_wine").delete().eq("user_id", user_id)
      await admin.from("taste_dna_cooking").delete().eq("user_id", user_id)

      // h. Style DNA (restaurant 7 + wine 4 + cooking 2 = 9 tables)
      const styleTables = [
        "style_dna_restaurant_genres", "style_dna_restaurant_areas",
        "style_dna_restaurant_scenes",
        "style_dna_wine_varieties", "style_dna_wine_regions",
        "style_dna_wine_types", "style_dna_wine_scenes",
        "style_dna_cooking_genres", "style_dna_cooking_scenes",
      ]
      for (const table of styleTables) {
        await admin.from(table).delete().eq("user_id", user_id)
      }

      // i-j. user_stats + account_deletions + users
      await admin.from("user_stats").delete().eq("user_id", user_id)
      await admin.from("account_deletions").delete().eq("user_id", user_id)
      await admin.from("users").delete().eq("id", user_id)

      // k. Supabase Auth
      await admin.auth.admin.deleteUser(user_id)

      processed++
    } catch (error) {
      console.error(`Failed to delete user ${user_id}:`, error)
      // 실패한 계정은 다음 Cron에서 재시도
      // Note: status CHECK constraint은 'pending'|'cancelled'|'completed'만 허용
      // 에러 시 pending 유지 + updated_at으로 재시도 추적
      await admin.from("account_deletions").update({
        updated_at: new Date().toISOString(),
      }).eq("user_id", user_id)
    }
  }

  return NextResponse.json({ processed, total: deletions.length })
}
```

#### Step 3: 환경 변수 추가

```
CRON_SECRET=<random-secret>  # Vercel 프로젝트 설정에 추가
```

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `vercel.json` | **신규** — Cron 스케줄 정의 |
| `src/app/api/cron/process-deletions/route.ts` | **신규** — 삭제 Cron 핸들러 |
| `.env.example` | `CRON_SECRET` 추가 |

### 검증

- [ ] `GET /api/cron/process-deletions` (Bearer 인증) 호출 시 정상 응답
- [ ] 유예 기간 만료 계정: CASCADE 포함 모든 데이터 삭제 확인 (Storage + 9개 Style DNA + 3개 Taste DNA + user_stats + users + auth)
- [ ] 유예 기간 미만 계정: 삭제되지 않음
- [ ] 삭제 실패 시 pending 상태 유지 + updated_at 갱신 (다음 실행에서 재시도)
- [ ] cancel-deletion 후 status=cancelled인 계정은 스킵
- [ ] owner인 그룹: 다른 admin에게 이관되거나, 멤버 없으면 그룹 삭제

### 리스크

- CASCADE 의존: `records` 삭제 전 반드시 Storage 파일 먼저 제거 (CASCADE 후에는 photo_url 조회 불가)
- `record_photos`에 `user_id` 컬럼 없음 → `records` JOIN 필요 (코드에 반영 완료)
- Vercel Hobby 플랜: Cron 실행 시간 제한 (10초). 대량 삭제 시 배치 처리 필요
- `account_deletions.status` CHECK constraint: `pending`, `cancelled`, `completed` 만 허용 — 에러 시 `pending` 유지 + `updated_at` 갱신으로 처리 (코드에 반영 완료)
- `notifications` 테이블: 존재 확인됨 (`008_notifications.sql`)
- `comparisons` 테이블: 존재 확인됨 (`007_comparisons.sql`), CASCADE to `comparison_matchups`

---

## 5. 상권명 매핑 생성 (P1, 1시간)

### 현황

- TECH_SPEC: Style DNA에 상권명(area) 포함 → `style_dna_restaurant_areas` 테이블
- `post-process/route.ts`(lines 128-158): `restaurant.region`을 읽어 Style DNA 업데이트하지만, region 값이 항상 null
- `supabase-restaurant-repository.ts`: `upsertFromKakao()`에 `region` 파라미터 정의되어 있으나, **이 메서드는 코드베이스 어디에서도 호출되지 않음** (dead stub)
- `enrich/route.ts`는 `admin.from("records").update(...)` 등 직접 쿼리 사용 — Repository 패턴 미적용
- `src/shared/constants/areas.ts` 파일 없음
- Kakao API 응답에 `address_name` (예: "서울 강남구 역삼동 123-4") 포함

### 구현 단계

#### Step 1: 상권명 상수 파일 생성

```typescript
// src/shared/constants/areas.ts

export const AREA_MAPPINGS: Record<string, string> = {
  // 서울 주요 상권
  "역삼동": "강남역",
  "서초동": "강남역",
  "논현동": "신논현/강남",
  "청담동": "청담/압구정",
  "신사동": "가로수길/압구정",
  "압구정동": "청담/압구정",
  "삼성동": "삼성/코엑스",
  "대치동": "대치/학여울",
  "잠실동": "잠실/송파",
  "송파동": "잠실/송파",
  "방이동": "잠실/송파",
  "문정동": "문정/가든파이브",
  "이태원동": "이태원/경리단길",
  "한남동": "한남동/이태원",
  "용산동": "용산역",
  "서교동": "홍대/합정",
  "합정동": "홍대/합정",
  "연남동": "연남동",
  "상수동": "상수/망원",
  "망원동": "상수/망원",
  "성수동": "성수동",
  "건대입구": "건대/성수",
  "화양동": "건대/성수",
  "종로1가": "종로/광화문",
  "종로2가": "종각",
  "종로3가": "종로3가/익선동",
  "익선동": "익선동",
  "명동": "명동",
  "을지로": "을지로",
  "연희동": "연희동",
  "이촌동": "이촌/용산",
  "여의도동": "여의도",
  "영등포동": "영등포/타임스퀘어",
  "목동": "목동",
  "천호동": "천호/강동",
  "노원동": "노원",
  // 경기/인천
  "정자동": "분당/정자",
  "서현동": "분당/서현",
  "판교동": "판교",
  "동탄": "동탄",
  "부평동": "부평",
  // 기타 광역시는 구 단위로 매핑
} as const

/**
 * 카카오 주소에서 상권명 추출
 * @param addressName "서울 강남구 역삼동 123-4" 형태
 * @returns "강남역" 또는 구 이름 (매핑 없을 시)
 */
export function extractArea(addressName: string): string | null {
  if (!addressName) return null

  const parts = addressName.split(" ")
  // 동 이름으로 매핑 시도 (3번째 파트가 보통 동)
  for (const part of parts) {
    const cleaned = part.replace(/[0-9-]+$/, "") // "역삼동 123-4" → "역삼동"
    if (AREA_MAPPINGS[cleaned]) return AREA_MAPPINGS[cleaned]
  }

  // 매핑 실패 시 구 이름 반환 ("강남구" → "강남구")
  const gu = parts.find(p => p.endsWith("구") || p.endsWith("시"))
  return gu ?? null
}

export type AreaName = string
```

#### Step 2: kakao-local.ts에서 address_name 원본 보존

현재 `kakao-local.ts`는 `road_address_name || address_name`을 `address`로 병합. 상권명 추출에는 지번주소(`address_name`)가 필요하므로, `NearbyPlace` 타입에 원본 필드 추가.

```typescript
// src/infrastructure/api/kakao-local.ts 수정

// NearbyPlace 인터페이스에 추가:
addressName: string  // 지번 주소 원본 (예: "서울 강남구 역삼동 123")

// 매핑 부분 수정 (line 67-70):
address: doc.road_address_name || doc.address_name,
addressName: doc.address_name,  // ← 추가
```

#### Step 3: use-create-record.ts에서 region 추출 및 restaurants INSERT에 추가

> **핵심**: restaurants INSERT는 `enrich/route.ts`가 아닌 `use-create-record.ts`(클라이언트 훅)에서 수행됨.
> `enrich/route.ts`는 restaurants 테이블에 접근하지 않음.

```typescript
// src/application/hooks/use-create-record.ts 수정

import { extractArea } from "@/shared/constants/areas"

// restaurants INSERT 부분 (lines 80-91):
const { data: created } = await supabase
  .from("restaurants")
  .insert({
    source: "kakao",
    external_id: data.selectedPlace.externalId,
    name: data.selectedPlace.name,
    address: data.selectedPlace.address,
    phone: data.selectedPlace.phone || null,
    latitude: data.selectedPlace.latitude,
    longitude: data.selectedPlace.longitude,
    external_url: data.selectedPlace.placeUrl || null,
    region: extractArea(data.selectedPlace.addressName),  // ← 추가
  })
```

#### Step 4: post-process의 Style DNA area 업데이트 확인

`post-process/route.ts` lines 128-158에서 이미 `restaurant.region`을 읽어 `style_dna_restaurant_areas`에 upsert하고 있음. Step 3에서 region이 채워지면 자동으로 동작.

#### Step 5 (선택): upsertFromKakao dead stub 정리

`upsertFromKakao`가 호출되지 않는 상태이므로, 추후 리팩토링 시 클라이언트 직접 쿼리를 Repository 패턴으로 마이그레이션하거나, dead stub을 제거하는 것을 권장.

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/shared/constants/areas.ts` | **신규** — AREA_MAPPINGS + extractArea |
| `src/infrastructure/api/kakao-local.ts` | NearbyPlace에 `addressName` 필드 추가 |
| `src/application/hooks/use-create-record.ts` | restaurants INSERT에 `region` 추가 |

### 검증

- [ ] `extractArea("서울 강남구 역삼동 123-4")` → `"강남역"`
- [ ] `extractArea("서울 마포구 서교동 395-1")` → `"홍대/합정"`
- [ ] `extractArea("경기 성남시 분당구 판교동")` → `"판교"`
- [ ] 매핑 없는 주소 → 구 이름 반환
- [ ] 기록 생성 후 `restaurants.region` 컬럼에 값 저장 확인
- [ ] `style_dna_restaurant_areas`에 상권명 누적 확인

### 리스크

- 카카오 API `address_name`이 항상 지번 주소인지 확인 필요 (일부 장소는 빈 값일 수 있음)
- 초기 매핑이 서울 중심 → 다른 도시는 구 이름으로 fallback
- 기존 기록의 region은 소급 적용 안 됨 (필요시 별도 마이그레이션)
- `use-create-record.ts`는 클라이언트 훅 → `extractArea`가 클라이언트 번들에 포함됨 (shared/constants이므로 허용 범위)

---

## 실행 순서

```
모든 항목은 서로 독립 (의존성 없음).

병렬 그룹 A (단순 연결 작업):
  ├─ #1 미들웨어 연결 (10분)
  ├─ #2 친구 피드 연결 (30분)
  └─ #5 상권명 매핑 (1시간)

병렬 그룹 B (신규 로직, A와도 병렬 가능):
  ├─ #3 XP 보너스 구현 (2시간)
  └─ #4 계정 삭제 Cron (1.5시간)

권장 실행 순서 (1인 작업 시):
  1. #1 미들웨어 (빠른 P0 해결, 10분)
  2. #2 친구 피드 연결 (30분)
  3. #5 상권명 매핑 (1시간)
  4. #3 XP 보너스 (2시간)
  5. #4 계정 삭제 Cron (1.5시간)
  6. pnpm build && pnpm lint
  7. 통합 테스트
```

---

## SSOT 문서 동기화

구현 완료 후 업데이트 필요한 문서:

| 문서 | 업데이트 내용 |
|------|-------------|
| `IMPLEMENTATION_AUDIT.md` | 각 항목 상태를 "구현 완료"로 변경 |
| `TECH_SPEC.md` | XP 보너스 구현 세부사항 (collectXpBonuses 함수 참조) |
| 이 문서 (IMPLEMENTATION_PLAN.md) | 완료 체크리스트 업데이트 |
