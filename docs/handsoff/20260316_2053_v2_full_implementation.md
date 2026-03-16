# Handoff: v2 전체 기능 구현 완료

> 작성: 2026-03-16 | 최종 커밋: `901fc5a` | 브랜치: `main`

---

## 1. 이번 세션에서 한 일

v2 프로젝트의 PRD 전체 로드맵(P0~P7)을 구현하고, 코드 리뷰 및 보안 강화까지 완료.

### 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `260c91a` | P0-P1: 인증, hooks, 기록 작성 플로우, 데이터 파이프라인 |
| `fb4f241` | P2: 그룹 CRUD, 기록 공유, 탐색 필터 |
| `323e5a7` | P3: 기록/식당 상세, 근처 맛집, 프로필 수정 |
| `72c433a` | P4: 네비게이션 연결, 삭제, 북마크, 리액션, 그룹 피드 |
| `3ac7c3f` | P5: 취향 궁합, 공유 카드, AI 추천 |
| `7bcefc4` | P6: 초대 링크, 기록 수정, 알림, 그룹 챌린지 |
| `a48d22c` | P7: Year in Review, PWA 오프라인, 프리미엄 그룹 |
| `901fc5a` | 보안 강화 + 코드 품질 수정 |

---

## 2. 현재 상태

### 코드 메트릭

| 항목 | 수치 |
|------|------|
| TypeScript/TSX 파일 | 139개 |
| 총 코드 라인 | 12,228 LOC |
| 라우트 | 24개 (16 페이지 + 6 API + 2 auth) |
| Application Hooks | 32개 |
| Containers | 15개 |
| Components | 31개 |
| Domain Entities | 8개 |
| Repository Interfaces | 6개 |
| Repository 구현체 | 6개 |

### 빌드 상태

- `pnpm build` — 0 에러, 0 타입 에러
- `pnpm lint` — 0 에러, 0 경고
- TypeScript strict 모드, `any` 0개, `@ts-ignore` 0개
- Clean Architecture 규칙 위반 0건

---

## 3. 전체 아키텍처

### 계층 구조

```
src/
├── app/                          # Next.js App Router (라우팅만)
│   ├── page.tsx                  # → HomeContainer
│   ├── discover/page.tsx         # → DiscoverContainer
│   ├── groups/page.tsx           # → GroupsContainer
│   ├── groups/[id]/page.tsx      # → GroupDetailContainer
│   ├── groups/join/page.tsx      # → GroupJoinContainer
│   ├── profile/page.tsx          # → ProfileContainer
│   ├── record/page.tsx           # → RecordContainer
│   ├── records/[id]/page.tsx     # → RecordDetailContainer
│   ├── records/[id]/edit/page.tsx# → RecordEditContainer
│   ├── restaurants/[id]/page.tsx # → RestaurantDetailContainer
│   ├── compatibility/page.tsx    # → CompatibilityContainer
│   ├── recommend/page.tsx        # → RecommendContainer
│   ├── notifications/page.tsx    # → NotificationsContainer
│   ├── wrapped/page.tsx          # → WrappedContainer
│   ├── offline/page.tsx          # PWA 오프라인 (standalone)
│   ├── auth/login/page.tsx       # → LoginContainer
│   ├── auth/callback/route.ts    # Supabase OAuth callback
│   ├── auth/naver/callback/route.ts # Naver 커스텀 OAuth
│   └── api/
│       ├── recognize/route.ts    # Gemini Vision 음식 인식
│       ├── recommend/route.ts    # Gemini AI 맛집 추천
│       ├── records/post-process/route.ts # Taste DNA + XP 재계산
│       ├── restaurants/search/route.ts   # Kakao Local 식당 검색
│       └── groups/invite/route.ts        # 그룹 초대 링크
│
├── domain/                       # 순수 타입 (외부 의존 없음)
│   ├── entities/                 # 8개: user, record, restaurant, group, taste-dna, experience-atlas, reaction, challenge
│   ├── repositories/             # 6개: 인터페이스만
│   └── services/                 # compatibility.ts (코사인 유사도, 보완성 산출)
│
├── application/                  # Use Case Layer
│   └── hooks/                    # 32개 SWR/useState 기반 hooks
│
├── presentation/                 # UI Layer
│   ├── containers/               # 15개: hook 호출 + 조합
│   ├── components/               # 31개: 순수 props-only UI
│   │   ├── auth/                 # login-buttons
│   │   ├── group/                # 7개: card, modal, member-list, gate 등
│   │   ├── layout/               # bottom-nav
│   │   ├── profile/              # 5개: radar, badge, stats 등
│   │   ├── record/               # 13개: photo-picker, rating, share-card 등
│   │   ├── shared/               # 3개: empty-state, search-bar, section-header
│   │   └── user/                 # user-mini-card
│   └── providers/                # auth-provider (React Context)
│
├── infrastructure/               # Infra Layer
│   ├── repositories/             # 6개: Supabase 구현체
│   ├── supabase/                 # client, server, admin, types
│   ├── api/                      # food-recognition, kakao-local
│   └── storage/                  # image-upload
│
├── di/                           # DI 컨테이너 (singleton lazy-load)
│   └── repositories.ts
│
└── shared/                       # 공유 유틸/상수
    ├── constants/                # categories, challenges, routes
    └── utils/                    # cn, relative-time, sanitize
```

### 의존성 방향

```
app → presentation → application → domain ← infrastructure
                                     ↑
                                    di/
```

---

## 4. 기능별 상세

### P0: 인증 시스템

| 파일 | 역할 |
|------|------|
| `use-auth.ts` | Supabase auth hook (Kakao/Google OAuth + Naver 커스텀) |
| `auth-provider.tsx` | React Context 전역 인증 상태 |
| `auth/callback/route.ts` | Supabase OAuth code exchange |
| `auth/naver/callback/route.ts` | Naver: token → profile → admin createUser → magiclink → verifyOtp |
| `login-container.tsx` | 로그인 UI + OAuth 버튼 |
| `middleware.ts` | 미인증 시 /auth/login 리다이렉트 |

### P0: 기록 작성 플로우 (7단계)

```
사진 → 타입 선택 → 식당 매칭 → 평가 → 태그/코멘트 → 공개범위 → 저장/피드백
```

| 파일 | 역할 |
|------|------|
| `use-create-record.ts` | 7단계 상태 머신 |
| `use-restaurant-search.ts` | Kakao Local 디바운스 검색 |
| `photo-picker.tsx` | 3컬럼 그리드 사진 선택 |
| `record-type-selector.tsx` | 식당/와인/요리 탭 |
| `restaurant-matcher.tsx` | 식당 검색/매칭 UI |
| `rating-input.tsx` | 1-5점 원형 버튼 (타입별 축 분기) |
| `tag-selector.tsx` | 멀티 셀렉트 칩 + AI 추천 하이라이트 |
| `visibility-selector.tsx` | private/group/public |
| `record-complete.tsx` | 완료 피드백 화면 |

### P1: 데이터 파이프라인

| 파일 | 역할 |
|------|------|
| `api/records/post-process/route.ts` | 기록 저장 후 fire-and-forget 후처리 |

후처리 내용:
1. **Taste DNA 재계산** — 최근 100건 가중 이동 평균으로 6축 맛 벡터 갱신
2. **Experience Atlas XP** — 지역/장르/씬 3축 XP 적립 + 레벨 산출
3. **User Stats** — 총 기록수, 스트릭, 레벨, 포인트 갱신

### P2: 소셜 기능

| 기능 | 주요 파일 |
|------|----------|
| 그룹 생성/참여/탈퇴 | `use-group-actions.ts`, `create-group-modal.tsx` |
| 그룹 상세 | `group-detail-container.tsx`, `group-member-list.tsx` |
| 공개 그룹 탐색 | `use-public-groups.ts`, `public-groups-section.tsx` |
| 탐색 필터 | `use-discover.ts` (카테고리/상황 필터 + 검색) |

### P3: 상세 페이지

| 기능 | 주요 파일 |
|------|----------|
| 기록 상세 | `record-detail-container.tsx` — 사진 캐러셀, 폴리모픽 평점 바, 태그, 코멘트 |
| 식당 상세 | `restaurant-detail-container.tsx` — 식당 정보, 메뉴, 커뮤니티 기록 |
| 홈 근처 맛집 | `use-geolocation.ts` + `use-nearby-records.ts` |
| 프로필 수정 | `use-update-profile.ts` — 닉네임 인라인 편집 |

### P4: 인터랙션

| 기능 | 주요 파일 |
|------|----------|
| 네비게이션 | 홈/프로필/탐색의 모든 카드 → `/records/[id]` 링크 |
| 기록 삭제 | `use-record-actions.ts` — 본인 기록 더보기 메뉴 |
| 북마크 | `use-bookmarks.ts` + `use-bookmark-actions.ts` |
| 리액션 | `use-reactions.ts` + `use-reaction-actions.ts` (like/useful/yummy) |
| 그룹 피드 | `use-group-feed.ts` — 그룹 내 공유 기록 목록 |

### P5: 차별화 기능

| 기능 | 주요 파일 |
|------|----------|
| 취향 궁합 | `compatibility.ts` (domain service) — 코사인 유사도 + 경험 보완성 |
| 공유 카드 | `share-card.tsx` + `use-share-card.ts` — html-to-image + Web Share API |
| AI 추천 | `api/recommend/route.ts` — Gemini 2.0 Flash, Taste DNA + 상황 기반 |

### P6: 참여/리텐션

| 기능 | 주요 파일 |
|------|----------|
| 초대 링크 | `api/groups/invite/route.ts` + `group-join-container.tsx` |
| 기록 수정 | `record-edit-container.tsx` — 메뉴명, 평점, 공개범위 편집 |
| 알림 | `use-notifications.ts` — 리액션/공유 알림 + 벨 배지 |
| 그룹 챌린지 | `use-group-challenges.ts` — 주간 미션 2개 + 진행률 바 |

### P7: 고급 기능

| 기능 | 주요 파일 |
|------|----------|
| Year in Review | `wrapped-container.tsx` — 월별 차트, 탑 카테고리, 통계 요약 |
| PWA 오프라인 | `next.config.ts` + `manifest.json` + `offline/page.tsx` |
| 프리미엄 그룹 | `use-premium-group.ts` + `premium-gate.tsx` — viewonly 타입 승인제 |

---

## 5. 외부 연동

| 서비스 | 용도 | 환경변수 |
|--------|------|----------|
| **Supabase** | DB, Auth, Storage | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Kakao Local API** | 식당 검색 (FD6 카테고리) | `KAKAO_REST_API_KEY` |
| **Gemini Vision** | AI 음식 인식 (graceful degradation) | `GEMINI_API_KEY` |
| **Naver OAuth** | 네이버 로그인 | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` |

---

## 6. 보안 조치

| 항목 | 상태 |
|------|------|
| Naver OAuth CSRF | state 파라미터 UUID 형식 검증 |
| SQL 인젝션 | `sanitizeLikePattern()` 유틸로 LIKE 패턴 이스케이프 |
| API 인증 | post-process에서 auth 세션 기반 userId 추출 |
| 로그 보안 | 토큰/에러 객체 로깅 제거, 에러 메시지만 기록 |
| RLS | Supabase 전 테이블 Row Level Security 적용 |
| 서버 전용 키 | Kakao/Gemini API 키는 서버 API 라우트에서만 사용 |

---

## 7. Supabase 스키마

19개 테이블 (8개 마이그레이션 원격 적용 완료):

| 카테고리 | 테이블 |
|----------|--------|
| **Core** | users, restaurants, records, record_photos, record_journals |
| **Social** | groups, group_memberships, record_shares, bookmarks, reactions |
| **Taste DNA** | taste_dna, taste_dna_wine, taste_dna_homecook |
| **Experience Atlas** | experience_atlas_regions, experience_atlas_genres, experience_atlas_scenes |
| **Stats** | user_stats, group_stats, restaurant_stats |

DB 트리거:
- `handle_new_user` — 회원가입 시 users + user_stats + taste_dna 자동 생성
- `completeness_score` — 기록 저장 시 완성도 자동 산출
- `rating_overall` — 기록 저장 시 종합 평점 자동 산출
- `last_active_at` — 활동 시 마지막 활동일 갱신

---

## 8. 남은 수동 작업

| 항목 | 설명 | 우선순위 |
|------|------|----------|
| Storage RLS | `supabase/migrations/009_create_storage_policies.sql`을 Supabase SQL Editor에서 실행 | 높음 |
| GEMINI_API_KEY | `.env.local`에 추가하면 AI 인식 + 추천 활성화 | 중간 |
| PWA 아이콘 | `public/icons/`에 icon-192.png, icon-512.png 생성 (SVG 플레이스홀더 있음) | 낮음 |
| Middleware → Proxy | Next.js 16 권장 패턴으로 전환 (현재 동작에 문제 없음) | 낮음 |

---

## 9. 다음 단계 제안

PRD 로드맵이 모두 구현되었으므로, 다음은 **운영 준비**:

1. **E2E 테스트** — Playwright로 핵심 플로우 (로그인 → 기록 작성 → 상세 확인) 테스트
2. **에러 바운더리** — 각 라우트에 `error.tsx` 추가
3. **실 데이터 QA** — 실제 로그인 후 전체 플로우 수동 검증
4. **성능 최적화** — Image 컴포넌트 sizes 최적화, SWR revalidation 튜닝
5. **배포** — Vercel 연동 + 환경변수 설정
6. **모니터링** — Sentry 에러 트래킹 연동

---

## 10. 기술 스택 요약

```
Framework:    Next.js 16.1.6 (App Router)
Language:     TypeScript strict
Styling:      Tailwind CSS v4
UI:           shadcn/ui + Lucide Icons
Data:         SWR (fetching) + useState (mutations)
Auth:         Supabase Auth (Kakao/Google/Naver)
Database:     Supabase PostgreSQL (19 tables, RLS)
Storage:      Supabase Storage (record-photos)
AI:           Gemini 2.0 Flash (인식 + 추천)
Maps:         Kakao Local API (식당 검색)
PWA:          @ducanh2912/next-pwa
Sharing:      html-to-image + Web Share API
Architecture: Clean Architecture (5-layer)
DI:           Singleton lazy-load container
Port:         localhost:7911
```
