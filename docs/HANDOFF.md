# Nyam — Handoff Document

> 최종 업데이트: 2026-03-17 | 커밋: `ba6f2e0` | 브랜치: `main`

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
| T+7:00 | 플레이스홀더 UI 구현 | 비교/궁합/Wrapped/추천/지도 5개 컨테이너 실제 기능 UI로 전환 |

---

## 현재 상태

| 항목 | 상태 |
|------|------|
| `pnpm build` | 통과 |
| `pnpm lint` | 0 error, 0 warning |
| 라우트 | 35개 (14 API + 21 페이지) |
| 파일 수 | 187개 신규 (~12,000줄) |
| 커밋 | `ba6f2e0` on `main` |

### Supabase DB

- **리모트**: 17개 마이그레이션 적용 완료 (테이블, RLS, 함수 모두 반영)
- **로컬 파일**: `supabase/migrations/001-011` (재정리 버전, 리모트와 이름만 상이)
- **프로젝트**: `gfshmpuuafjvwsgrxnie` (Supabase MCP 연결 설정 완료)

### 파일 구조 요약

```
src/
├── app/                    # 21 pages + 12 API routes
│   ├── (main)/             # AppShell 적용 라우트 (15 pages)
│   ├── api/                # 12 API routes
│   ├── auth/               # OAuth 콜백 + 로그인
│   └── terms/              # 약관 2페이지
├── application/hooks/      # 33 hooks
├── domain/
│   ├── entities/           # 6 엔티티
│   └── repositories/       # 4 인터페이스
├── infrastructure/
│   ├── repositories/       # 4 구현체
│   ├── api/                # Kakao Local
│   ├── storage/            # 이미지 업로드
│   └── supabase/           # 클라이언트 3종 + types
├── presentation/
│   ├── components/         # 38 컴포넌트 (ui 17 + feature 24)
│   ├── containers/         # 17 컨테이너
│   └── providers/          # 2 (Auth, SWR)
├── shared/                 # 상수 4 + utils 1
├── di/                     # Repository 팩토리
└── proxy.ts                # Auth 가드 (Next.js 16)
e2e/                        # 4 spec + 1 helper
```

---

## 동작하는 기능

### Core (Phase 1)
- OAuth 로그인 (Google/Kakao/Apple) + 약관 동의
- 기록 생성 (식당/와인/요리 3유형) + AI 사진 분석 (Gemini)
- 식당: 6축 평가 + Kakao 주변 식당 매칭
- 와인: 2축 평가 + WSET 7축 테이스팅 (선택)
- 요리: 7축 평가 + 맛 특성 6축 수동 입력
- 3단계 AI 파이프라인 (enrich → taste-profile → post-process)
- Phase 2 블로그 리뷰 생성 API

### Home
- Today's Pick 추천 카드 (콜드 스타트 시 온보딩)
- 프로필 카드 + Taste DNA 레이더 (Food/Wine 탭)
- 포토 캘린더 (썸네일 + 월 이동 + 통계)
- 지도 섹션 (핀 시각화 + 기록 썸네일 + 위치 태그 스크롤)
- 친구 피드 (버블 멤버 기록)

### Social
- 그룹(버블) CRUD + 초대 + 멤버 관리
- 리액션 (좋아요, 유용해요, 맛있겠다, 댓글) + 북마크

### Discovery & Advanced
- 검색/필터 (장르 10개, 키워드)
- AI 추천 (상황 8가지 필터 + 위치 + Taste DNA 기반 추천 결과 리스트)
- 비교 게임 (토너먼트 브래킷 → VS 카드 → 우승 결과)
- 궁합 매칭 (버블 멤버 검색 → 점수 게이지 + 유사도 바)
- Wrapped (연간 통계 카드 + DNA 레이더)
- 프로필 (3탭 DNA, Style DNA, 통계, 레벨)
- 알림, 식당 상세, 계정 삭제 (30일 유예)

---

## 남은 작업

| 기능 | 현재 상태 | 필요 작업 | 우선순위 |
|------|-----------|-----------|----------|
| 지도 SDK | 핀 시각화 플레이스홀더 | 네이버/카카오 Maps JS SDK 연동 (JS 키 별도 필요) | 중 |
| Naver OAuth | 플레이스홀더 (커스텀 OIDC 필요) | Supabase OIDC 설정 | 중 |
| 알림 컨테이너 | 빈 페이지 | 알림 리스트 UI 구현 (hook은 존재) | 중 |
| XP 보너스 로직 | 미구현 | 새 장르 첫 기록(+10), 7일 연속(+20), 4장 사진(+3) | 저 |
| public.users 트리거 | 비밀번호 로그인 시 미생성 | OAuth 가입 트리거 정상 여부 확인 | 중 |
| E2E 테스트 확장 | 기본 4개 spec (미인증) | 인증 후 플로우 (테스트 유저 시딩 필요) | 저 |

---

## 환경 변수 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ACCESS_TOKEN          # Supabase MCP용
KAKAO_REST_API_KEY
NAVER_CLIENT_ID
NAVER_CLIENT_SECRET
GEMINI_API_KEY
```

---

## 테스트 유저

| 이메일 | 닉네임 | 용도 |
|--------|--------|------|
| `jk@fightpain.co.kr` | 성준경 | 실 유저 (OAuth) |
| `test@nyam.dev` | 테스트유저 | 개발 테스트 (비밀번호: `test1234!`) |

> 테스트 유저는 `public.users`/`user_stats` 레코드가 없음 (OAuth 트리거 미경유). DB 시딩 필요.

---

## 다음 단계 권장 순서

1. **실제 로그인 테스트** — Google/Kakao OAuth 콘솔에 콜백 URL 등록 후 실제 가입 플로우 검증
2. **테스트 유저 DB 시딩** — `public.users`, `user_stats`, `taste_dna_*` 레코드 생성
3. **알림 컨테이너 UI** — `use-notifications` hook 연결 + 알림 리스트 구현
4. **지도 SDK 연동** — 카카오 Maps JS 키 발급 → `HomeMapSection`에 실제 지도 렌더링
5. **Naver OAuth** — Supabase 커스텀 OIDC 설정
6. **Vercel 배포** — 환경변수 설정 후 `vercel deploy`
