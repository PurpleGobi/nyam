# 1.7: S1 검증

> S1 전체 태스크(1.1~1.6)의 완료를 검증한다. 모든 항목을 통과해야 S1을 `done`으로 표시할 수 있다.

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `implementation/orchestration/REVIEW_LOOP.md` | §1 태스크 완료 검증, §4 크리티컬 게이트, §5 검증-수정 반복 루프 |
| `implementation/shared/TESTING_STRATEGY.md` | Level 1 빌드 검증, Level 2 수동 검증, S1 검증 시나리오 |
| `systems/DATA_MODEL.md` | 전체 테이블 정의 (25개 테이블) |
| `systems/AUTH.md` | §1 소셜 로그인, §4 RLS 정책, §6 보안 원칙 |
| `systems/DESIGN_SYSTEM.md` | §0 Brand, §1 컬러 토큰, §2 타이포그래피 |
| `CLAUDE.md` | Clean Architecture (R1~R5), 크리티컬 게이트, 금지 사항 |

## 선행 조건

- [ ] 1.1 프로젝트 초기화 완료
- [ ] 1.2 전체 DB 스키마 완료
- [ ] 1.3 RLS 정책 완료
- [ ] 1.4 소셜 인증 완료
- [ ] 1.5 디자인 토큰 완료
- [ ] 1.6 폴더 구조 + 레이아웃 완료

---

## 검증 항목

### 0. 이전 스프린트 회귀 테스트

S1이 첫 스프린트이므로 회귀 테스트 대상 없음.

### 1. 빌드 검증

#### 1-1. 프로덕션 빌드

```bash
pnpm build
```

**통과 조건**: 에러 0건. 경고는 허용하되, 빌드 실패는 즉시 수정한다.

#### 1-2. ESLint

```bash
pnpm lint
```

**통과 조건**: 경고 0건, 에러 0건.

#### 1-3. TypeScript strict 검증

```bash
# tsconfig.json에 strict: true 확인
grep '"strict": true' tsconfig.json
```

**통과 조건**: `"strict": true`가 출력된다.

```bash
# any 사용 검색
grep -rn "as any\|: any\|<any>" src/ --include="*.ts" --include="*.tsx"
```

**통과 조건**: 결과 0건.

```bash
# @ts-ignore, @ts-expect-error 사용 검색
grep -rn "@ts-ignore\|@ts-expect-error" src/ --include="*.ts" --include="*.tsx"
```

**통과 조건**: 결과 0건.

```bash
# ! (non-null assertion) 남용 검색
grep -rn "[a-zA-Z]\!" src/ --include="*.ts" --include="*.tsx" | grep -v "!=\|!=" | grep -v "\/\/" | grep -v "node_modules"
```

**통과 조건**: 정당한 사용(JSX `!important` 등)을 제외하고 0건. 의심 항목은 수동 확인한다.

---

### 2. 클린 아키텍처 검증 (R1~R5)

#### R1: domain은 외부 의존 0

```bash
grep -r "from 'react\|from '@supabase\|from 'next\|from 'swr\|from 'zod" src/domain/
```

**통과 조건**: 결과 0건. domain/ 내부에서 React, Supabase, Next.js, SWR, Zod 등 외부 라이브러리 import가 없어야 한다.

#### R2: infrastructure는 domain 인터페이스를 implements로 구현

```bash
# .gitkeep 외 파일이 있는 경우에만 검증
find src/infrastructure/repositories/ -name "*.ts" -not -name ".gitkeep" | head -1
```

S1에서는 infrastructure/repositories/에 `.gitkeep`만 존재하므로, 이 검증은 S2부터 적용된다. `.ts` 파일이 존재하는 경우:

```bash
grep -rL "implements" src/infrastructure/repositories/ --include="*.ts"
```

**통과 조건**: 결과 0건 (모든 `.ts` 파일에 `implements`가 있어야 함).

#### R3: application은 domain 인터페이스에만 의존

```bash
grep -r "from '.*infrastructure\|from '@/infrastructure" src/application/
```

**통과 조건**: 결과 0건.

#### R4: presentation에서 Supabase/infrastructure 직접 import 금지

```bash
grep -r "from '@supabase\|from '.*infrastructure\|from '@/infrastructure" src/presentation/
```

**통과 조건**: 결과 0건. 예외: `src/presentation/providers/auth-provider.tsx`는 `shared/di/container.ts` 경유로 R4 준수. grep 결과에 infrastructure 직접 import가 포함되면 안 됨. presentation 레이어에서 `@supabase/supabase-js` import는 타입 포함 전면 금지. 인증 관련 타입은 `domain/entities/auth.ts`의 `AuthUser`, `AuthSession`을 사용한다.

#### R5: app/ page.tsx는 Container 렌더링만

```bash
# app/ 내 page.tsx에서 supabase 직접 호출 검색
grep -rn "supabase\|createClient\|from '@/infrastructure\|from '@/application" src/app/ --include="page.tsx"
```

**통과 조건**: 결과 0건. page.tsx는 Container 컴포넌트를 렌더링하는 것만 허용한다. `src/app/page.tsx`는 존재하지 않으며, `src/app/(main)/page.tsx`가 홈 역할을 한다.

#### 폴더 구조 확인

```bash
ls -R src/
```

**통과 조건**: 아래 폴더가 모두 존재한다.

```
src/domain/entities/
src/domain/repositories/
src/domain/services/
src/infrastructure/repositories/
src/infrastructure/api/
src/infrastructure/storage/
src/infrastructure/supabase/
src/application/hooks/
src/presentation/components/
src/presentation/containers/
src/presentation/guards/
src/presentation/hooks/
src/presentation/providers/
src/shared/di/
src/shared/utils/
src/shared/types/
src/shared/constants/
src/app/(main)/
```

---

### 3. DB 스키마 검증

#### 3-1. 테이블 존재 확인

Supabase SQL Editor 또는 CLI에서 실행:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**통과 조건**: 아래 25개 테이블이 모두 존재한다.

| # | 테이블명 | 출처 (DATA_MODEL.md 섹션) |
|---|---------|--------------------------|
| 1 | `users` | §2 |
| 2 | `restaurants` | §2 |
| 3 | `wines` | §2 |
| 4 | `records` | §2 |
| 5 | `record_photos` | §2 |
| 6 | `wishlists` | §2 |
| 7 | `user_experiences` | §3 |
| 8 | `xp_histories` | §3 |
| 9 | `level_thresholds` | §3 |
| 10 | `milestones` | §3 |
| 11 | `user_milestones` | §3 |
| 12 | `bubbles` | §4 |
| 13 | `bubble_members` | §4 |
| 14 | `bubble_shares` | §4 |
| 15 | `comments` | §4 |
| 16 | `reactions` | §4 |
| 17 | `bubble_share_reads` | §4 |
| 18 | `bubble_ranking_snapshots` | §4 |
| 19 | `follows` | §4 |
| 20 | `notifications` | §4 |
| 21 | `nudge_history` | §5 |
| 22 | `nudge_fatigue` | §5 |
| 23 | `saved_filters` | §5-1 |
| 24 | `ai_recommendations` | §5-2 |
| 25 | `grape_variety_profiles` | §5-3 |

#### 3-2. 핵심 컬럼 존재 확인

```sql
-- users 테이블 핵심 컬럼
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;
```

**검증할 필수 컬럼** (users):

| 컬럼 | 타입 |
|------|------|
| `id` | uuid |
| `email` | text |
| `nickname` | character varying(20) |
| `handle` | character varying(20) |
| `avatar_url` | text |
| `avatar_color` | character varying(20) |
| `auth_provider` | character varying(20) |
| `auth_provider_id` | character varying(100) |
| `privacy_profile` | character varying(20) |
| `privacy_records` | character varying(20) |
| `visibility_public` | jsonb |
| `visibility_bubble` | jsonb |
| `total_xp` | integer |
| `active_xp` | integer |
| `record_count` | integer |
| `deleted_at` | timestamp with time zone |

```sql
-- records 테이블 핵심 컬럼
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'records' AND table_schema = 'public'
ORDER BY ordinal_position;
```

**검증할 필수 컬럼** (records):

| 컬럼 | 타입 |
|------|------|
| `id` | uuid |
| `user_id` | uuid |
| `target_id` | uuid |
| `target_type` | character varying(10) |
| `status` | character varying(10) |
| `axis_x` | numeric(5,2) |
| `axis_y` | numeric(5,2) |
| `satisfaction` | integer |
| `scene` | character varying(20) |
| `wine_status` | character varying(10) |
| `aroma_regions` | jsonb |
| `visit_date` | date |

#### 3-3. 인덱스 존재 확인

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**통과 조건**: DATA_MODEL.md에 정의된 인덱스가 모두 존재한다. 핵심 인덱스:

- `idx_restaurants_area`
- `idx_restaurants_location`
- `idx_records_user_type_date`
- `idx_records_target`
- `idx_bubble_members_active`
- `idx_bubble_members_user`
- `idx_bubble_shares_bubble`
- `idx_notifications_user`
- `idx_saved_filters_user`

#### 3-4. CHECK 제약조건 확인

```sql
SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'c' AND connamespace = 'public'::regnamespace;
```

**통과 조건**: 아래 제약조건이 존재한다.

- `chk_wine_fields` (records 테이블): 와인 전용 필드가 식당 기록에 저장되는 것을 방지
- `chk_restaurant_fields` (records 테이블): 식당 전용 필드가 와인 기록에 저장되는 것을 방지

#### 3-5. 트리거 존재 확인

```sql
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

**통과 조건**: DATA_MODEL.md §10에 정의된 트리거가 존재한다. 핵심 트리거:

- `users.record_count` 갱신 트리거 (records INSERT/DELETE 시)
- `bubbles.member_count` 갱신 트리거 (bubble_members INSERT/DELETE 시)
- `bubbles.record_count` 갱신 트리거 (bubble_shares INSERT/DELETE 시)

---

### 4. RLS 검증

#### 4-1. 모든 테이블 RLS 활성화 확인

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**통과 조건**: 모든 25개 테이블의 `rowsecurity` 값이 `true`이다.

#### 4-2. 비인증 접근 차단 테스트

Supabase 클라이언트를 `anon` 키로 접속하여 (로그인하지 않은 상태에서) 데이터 접근을 시도한다.

```typescript
// 브라우저 콘솔 또는 테스트 스크립트에서 실행
// Supabase anon 클라이언트 (로그인하지 않은 상태)

// 테스트 1: users 테이블 읽기
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('*')
  .limit(1)

// 테스트 2: records 테이블 읽기
const { data: records, error: recordsError } = await supabase
  .from('records')
  .select('*')
  .limit(1)

// 테스트 3: bubbles private 테이블 읽기
const { data: bubbles, error: bubblesError } = await supabase
  .from('bubbles')
  .select('*')
  .eq('visibility', 'private')
  .limit(1)

// 테스트 4: notifications 테이블 읽기
const { data: notifs, error: notifsError } = await supabase
  .from('notifications')
  .select('*')
  .limit(1)
```

**통과 조건**:

| 테스트 | 기대 결과 |
|--------|----------|
| users 읽기 (비인증) | `data`가 빈 배열 `[]` 또는 에러 |
| records 읽기 (비인증) | `data`가 빈 배열 `[]` 또는 에러 |
| private bubbles 읽기 (비인증) | `data`가 빈 배열 `[]` |
| notifications 읽기 (비인증) | `data`가 빈 배열 `[]` 또는 에러 |

#### 4-3. 인증된 사용자 — 자기 데이터 접근

소셜 로그인 후 세션이 있는 상태에서:

```typescript
// 자기 프로필 읽기
const { data: myProfile } = await supabase
  .from('users')
  .select('*')
  .eq('id', session.user.id)
  .single()
```

**통과 조건**: 자기 자신의 데이터가 정상 반환된다.

#### 4-4. 인증된 사용자 — 타인 데이터 차단

```typescript
// 다른 사용자의 private 기록 접근 시도
const { data: otherRecords } = await supabase
  .from('records')
  .select('*')
  .neq('user_id', session.user.id)
  .limit(5)
```

**통과 조건**: `privacy_records = 'shared_only'`이고 `privacy_profile != 'public'`인 사용자의 기록은 반환되지 않는다. (같은 버블이 아닌 한)

#### 4-5. RLS 정책 목록 확인

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**통과 조건**: AUTH.md §4에 정의된 RLS 정책이 모두 존재한다.

| 테이블 | 정책명 | 유형 |
|--------|--------|------|
| `users` | `users_own` | ALL |
| `users` | `users_public` | SELECT |
| `users` | `users_bubble` | SELECT |
| `records` | `records_own` | ALL |
| `records` | `records_public` | SELECT |
| `records` | `records_bubble_all` | SELECT |
| `records` | `records_bubble_shared` | SELECT |
| `bubbles` | `bubble_public` | SELECT |
| `bubbles` | `bubble_private` | SELECT |
| `bubble_shares` | `bubble_share_read` | SELECT |
| `bubble_shares` | `bubble_share_insert` | INSERT |
| `comments` | `comments_bubble` | ALL |
| `reactions` | `reactions_own` | ALL |
| `notifications` | `notif_own` | ALL |

---

### 5. 인증 검증

#### 5-1. 로그인 플로우 (4종)

각 소셜 프로바이더별로 로그인을 테스트한다.

| # | 프로바이더 | 테스트 절차 | 통과 조건 |
|---|-----------|-----------|----------|
| 1 | **Google** | 로그인 페이지 → Google 버튼 클릭 → Google 계정 선택 → 콜백 → 홈 | 세션 생성, users 테이블에 row 존재 |
| 2 | **카카오** | 로그인 페이지 → 카카오 버튼 클릭 → 카카오 계정 인증 → 콜백 → 홈 | 세션 생성, users 테이블에 row 존재 |
| 3 | **네이버** | 로그인 페이지 → 네이버 버튼 클릭 → 네이버 계정 인증 → 콜백 → 홈 | 세션 생성, users 테이블에 row 존재 |
| 4 | **Apple** | 로그인 페이지 → Apple 버튼 클릭 → Apple ID 인증 → 콜백 → 홈 | 세션 생성, users 테이블에 row 존재 |

> Apple 로그인은 iOS 실기기 또는 Safari에서만 테스트 가능. 개발 환경에서는 Supabase Dashboard의 Auth 섹션에서 프로바이더 설정 확인으로 대체할 수 있다.

#### 5-2. 로그아웃 플로우

```
로그아웃 실행 → 세션 파기 확인 → 로그인 페이지 리다이렉트
```

**통과 조건**: `supabase.auth.getSession()` 호출 시 세션이 null이다.

#### 5-3. users 테이블 자동 생성 확인

소셜 로그인 직후:

```sql
SELECT id, email, nickname, auth_provider, auth_provider_id, created_at
FROM users
ORDER BY created_at DESC
LIMIT 5;
```

**통과 조건**:

- 로그인한 계정에 해당하는 row가 존재한다
- `auth_provider`가 `'google'`, `'kakao'`, `'naver'`, `'apple'` 중 하나이다
- `auth_provider_id`가 소셜 계정의 고유 ID와 일치한다
- `nickname`이 소셜 계정의 이름으로 자동 설정되어 있다
- `privacy_profile`이 기본값 `'bubble_only'`이다
- `privacy_records`가 기본값 `'shared_only'`이다

#### 5-4. 중복 가입 차단

같은 소셜 계정으로 재로그인 시:

**통과 조건**: 새 row가 생성되지 않고, 기존 row의 세션이 갱신된다. `auth_provider_id` UNIQUE 제약조건에 의해 중복이 차단된다.

---

### 6. 디자인 토큰 검증

#### 6-1. CSS 변수 존재 확인

브라우저 DevTools (Elements → Computed Styles 또는 `:root` 검사)에서 아래 변수가 모두 존재하는지 확인한다.

**Surface**:

| 변수 | 기대값 |
|------|-------|
| `--bg` | `#F8F6F3` |
| `--bg-card` | `#FEFCFA` |
| `--bg-elevated` | `#FFFFFF` |
| `--bg-page` | `#EFECE7` |

**Text**:

| 변수 | 기대값 |
|------|-------|
| `--text` | `#3D3833` |
| `--text-sub` | `#8C8580` |
| `--text-hint` | `#B5AFA8` |

**Border**:

| 변수 | 기대값 |
|------|-------|
| `--border` | `#E8E4DF` |
| `--border-bold` | `#D4CFC8` |

**Accent — Restaurant**:

| 변수 | 기대값 |
|------|-------|
| `--accent-food` | `#C17B5E` |
| `--accent-food-light` | `#F5EDE8` |
| `--accent-food-dim` | `#E8D5CB` |

**Accent — Wine**:

| 변수 | 기대값 |
|------|-------|
| `--accent-wine` | `#8B7396` |
| `--accent-wine-light` | `#F0ECF3` |
| `--accent-wine-dim` | `#DDD5E3` |

**Accent — Social**:

| 변수 | 기대값 |
|------|-------|
| `--accent-social` | `#7A9BAE` |
| `--accent-social-light` | `#EDF2F5` |

**Semantic**:

| 변수 | 기대값 |
|------|-------|
| `--positive` | `#7EAE8B` |
| `--caution` | `#C9A96E` |
| `--negative` | `#B87272` |

**Brand**:

| 변수 | 기대값 |
|------|-------|
| `--brand` | `#FF6038` |

**Gauge** (만족도):

| 변수 | 기대값 |
|------|-------|
| `--gauge-1` | `#C4B5A8` |
| `--gauge-2` | `#B0ADA4` |
| `--gauge-3` | `#9FA5A3` |
| `--gauge-4` | `#889DAB` |
| `--gauge-5` | `#7A9BAE` |

**Scene** (상황 태그):

| 변수 | 기대값 |
|------|-------|
| `--scene-solo` | `#7A9BAE` |
| `--scene-romantic` | `#B8879B` |
| `--scene-friends` | `#7EAE8B` |
| `--scene-family` | `#C9A96E` |
| `--scene-business` | `#8B7396` |
| `--scene-drinks` | `#B87272` |

**Border Radius**:

| 변수 | 기대값 |
|------|-------|
| `--r-xs` | `6px` |
| `--r-sm` | `8px` |
| `--r-md` | `12px` |
| `--r-lg` | `16px` |
| `--r-xl` | `20px` |
| `--r-full` | `50px` |

**Shadow**:

| 변수 | 기대값 |
|------|-------|
| `--shadow-sm` | `0 1px 2px rgba(61,56,51,0.04)` |
| `--shadow-md` | `0 2px 8px rgba(61,56,51,0.06)` |
| `--shadow-lg` | `0 4px 20px rgba(61,56,51,0.08)` |
| `--shadow-sheet` | `0 -4px 24px rgba(61,56,51,0.1)` |

#### 6-2. 하드코딩 컬러 사용 금지 확인

```bash
# Tailwind 원색 클래스 사용 검색
grep -rn "bg-white\|bg-black\|text-white\|text-black\|bg-gray\|text-gray\|bg-red\|bg-blue\|bg-green" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v ".gitkeep"
```

**통과 조건**: 결과 0건. `text-white`는 버튼 텍스트 등에서 사용할 수 있으나, DESIGN_SYSTEM.md에 명시된 소셜 로그인 버튼(`text-[#fff]`) 이외에는 사용 금지이다. 의심 항목은 수동으로 DESIGN_SYSTEM.md와 대조한다.

```bash
# 직접 hex 값 사용 검색 (Tailwind arbitrary value)
grep -rn "bg-\[#\|text-\[#\|border-\[#" src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules"
```

**통과 조건**: DESIGN_SYSTEM.md에 명시적으로 정의된 소셜 로그인 버튼 색상(`#FEE500`, `#03C75A`, `#1D1D1F`)과 로고 그라데이션(`var(--brand)`, `var(--accent-wine)`) 이외에는 결과 0건이다.

#### 6-3. 폰트 적용 확인

브라우저 DevTools에서:

- `body` 요소의 `font-family`에 `Pretendard Variable`이 포함되어 있는지 확인
- 헤더 "nyam" 텍스트의 `font-family`에 `Comfortaa`가 포함되어 있는지 확인

---

### 7. 모바일 검증

#### 7-1. 360px 뷰포트 테스트

Chrome DevTools → Device Toolbar → 커스텀 해상도 `360 x 640` 설정.

**검증 항목**:

| 항목 | 통과 조건 |
|------|----------|
| 수평 스크롤 | 수평 스크롤바가 나타나지 않음 |
| 헤더 | "nyam" 로고가 잘리지 않고 가운데 정렬 |
| 콘텐츠 영역 | 좌우 16px 패딩이 적용되어 콘텐츠가 화면 끝에 닿지 않음 |
| 로그인 페이지 | 소셜 로그인 버튼 4개가 모두 보이고, 터치 가능 |
| 텍스트 | 텍스트가 잘리거나 겹치지 않음 |

#### 7-2. 터치 타겟 검증

모든 버튼, 링크, 아이콘 버튼의 크기가 최소 44x44px인지 확인한다.

```bash
# 44px 미만 크기의 인터랙티브 요소 검색 (수동 보완 필요)
grep -rn "h-\[.*px\]\|w-\[.*px\]\|h-[0-9]\b\|w-[0-9]\b" src/ --include="*.tsx" | grep -v "min-h\|min-w"
```

**통과 조건**: 인터랙티브 요소(button, a, role="button")에 대해 높이/너비 44px 미만 지정이 없다. DevTools에서 직접 측정하여 확인한다.

#### 7-3. viewport 메타 확인

```bash
grep -A3 "viewport" src/app/layout.tsx
```

**통과 조건**: 아래 설정이 포함되어 있다.

```
width: 'device-width'
initialScale: 1
maximumScale: 1
userScalable: false
```

---

### 8. 보안 검증

#### 8-1. SECURITY DEFINER 사용 금지

```bash
grep -ri "SECURITY DEFINER" supabase/migrations/ --include="*.sql"
```

**통과 조건**: 결과 0건.

#### 8-2. 클라이언트 키 노출 금지

```bash
# 서비스 롤 키가 클라이언트 코드에 노출되지 않는지 확인
grep -rn "SUPABASE_SERVICE_ROLE_KEY\|service_role" src/ --include="*.ts" --include="*.tsx" | grep -v "server.ts\|route.ts\|\.server\."
```

**통과 조건**: 서버 전용 파일(`server.ts`, `route.ts`, `.server.` 접미사) 이외에서 `SUPABASE_SERVICE_ROLE_KEY` 또는 `service_role` 참조가 없다.

```bash
# 외부 API 키가 클라이언트에 노출되지 않는지 확인
grep -rn "GOOGLE_API_KEY\|KAKAO_REST_API_KEY\|NAVER_CLIENT_SECRET\|GEMINI_API_KEY" src/ --include="*.tsx" --include="*.ts" | grep -v "route.ts\|server.ts\|edge-function"
```

**통과 조건**: 클라이언트 컴포넌트(`.tsx`)에서 외부 API 키 참조가 없다.

#### 8-3. .env.local이 .gitignore에 포함

```bash
grep ".env.local" .gitignore
```

**통과 조건**: `.env.local`이 `.gitignore`에 포함되어 있다.

```bash
# .env 파일이 Git에 커밋되지 않았는지 확인
git ls-files | grep ".env"
```

**통과 조건**: `.env.example`만 존재하고, `.env.local`, `.env.production` 등 실제 환경변수 파일은 없다.

#### 8-4. console.log 사용 금지

```bash
grep -rn "console\.log\|console\.warn\|console\.error\|console\.debug" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"
```

**통과 조건**: 결과 0건.

---

### 9. SSOT 정합성 검증

#### 9-1. 코드 ↔ DATA_MODEL.md 정합성

**검증 방법**: `supabase/migrations/` 내의 SQL 파일들이 DATA_MODEL.md의 테이블 정의와 일치하는지 대조한다.

| 대조 항목 | 확인 방법 |
|----------|----------|
| 테이블 수 | SQL의 `CREATE TABLE` 수 = 25 |
| 컬럼명과 타입 | SQL 컬럼 정의가 DATA_MODEL.md와 동일 |
| DEFAULT 값 | SQL DEFAULT가 DATA_MODEL.md 명세와 동일 |
| UNIQUE 제약 | SQL UNIQUE가 DATA_MODEL.md 명세와 동일 |
| FK 관계 | SQL REFERENCES가 DATA_MODEL.md §1 관계도와 일치 |
| CHECK 제약 | `chk_wine_fields`, `chk_restaurant_fields` 존재 |
| 인덱스 | SQL CREATE INDEX가 DATA_MODEL.md 명세와 동일 |

```bash
# 마이그레이션 파일에서 CREATE TABLE 수 확인
grep -c "CREATE TABLE" supabase/migrations/*.sql | tail -1
```

**통과 조건**: 총 CREATE TABLE 수가 25개이다.

#### 9-2. 코드 ↔ AUTH.md 정합성

| 대조 항목 | 확인 방법 |
|----------|----------|
| 소셜 프로바이더 4종 | Google, 카카오, 네이버, Apple 모두 구현 |
| RLS 정책 | AUTH.md §4의 모든 정책이 마이그레이션에 포함 |
| 가입 시 users 자동 생성 | 트리거 또는 Supabase Auth hook 구현 확인 |
| 프라이버시 기본값 | `privacy_profile = 'bubble_only'`, `privacy_records = 'shared_only'` |

#### 9-3. 코드 ↔ DESIGN_SYSTEM.md 정합성

| 대조 항목 | 확인 방법 |
|----------|----------|
| 로고 그라데이션 (라이트) | `#FF6038` → `#8B7396` (DESIGN_SYSTEM.md §0) |
| 로고 폰트/크기/weight | Comfortaa, 22px, 700, -0.5px (§0 앱 헤더) |
| 본문 폰트 | Pretendard Variable (§2) |
| 배경색 | `--bg: #F8F6F3` (§1 Surface) |
| 텍스트 색상 | `--text: #3D3833` (§1 Text) |
| 모든 CSS 변수 | §1 전체 컬러 토큰이 globals.css에 정의됨 |

---

## 검증-수정 반복 루프

REVIEW_LOOP.md §5에 따라 아래 루프를 문제 0건이 될 때까지 반복한다. 최대 10회.

```
[회차 N] 위 검증 항목 1~9 전체 실행
  │
  ├── 문제 발견 시:
  │   ├── 빌드/타입 에러 → 즉시 수정
  │   ├── 테이블/컬럼 누락 → 마이그레이션 추가
  │   ├── RLS 정책 누락 → 마이그레이션 추가
  │   ├── 레이어 위반 → 코드를 올바른 레이어로 이동
  │   ├── SSOT 불일치 → 코드를 문서에 맞춤
  │   ├── 보안 이슈 → 즉시 수정 (최우선)
  │   └── 디자인 토큰 누락 → globals.css에 추가
  │
  ├── → 다음 회차에서 처음부터 전체 재검토 (이전 통과 항목도 다시 실행)
  │
  ├── 문제 0건 → 루프 종료
  └── 10회 도달 → 사용자에게 잔여 이슈 목록 보고
```

---

## 완료 기준

모든 항목 통과 시:

1. `MASTER_TRACKER.md`에서 S1 상태를 `done`으로 변경
2. `CURRENT_SPRINT.md`에 S1 완료 기록 + S2 프리뷰 작성
3. `DECISIONS_LOG.md`에 S1 중 내린 주요 결정 기록

```
□ 1. 빌드 검증 — pnpm build 성공, pnpm lint 경고 0개, TypeScript strict
□ 2. 클린 아키텍처 — R1~R5 전체 통과
□ 3. DB 스키마 — 25개 테이블 전체 존재, 컬럼/인덱스/제약조건 일치
□ 4. RLS — 전체 테이블 활성화, 비인증 차단, 교차 접근 차단
□ 5. 인증 — 4종 로그인/로그아웃, users 자동 생성, 중복 차단
□ 6. 디자인 토큰 — 전체 CSS 변수 존재, 하드코딩 0건
□ 7. 모바일 — 360px 깨짐 없음, 터치 타겟 44px, viewport 설정
□ 8. 보안 — SECURITY DEFINER 0건, 키 노출 0건, .env 보호
□ 9. SSOT 정합성 — DATA_MODEL + AUTH + DESIGN_SYSTEM 일치
```
