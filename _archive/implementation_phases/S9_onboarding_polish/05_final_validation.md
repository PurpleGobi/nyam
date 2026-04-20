# 9.5: S9 최종 검증

> S1~S9 전체 프로젝트의 최종 품질 게이트. 빌드, 아키텍처, DB, 인증, 디자인, 모든 기능, 성능, 보안, SSOT 정합성을 검증한다.

---

## SSOT 출처

| 문서 | 역할 |
|------|------|
| `CLAUDE.md` | 크리티컬 게이트 전체, 코딩 규칙, Clean Architecture 규칙 |
| `systems/*.md` | 횡단 시스템 SSOT (6개 문서) |
| `pages/01~12_*.md` | 페이지별 구현 스펙 (12개 문서) |
| `prototype/*.html` | 비주얼 레퍼런스 (12개 목업) |

---

## 선행 조건

- 9.1~9.4: 모든 태스크 완료

---

## 1. 빌드 + 린트 + 타입

### 1-1. 빌드

```bash
pnpm build
# 결과: 에러 0, 경고 0
```

### 1-2. 린트

```bash
pnpm lint
# 결과: 경고 0개
```

### 1-3. TypeScript Strict

```bash
# 아래 모두 결과 0줄 (infrastructure adapter 제외)
grep -rn "as any" src/ --include="*.ts" --include="*.tsx" | grep -v "infrastructure/"
grep -rn "@ts-ignore" src/ --include="*.ts" --include="*.tsx"
grep -rn "@ts-expect-error" src/ --include="*.ts" --include="*.tsx"
```

**결과 기록:**

```
□ pnpm build: PASS / FAIL
□ pnpm lint: PASS / FAIL
□ as any 개수 (infra 제외): ___개
□ @ts-ignore 개수: ___개
□ @ts-expect-error 개수: ___개
```

---

## 2. Clean Architecture (R1~R5)

### R1: domain은 외부 의존 0

```bash
grep -rn "from 'react\|from '@supabase\|from 'next\|from 'lucide" src/domain/ --include="*.ts"
# 결과: 0줄
```

### R2: infrastructure는 domain 인터페이스를 implements로 구현

```bash
grep -rL "implements" src/infrastructure/repositories/ --include="*.ts"
# 결과: 0개 파일 (모든 repository가 implements 포함)
```

### R3: application은 domain 인터페이스에만 의존

```bash
grep -rn "from '.*infrastructure" src/application/ --include="*.ts"
# 결과: 0줄
```

### R4: presentation은 application hooks + shared/di만

```bash
grep -rn "from '@supabase\|from '.*infrastructure" src/presentation/ --include="*.tsx" --include="*.ts"
# 결과: 0줄
```

### R5: app/은 라우팅만

```
수동 확인: 모든 page.tsx가 Container 렌더링만 수행
□ app/(main)/page.tsx → HomeContainer
□ app/(main)/restaurants/[id]/page.tsx → RestaurantDetailContainer
□ app/(main)/wines/[id]/page.tsx → WineDetailContainer
□ app/(main)/records/[id]/page.tsx → RecordDetailContainer
□ app/(main)/profile/page.tsx → ProfileContainer
□ app/(main)/bubbles/page.tsx → BubblesContainer
□ app/(main)/bubbles/[id]/page.tsx → BubbleDetailContainer
□ app/(main)/settings/page.tsx → SettingsContainer
□ app/(main)/users/[id]/page.tsx → BubblerProfileContainer
□ app/onboarding/page.tsx → OnboardingContainer
```

**결과 기록:**

```
□ R1 위반: ___건
□ R2 위반: ___건
□ R3 위반: ___건
□ R4 위반: ___건
□ R5 위반: ___건
```

---

## 3. DB 검증

### 3-1. 테이블 존재 확인 (25개)

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**필수 테이블 체크리스트:**

```
□ users
□ restaurants
□ wines
□ records
□ record_photos
□ wishlists
□ user_experiences
□ xp_histories
□ level_thresholds
□ milestones
□ user_milestones
□ bubbles
□ bubble_members
□ bubble_shares
□ bubble_share_reads
□ bubble_ranking_snapshots
□ comments
□ reactions
□ follows
□ notifications
□ nudge_history
□ nudge_fatigue
□ saved_filters
□ ai_recommendations
□ grape_variety_profiles
```

### 3-2. RLS 활성화 확인

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- 모든 테이블 rowsecurity = true
```

```
□ 25개 테이블 모두 RLS 활성화: YES / NO
□ RLS 비활성 테이블 목록: ___
```

### 3-3. SECURITY DEFINER 함수 0개

```sql
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND security_type = 'DEFINER';
-- 결과: 0줄
```

```
□ SECURITY DEFINER 함수: ___개 (0이어야 함)
```

---

## 4. 인증 검증

### 4-1. 소셜 로그인 4종

| 프로바이더 | 로그인 | 로그아웃 | 재로그인 | 닉네임 자동 설정 |
|-----------|--------|---------|---------|----------------|
| 카카오 | □ | □ | □ | □ |
| 구글 | □ | □ | □ | □ |
| 네이버 | □ | □ | □ | □ |
| 애플 | □ | □ | □ | □ |

### 4-2. 인증 흐름

```
□ 비로그인 상태 → 보호된 페이지 접근 → /onboarding (또는 /auth/login) 리다이렉트
□ 온보딩 미완료 → 보호된 페이지 접근 → /onboarding 리다이렉트
□ 온보딩 완료 → /onboarding 접근 → / 리다이렉트
□ 로그아웃 → 세션 파기 → 홈 또는 로그인 화면
□ 1 소셜 계정 = 1 Nyam 계정 (중복 가입 차단)
```

---

## 5. 디자인 토큰 검증

### 5-1. CSS 변수 존재 확인

```css
/* globals.css에 정의되어야 하는 필수 토큰 */
--bg: #F8F6F3
--bg-card: #FEFCFA
--bg-elevated: #FFFFFF
--bg-page: #EFECE7
--text: #3D3833
--text-sub: #8C8580
--text-hint: #B5AFA8
--accent-food: #C17B5E          /* = --primary */
--accent-food-light: #F5EDE8    /* = --primary-light */
--accent-wine: #8B7396
--accent-wine-light: #F0ECF3
--brand: #FF6038                /* nyam 로고, bubbles 텍스트 전용 */
--border: #E8E4DF
--border-bold: #D4CFC8
--positive: #7EAE8B
--caution: #C9A96E
--negative: #B87272
--accent-social: #7A9BAE
--accent-social-light: #EBF0F3
--radius: 16px
```

### 5-2. 다크모드

```
□ 다크모드 CSS 변수 정의 (prefers-color-scheme: dark 또는 data-theme="dark")
□ 다크모드 전환 시 모든 페이지 정상 렌더
```

### 5-3. 하드코딩 컬러 0개

```bash
# 금지 패턴 검출
grep -rn "bg-white\|bg-black\|text-white\|text-black" src/ --include="*.tsx" | grep -v "node_modules/"
grep -rn "color:\s*#\|background:\s*#\|bg-\[#" src/ --include="*.tsx" | grep -v "globals.css\|node_modules/"
# 결과: 0줄 (디자인 토큰 사용 필수)
```

```
□ 하드코딩 컬러 사용: ___건 (0이어야 함)
```

---

## 6. 기능별 검증 매트릭스

### S2: 기록 시스템 (Core Recording)

```
□ 식당 기록: 사분면(가격×분위기) + 만족도(1~100) + 씬태그(6종)
□ 와인 기록: 사분면(산미×바디) + 만족도 + 아로마 팔레트(15섹터 3링)
□ 구조 평가: (와인 전용) 바디, 탄닌, 산미 등
□ 음식 페어링: WSET 8-카테고리 (와인 전용)
□ 사진 업로드: 다수 사진, EXIF GPS 추출
□ 기록 수정: 프리필 → 변경 → 저장
□ 기록 삭제: 확인 모달 → 삭제 → XP 차감
□ checked → rated 전환 (온보딩 기록 보충)
```

### S3: 검색 시스템

```
□ 카메라 AI (Primary): 사진 촬영 → Gemini Vision → 식당/와인 인식
□ 텍스트 검색: 자동완성 (Nyam DB → 외부 API fallback)
□ OCR: 와인 라벨 인식
□ EXIF GPS: 사진 위치 추출 → 근처 식당 매칭
□ 식당 등록: 외부 API → Nyam DB INSERT
□ 와인 등록: OCR → Nyam DB INSERT
□ 검색 → 선택 → 기록 플로우 풀 연결
```

### S4: 상세 페이지

```
식당 상세 (/restaurants/[id]):
□ L1: 히어로 (사진 캐러셀, 찜/공유)
□ L2: 기본 정보 (이름, 장르·지역·가격대)
□ L3: 점수 카드 3칸 (내 점수 · nyam 점수 · 버블 점수)
□ L4: 뱃지 행 (미슐랭, 블루리본, TV)
□ L5: 내 기록 타임라인
□ L6: 포지션 맵 (가격 × 분위기 사분면)
□ L7: 실용 정보 (주소+미니맵, 영업시간, 전화, 메뉴)
□ L8: 연결된 와인 (가로 스크롤)
□ L9: 버블 멤버 기록 (S8)

와인 상세 (/wines/[id]):
□ L1: 히어로 (사진 캐러셀, 라벨 썸네일, 찜/공유)
□ L2: 기본 정보 (이름, 생산자·빈티지, 타입칩+산지+품종)
□ L3: 점수 카드 3칸
□ L4: 뱃지 행 (Grand Cru, Vivino, Wine Spectator)
□ L5: 와인 맵 (산미 × 바디 사분면)
□ L5b: 음식 페어링 태그
□ L6: 내 기록 타임라인
□ L7: 와인 정보 (2-컬럼 표)
□ L8: 연결된 식당 (가로 스크롤)
□ L9: 버블 멤버 기록 (S8)

기록 상세 (/records/[id]):
□ 헤더 (대상명 + 방문일 + 씬칩)
□ 사분면 미니맵
□ 만족도 점수 + 컬러바
□ 아로마 팔레트 (와인만)
□ 코멘트, 사진 갤러리
□ 실용 정보 (가격, 동행자, 방문일)
□ 획득 XP
□ 액션 (수정 · 삭제 · 버블에 공유)

찜 (Wishlist):
□ 식당/와인 찜 추가/제거
□ 홈 찜 서브탭에 표시
```

### S5: 홈 + 추천

```
홈 구조:
□ 앱 헤더 (nyam 로고 · bubbles · 🔔알림 · 아바타 드롭다운)
□ 콘텐츠 탭 [식당 | 와인]
□ 서브탭: 식당(방문/찜/추천/팔로잉), 와인(시음/찜/셀러)
□ 뷰 순환 (상세 → 리스트 → 캘린더)
□ 지도 뷰 (카카오맵)
□ 통계 패널 (접이식)
□ 노션 스타일 필터 (AND/OR)
□ 소팅 드롭다운
□ FAB (+) 기록 추가

추천 알고리즘 7종 (RECOMMENDATION.md):
□ 동작 확인 (기록 수 기반 점진 해금)
□ 추천 카드 표시
□ AI 인사말

넛지:
□ NudgeStrip 홈 상단 표시
□ 최대 1개 + 5초 auto-dismiss
```

### S6: XP + 프로필 + 설정

```
XP:
□ 기록 XP (0/3/8/18)
□ 세부 축 XP (+5 per axis)
□ 카테고리 XP (합산)
□ 소셜 XP (일 상한 10)
□ 보너스 XP (온보딩+10, 첫기록+5, 첫버블+5, 첫공유+3)
□ 마일스톤 XP
□ 활성 XP 크론 (6개월 윈도우)
□ 레벨 커브 (앵커 포인트 선형 보간)
□ 레벨 칭호 표시

프로필 (/profile):
□ 프로필 헤더 (아바타, 닉네임, 소개, 팔로워/팔로잉)
□ 맛 정체성 카드 (taste_summary + taste_tags)
□ 활동 요약 (총 레벨/XP, 식당/와인 개별 레벨, 이번 달 XP, 히트맵)
□ 식당 통계 (맛 지도, 장르 차트, 점수 분포, 씬 차트)
□ 와인 통계 (산지 맵, 품종 차트, 점수 분포, 아로마 프로필)
□ 최근 기록 타임라인
□ Wrapped 공유

설정 (/settings):
□ 계정 (닉네임, 소개, 아바타, 소셜 연동, 로그아웃, 탈퇴)
□ 프라이버시 (프로필 공개 범위, 공개 항목, 버블 기본값, 버블별 커스텀)
□ 알림 (종류별 on/off — 레벨업, 버블 요청, 팔로우, 방해 금지)
□ 화면 디폴트 (랜딩, 홈 탭, 서브탭, 뷰 모드)
□ 기능 디폴트 (소팅, 카메라/검색, 버블 공유, 온도 단위)
□ 데이터 (내보내기, 캐시 삭제)
□ 계정 삭제 (30일 유예, anonymize/hard_delete)
□ 정보 (이용약관, 개인정보처리방침, 오픈소스, 버전)

알림 (드롭다운):
□ 레벨업 알림
□ 버블 가입 요청 (수락/거절)
□ 팔로우 요청 (수락/거절)
□ 버블 가입 승인
□ 팔로우 수락
□ 알림 설정 → 링크
```

### S7: 버블 시스템

```
□ 버블 생성 (이름, 아이콘, 설명, 가입 조건, 공개 범위)
□ 가입 정책 5종 (open, invite_only, auto_approve, manual_approve, closed)
□ 초대 링크 생성 + 딥링크
□ 가입 신청 → 승인/거절 (manual_approve)
□ 자동 승인 (auto_approve + min 조건 충족)
□ 피드 3종 뷰 (피드/카드/리스트) + 필터 + 소팅
□ 리액션 (want/check/fire)
□ 댓글 CRUD
□ 랭킹 탭 (주간 Top N, 순위 변동)
□ 멤버 탭 (멤버 목록, 역할, 초대)
□ 역할 (owner/admin/member) + 권한
□ 랭킹 크론 (주간 스냅샷)
□ focus_type 제한 (restaurant/wine/all)
```

### S8: 통합

```
□ 팔로우/맞팔로우 3단계 접근 (none/follow/mutual)
□ L9: 상세 페이지 버블 멤버 기록 (식당/와인 모두)
□ 홈 팔로잉 서브탭 (팔로잉 유저 기록 피드)
□ 기록 → 버블 공유 플로우
□ 버블러 프로필 (/users/[id])
□ 취향 매칭도 (±5% 비교)
```

### S9: 온보딩 + 넛지

```
□ 5 스크린 온보딩: 로그인 → 인트로 → 맛집 등록 → 버블 생성 → 버블 탐색 → 홈
□ 진행 바 (3칸, active/done/pending)
□ FAB 네비게이션 (Step 1~3에만)
□ 350ms 슬라이드 전환
□ 0개 등록 허용
□ 중도 이탈 → 재진입 복원
□ XP: 첫 버블 +5, 온보딩 완료 +10
□ 넛지: unrated/meal_time/bubble_invite 조건별 표시
□ 넛지: 피로도 + 스누즈 + 일일 한도
```

---

## 7. 성능 검증

```
□ LCP < 3s (Fast 3G) — 홈, 상세 페이지
□ LCP < 1s (WiFi) — 홈, 상세 페이지
□ FID/INP < 200ms
□ CLS < 0.1
□ Initial Bundle < 500KB (gzipped)
□ Total Bundle < 2MB (gzipped)
□ 각 라우트 First Load JS < 200KB
□ 콘솔 에러 0, 경고 0 (모든 라우트)
□ Lighthouse Performance >= 80 (Mobile)
□ Lighthouse Accessibility >= 90
```

---

## 8. 모바일 검증 (360px)

**모든 페이지에서 360px 뷰포트 확인:**

```
□ / (홈) — 탭, 카드, 필터, 소팅 깨짐 없음
□ /onboarding — 5 스크린 모두 깨짐 없음
□ /restaurants/[id] — L1~L9 깨짐 없음
□ /wines/[id] — L1~L9 깨짐 없음
□ /records/[id] — 사분면, 아로마, 사진 깨짐 없음
□ /profile — 통계 차트, 히트맵, 타임라인 깨짐 없음
□ /bubbles — 카드 목록, 탐색 깨짐 없음
□ /bubbles/[id] — 피드 3종 뷰, 랭킹, 멤버 깨짐 없음
□ /settings — 모든 섹션 깨짐 없음
□ /users/[id] — 버블러 프로필 깨짐 없음
□ 알림 드롭다운 — 300px 폭 + 오버레이 깨짐 없음
□ FAB (+) — 터치 타겟 44×44px
□ 기록 플로우 — 사분면 드래그, 만족도 슬라이더 작동
□ 검색 바텀시트 — 키보드 올라올 때 레이아웃 정상
```

---

## 9. 보안 검증

```
RLS:
□ 25개 테이블 모두 RLS 활성화
□ 다른 유저 records 직접 조회 불가 (RLS 확인)
□ 다른 유저 records UPDATE/DELETE 불가
□ 버블 멤버가 아닌 유저가 비공개 버블 조회 불가
□ 비팔로우 유저가 private 프로필 상세 조회 불가

키 노출:
□ SUPABASE_SERVICE_ROLE_KEY가 클라이언트 번들에 미포함
□ 외부 API 키 (Kakao, Naver, Google, Gemini)가 클라이언트에 미노출
□ .env.local 파일이 .gitignore에 포함

동행자 프라이버시:
□ 동행자(companions) 정보가 기록 작성자 이외에게 미노출
□ 버블 공유 시 동행자 정보 제외 (또는 프라이버시 설정 따름)

SECURITY DEFINER:
□ 0개 확인 (§3-3)
```

---

## 10. SSOT 정합성

### 코드 vs systems/*.md

```
□ DATA_MODEL.md: 25개 테이블 스키마가 코드와 일치
□ AUTH.md: 4종 로그인 + RLS 정책이 코드와 일치
□ RATING_ENGINE.md: 사분면 축, 만족도, 아로마, 구조평가, 페어링이 코드와 일치
□ DESIGN_SYSTEM.md: CSS 토큰, 컴포넌트 스타일이 코드와 일치
□ XP_SYSTEM.md: XP 테이블(0/3/8/18), 세부 축(+5), 소셜(상한10), 보너스, 레벨 커브가 코드와 일치
□ RECOMMENDATION.md: 7종 알고리즘 조건이 코드와 일치
```

### 코드 vs pages/*.md

```
□ 01_SEARCH_REGISTER.md: 검색 UI + 등록 플로우
□ 02_RESTAURANT_DETAIL.md: L1~L9 레이어
□ 03_WINE_DETAIL.md: L1~L9 레이어
□ 04_RECORD_DETAIL.md: 기록 상세 전체
□ 05_RECORD_FLOW.md: 기록 입력 플로우 전체
□ 06_HOME.md: 홈 탭 + 뷰 + 필터 + 소팅 + 통계 + 추천 + 넛지
□ 07_DISCOVER.md: Discover 서브스크린
□ 08_BUBBLE.md: 버블 생성/가입/피드/랭킹/멤버/댓글/리액션
□ 09_NOTIFICATIONS.md: 알림 드롭다운
□ 10_PROFILE.md: 프로필 전체
□ 11_SETTINGS.md: 설정 전체
□ 12_ONBOARDING.md: 온보딩 5 스크린
```

### 코드 vs prototype/*.html

```
□ 00_onboarding.html: 온보딩 5 스크린 비주얼 일치
□ 01_home.html: 홈 레이아웃 비주얼 일치
□ 02_detail_restaurant.html: 식당 상세 비주얼 일치
□ 02_detail_wine.html: 와인 상세 비주얼 일치
□ 03_profile.html: 프로필 비주얼 일치
□ 04_bubbles.html: 버블 목록 비주얼 일치
□ 04_bubbles_detail.html: 버블 상세 비주얼 일치
□ 04_bubbler_profile.html: 버블러 프로필 비주얼 일치
□ 05_settings.html: 설정 비주얼 일치
□ 06_notifications.html: 알림 드롭다운 비주얼 일치
□ 00_design_system.html: 디자인 토큰 비주얼 일치
```

---

## 11. 최종 결과 요약

| 카테고리 | 항목 수 | 통과 | 실패 | 비고 |
|----------|---------|------|------|------|
| 빌드/린트/타입 | 5 | | | |
| R1~R5 | 5 | | | |
| DB (테이블+RLS+함수) | 3 | | | |
| 인증 | 6 | | | |
| 디자인 토큰 | 3 | | | |
| S2 기록 | 8 | | | |
| S3 검색 | 7 | | | |
| S4 상세 | 4 (식당+와인+기록+찜) | | | |
| S5 홈+추천 | 12 | | | |
| S6 XP+프로필+설정+알림 | 24 | | | |
| S7 버블 | 12 | | | |
| S8 통합 | 6 | | | |
| S9 온보딩+넛지 | 10 | | | |
| 성능 | 11 | | | |
| 모바일 360px | 14 | | | |
| 보안 | 8 | | | |
| SSOT 정합성 | 29 | | | |
| **합계** | **167** | | | |

---

## 12. 실패 시 대응

| 실패 유형 | 대응 |
|----------|------|
| 빌드/린트/타입 실패 | **즉시 수정** (다음 태스크 진행 금지) |
| R1~R5 위반 | **즉시 수정** (코드를 올바른 레이어로 이동) |
| DB 불일치 | **마이그레이션 추가** |
| 보안 위반 | **즉시 수정** (RLS 추가, 키 제거) |
| 성능 미달 | 9.4 최적화 반복 |
| SSOT 불일치 | **코드를 문서에 맞춤** (문서가 명백히 틀리면 사용자에게 확인) |
| 모바일 깨짐 | 해당 컴포넌트 수정 |
| 기능 미구현 | 해당 스프린트 태스크 보충 구현 |

---

## 완료 판정 기준

```
167개 항목 중 실패 0개 → 프로젝트 완료
실패 1개 이상 → 즉시 수정 → 재검증 → 0개까지 반복
```
