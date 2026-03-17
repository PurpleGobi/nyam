# Nyam — Handoff Document

> 작성일: 2026-03-17 | 커밋: `b85e43d` | 브랜치: `main`

---

## 타임라인

| 시각 | 작업 | 산출물 |
|------|------|--------|
| T+0:00 | S0 Foundation | Supabase 클라이언트 3종, 상수, globals.css, AppShell, BottomNav, shadcn/ui 13개 |
| T+0:30 | S1 Auth | OAuth 콜백, proxy 가드, 로그인 UI, 약관 동의 |
| T+1:00 | S2 Domain + Infra | 엔티티 5종, Repository 3종, DI, Kakao API, 이미지 업로드 |
| T+1:30 | S2 API + Hooks | AI 분석(Gemini), 3단계 파이프라인, 기록 CRUD hooks 6개 |
| T+2:00 | S2 Record UI | 기록 생성/상세/수정 컨테이너, 평가 슬라이더, AI 결과 카드 |
| T+2:30 | S3 Home | Today's Pick, 프로필 카드, DNA 레이더, 포토 캘린더 |
| T+3:00 | S4 Social | 그룹 CRUD, 초대, 멤버 관리, 리액션, 북마크 |
| T+3:30 | S5 Discovery + S6 시작 | 검색/필터, 추천 API, 프로필 심화, 알림, Wrapped |
| T+4:00 | S6 Hooks + Containers | 12개 hooks, 10개 containers 병렬 생성 |
| T+4:30 | S6 마무리 | AuthProvider, SWR Provider, Phase 2 블로그 API, 컴포넌트 |
| T+5:00 | 누락 파일 보충 | 홈 3개, 그룹 2개, 비교 3개, 프로필 1개 컴포넌트 + hooks 6개 + API 1개 |
| T+5:30 | 와인/요리 분기 | WSET 7축 슬라이더, 요리 맛 특성 6축 수동 입력 |
| T+5:45 | 폴리싱 | middleware→proxy 마이그레이션, Skeleton, error boundary, img→Image |
| T+6:00 | E2E 테스트 + 커밋 | 4개 spec 파일 (21 tests), 빌드/린트 클린, 푸쉬 완료 |

---

## 현재 상태

| 항목 | 상태 |
|------|------|
| `pnpm build` | 통과 |
| `pnpm lint` | 0 error, 0 warning |
| 라우트 | 35개 (14 API + 21 페이지) |
| 파일 수 | 178개 신규 (10,825줄) |
| 커밋 | `b85e43d` on `main` |

### 파일 구조 요약

```
src/
├── app/                    # 21 pages + 12 API routes
│   ├── (main)/             # AppShell 적용 라우트 (15 pages)
│   ├── api/                # 12 API routes
│   ├── auth/               # OAuth 콜백 + 로그인
│   └── terms/              # 약관 2페이지
├── application/hooks/      # 28 hooks
├── domain/
│   ├── entities/           # 6 엔티티
│   └── repositories/       # 4 인터페이스
├── infrastructure/
│   ├── repositories/       # 4 구현체
│   ├── api/                # Kakao Local
│   ├── storage/            # 이미지 업로드
│   └── supabase/           # 클라이언트 3종 + types
├── presentation/
│   ├── components/         # 38 컴포넌트 (ui 14 + feature 24)
│   ├── containers/         # 17 컨테이너
│   └── providers/          # 2 (Auth, SWR)
├── shared/                 # 상수 4 + utils 1
├── di/                     # Repository 팩토리
└── proxy.ts                # Auth 가드 (Next.js 16)
e2e/                        # 4 spec + 1 helper
```

---

## 동작하는 기능

- OAuth 로그인 (Google/Kakao/Naver/Apple) + 약관 동의
- 기록 생성 (식당/와인/요리 3유형) + AI 사진 분석 (Gemini)
- 식당: 6축 평가 + Kakao 주변 식당 매칭
- 와인: 2축 평가 + WSET 7축 테이스팅 (선택)
- 요리: 7축 평가 + 맛 특성 6축 수동 입력
- 3단계 AI 파이프라인 (enrich → taste-profile → post-process)
- Phase 2 블로그 리뷰 생성 API
- 홈 대시보드 (Today's Pick, 프로필 카드, DNA 레이더, 포토 캘린더, 지도, 피드)
- 그룹(버블) CRUD + 초대 + 멤버 관리
- 리액션 + 북마크
- 검색/필터 (장르, 상황)
- 프로필 (3탭 DNA, Style DNA, 통계, 레벨)
- 알림, 식당 상세, 계정 삭제 (30일 유예)
- 비교 게임 토너먼트 로직
- 궁합 매칭 (코사인 유사도)

---

## 플레이스홀더 (추후 구현 필요)

| 기능 | 현재 상태 | 필요 작업 |
|------|-----------|-----------|
| 지도 SDK | MapPin 아이콘 플레이스홀더 | 네이버/카카오 Maps SDK 연동 |
| AI 추천 | API 존재, UI "준비 중" | 실제 추천 알고리즘 |
| Wrapped | 통계 hook 존재, UI "준비 중" | 스토리 형태 UI |
| 비교 게임 | 로직 완성, UI "준비 중" | ComparisonContainer에 matchup-card 연결 |
| 궁합 매칭 | API 완성, UI "준비 중" | CompatibilityContainer 실제 UI |
| Naver OAuth | 플레이스홀더 (커스텀 OIDC 필요) | Supabase OIDC 설정 |

---

## 환경 변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
KAKAO_REST_API_KEY
GEMINI_API_KEY
```

---

## 다음 단계 권장 순서

1. **Supabase DB 마이그레이션 적용** — `supabase/migrations/` 확인 후 로컬/리모트 적용
2. **실제 로그인 테스트** — Google/Kakao OAuth 콘솔에 콜백 URL 등록
3. **플레이스홀더 → 실제 구현** — 지도 SDK > 비교 게임 UI > 추천 > Wrapped
4. **E2E 테스트 확장** — 인증 후 플로우 (테스트 유저 시딩 필요)
5. **Vercel 배포** — 환경변수 설정 후 `vercel deploy`
