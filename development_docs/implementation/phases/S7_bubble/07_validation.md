# S7-T7: S7 검증

> S7 버블 시스템 전체 검증 + S1~S6 회귀 테스트.

---

## SSOT 출처

| 문서 | 역할 |
|------|------|
| `CLAUDE.md` 크리티컬 게이트 | 빌드/린트/타입/아키텍처/SSOT/목업/보안/모바일 |
| `systems/AUTH.md` §2, §4 | RLS 정책, 역할 권한 |
| `systems/DATA_MODEL.md` §4 | 소셜 테이블 정의 |
| `pages/08_BUBBLE.md` | 버블 전체 스펙 |

---

## 선행 조건

- T7.1~T7.6 모두 완료

---

## 구현 범위

S7 전체 기능 검증 + S1~S6 회귀. 코드 변경 없음, 검증만 수행.

### 스코프 외

- E2E 테스트 작성 (S9에서)
- 성능 최적화 (S9에서)

---

## 1. 크리티컬 게이트 (모두 통과 필수)

### 빌드/린트/타입

```bash
# 에러 없음 확인
pnpm build

# 경고 0개 확인
pnpm lint

# any / as any / @ts-ignore / ! 0개 확인
grep -r "as any\|@ts-ignore\|@ts-expect-error" src/ --include="*.ts" --include="*.tsx"
grep -rP "!(?===)" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test."
```

### Clean Architecture (R1~R5)

```bash
# R1: domain에 외부 의존 없음
grep -r "from 'react\|from '@supabase\|from 'next" src/domain/

# R2: infrastructure에 implements 키워드 존재
grep -rL "implements" src/infrastructure/repositories/

# R3: application은 domain 인터페이스에만 의존
grep -r "from '.*infrastructure" src/application/

# R4: presentation에서 Supabase/infrastructure 직접 import 없음
grep -r "from '@supabase\|from '.*infrastructure" src/presentation/

# R5: app/은 라우팅만 — page.tsx는 Container 렌더링만
# 수동 확인: src/app/(main)/bubbles/ 하위 page.tsx 파일들
# 실제 라우트: page.tsx, create/page.tsx, [id]/page.tsx, [id]/settings/page.tsx, invite/[code]/page.tsx
```

모든 명령의 결과가 **빈 출력** (R2 제외)이어야 통과. R2는 모든 repository 파일이 출력되면 실패 (implements 없는 파일이 있다는 뜻).

### SSOT 정합성

| 검증 항목 | SSOT 문서 | 확인 방법 |
|----------|----------|----------|
| Bubble 엔티티 필드 | DATA_MODEL.md bubbles 테이블 | 컬럼 1:1 대응 (createdBy nullable) |
| BubbleMember 엔티티 필드 | DATA_MODEL.md bubble_members 테이블 | 컬럼 1:1 대응 (shareRule 포함) |
| BubbleShare 엔티티 필드 | DATA_MODEL.md bubble_shares 테이블 | targetId/targetType 포함 |
| Comment 엔티티 필드 | DATA_MODEL.md comments 테이블 | 컬럼 1:1 대응 |
| Reaction 엔티티 필드 | DATA_MODEL.md reactions 테이블 | 컬럼 1:1 대응 (userId nullable) |
| BubbleRankingSnapshot 필드 | DATA_MODEL.md bubble_ranking_snapshots | 컬럼 1:1 대응 |
| BubbleShareRule | 030_bubble_share_rule.sql | share_rule JSONB, auto_synced 플래그 |
| 가입 정책 5종 | AUTH.md §2-3 | invite_only/closed/manual_approve/auto_approve/open |
| 역할 권한 매트릭스 | AUTH.md §2-1 | owner/admin/member/follower 권한 일치 |
| content_visibility 2종 | BUBBLE.md §4-5 | rating_only/rating_and_comment 동작 |
| 리액션 타입 5종 + REACTION_CONFIG | BUBBLE.md §9 | like/bookmark/want/check/fire + 아이콘/라벨/색상 중앙 관리 |
| 댓글 300자 제한 | BUBBLE.md §10 | VARCHAR(300) + 프론트 검증 |
| 소셜 XP 적립 | XP_SYSTEM.md §4-3 | share+1, like+1, follower+1, mutual+2, 일일 상한 10 |

### 목업 정합성

| 검증 항목 | 프로토타입 | 확인 방법 |
|----------|----------|----------|
| 버블 목록 카드 | `04_bubbles.html` | 40×40 아이콘, 이름, 메타, 역할 표시 |
| 버블 상세 히어로 | `04_bubbles_detail.html` | 52×52 아이콘, ℹ️/⚙️, 멤버/취향 뱃지 |
| 퀵 통계 4칩 | `04_bubbles_detail.html` | 총 기록/평균 점수/이번 주/고유 장소 |
| 피드 카드 | `04_bubbles_detail.html` | 사진 그리드, 점수 오버레이, 유저 행, 리액션 |
| 피드 컴팩트 | `04_bubbles_detail.html` | 42×42 점수 배지, 사진/댓글/리액션 숨김 |
| 랭킹 포디움 | `04_bubbles_detail.html` | 110/88/76px, 왕관/은/동 |
| 랭킹 리스트 | `04_bubbles_detail.html` | 순위+썸네일+이름+점수+변동 |
| 멤버 그리드 | `04_bubbles_detail.html` | 2열, 48×48 아바타, 일치도 바, 팔로우 |
| 설정 페이지 | `04_bubbles_detail.html` | 6그룹 (기본정보~위험영역) |
| 버블러 프로필 | `04_bubbler_profile.html` | 72×72 아바타, 컨텍스트 카드, 취향, Picks |

### 보안

```bash
# RLS 우회 없음
grep -r "SECURITY DEFINER" supabase/ --include="*.sql"
# → 0건이어야 통과

# 키 노출 없음 (클라이언트에서 SERVICE_ROLE_KEY 사용 확인)
grep -r "SUPABASE_SERVICE_ROLE_KEY\|service_role" src/ --include="*.ts" --include="*.tsx"
# → infrastructure/supabase/admin.ts 외에는 0건이어야 통과

# Edge Function만 SERVICE_ROLE_KEY 사용
grep -r "SUPABASE_SERVICE_ROLE_KEY" supabase/functions/ --include="*.ts"
# → 정상 (Edge Function에서는 허용)
```

### 모바일

```
□ 360px 뷰포트에서 모든 S7 페이지 레이아웃 깨짐 없음:
  □ /bubbles — 버블 카드 리스트
  □ /bubbles/create — 버블 생성 폼
  □ /bubbles/[id] — 히어로 + 탭
  □ /bubbles/[id] 피드 카드/컴팩트
  □ /bubbles/[id] 랭킹 포디움/리스트
  □ /bubbles/[id] 멤버 그리드 (2열 → 360px에서도 2열 유지)
  □ /bubbles/[id]/settings — 설정 페이지
  □ /bubbles/invite/[code] — 초대 링크 가입
  □ 가입 플로우 바텀 시트
  □ 댓글 시트
  □ 자동 공유 규칙 편집기
```

---

## 2. S7 기능별 검증

### 2-1. 버블 생성 (T7.2)

```
□ 이름 1~20자 입력 + 설명 0~100자
□ 아이콘 선택 (lucide) + 배경색
□ private 선택 → join_policy 자동 invite_only
□ public 선택 → 4종 정책 카드 표시
□ 생성 완료 → bubble_members에 owner 자동 등록
□ 생성 완료 → 초대 코드 생성
□ 생성 완료 → 버블 상세로 이동
□ XP: 첫 버블 생성 시 bonus_first_bubble +5
```

### 2-2. 가입 정책 5종 (T7.2)

```
□ invite_only: 초대 코드 없으면 가입 불가, 코드 있으면 즉시 가입
□ closed: "팔로우" 버튼만 표시, "가입" 불가, follower로 등록
□ manual_approve: "가입 신청" → pending → owner/admin이 승인/거절
  □ 승인 → status='active', 알림 (bubble_join_approved)
  □ 거절 → status='rejected', 재신청 차단
□ auto_approve:
  □ min_records + min_level 충족 → 즉시 active
  □ 미충족 → 에러 메시지 (미충족 사유)
□ open: 즉시 active (무조건)
□ max_members 초과 시 모든 정책에서 가입 차단
```

### 2-3. 초대 (T7.2)

```
□ 초대 링크 생성: 1일/7일/30일/무제한 만료
□ 초대 코드: 8자 랜덤 영숫자
□ 만료된 코드 → "만료된 초대 링크" 안내
□ 유효하지 않은 코드 → "유효하지 않은 링크" 안내
□ 유효한 코드 → 버블 미리보기 + "가입" CTA
```

### 2-4. 버블 상세 (T7.3)

```
□ 히어로: 52×52 아이콘 + 이름 + info(ℹ️) + settings(⚙️, owner만)
□ 퀵 통계 4칩 정확한 데이터
□ 스티키 탭: 피드/랭킹/멤버 전환
□ 각 탭 독립 필터/소팅/뷰모드
```

### 2-5. 피드 (T7.3)

```
□ 카드 뷰: 사진 그리드 + 점수 오버레이 + 유저 행 + 장소명 + 한줄평 + 리액션
□ 컴팩트 뷰: 42×42 점수 배지 + 장소명 (사진/한줄평/리액션 숨김)
□ 필터: 유형(전체/식당/와인), 멤버, 시기, 점수
□ 정렬: 최신순/반응순/점수순/멤버별
□ content_visibility 제한: 비멤버 제한된 데이터 표시
```

### 2-6. 랭킹 (T7.3 + T7.6)

```
□ 서브토글: 식당/와인 전환
□ 포디움: Top 3 (110/88/76px), 왕관/은/동 배지
□ 리스트: 4위~ (순위+썸네일+이름+점수+변동)
□ 변동 표시: ▲N(초록), ▼N(빨강), NEW(회색), ─(변동 없음)
□ 전체 기간: 실시간 쿼리 (delta 없음)
□ 이번 주/이번 달/3개월: 스냅샷 기반
```

### 2-7. 멤버 (T7.3)

```
□ 그리드 뷰: 2열, 48×48 아바타, 일치도 바, 미니 통계, 팔로우 버튼
□ 리스트 뷰: 36px 아바타 가로 배치
□ "나" 카드: 틸 테두리/배경 (is-me)
□ 필터: 역할/일치도/레벨/팔로우
□ 정렬: 일치도순/기록순/레벨순/최근 활동순
□ 클릭 → 버블러 프로필
```

### 2-8. 댓글 + 리액션 (T7.4)

```
□ want(bookmark-plus): --accent-food 색상, 토글
□ check(check-circle-2): --positive 색상, 토글
□ fire(flame): #E55A35, 토글
□ like(heart): --negative 색상, 토글
□ 중복 선택 가능 (want + fire 동시)
□ 각 타입별 카운트 정확
□ 내가 누른 것 활성 색상 강조
□ bookmark → wishlists INSERT (source='bubble')
□ like → 소셜 XP +1 (기록 작성자, 일일 상한 10)
□ 알림: reaction_like, comment_reply
□ 댓글 300자 제한 (UI + 서버)
□ 댓글 익명 토글
□ 댓글 본인만 삭제
□ allowComments=false → 댓글 입력 비활성화
□ 비멤버/follower → 리액션/댓글 비활성
```

### 2-9. 역할/권한 (T7.5)

```
□ owner: 모든 권한 O
□ admin: 기록공유/댓글/리액션/승인거절/초대 O, 설정/삭제/제거 X
□ member: 기록공유/리액션 O, 댓글 allowComments 따름
□ follower: 읽기만 (content_visibility 제한)
□ 비멤버: invite_only 접근 불가, 나머지 제한적 읽기
□ ⚙️ 버튼: owner에게만 표시
□ 역할 변경: owner → admin 승격, admin → member 강등
□ Owner 이전: admin에게만, 이중 확인
□ 멤버 제거: owner만, 확인 다이얼로그
□ 버블 삭제: 이름 입력 확인, CASCADE 삭제
```

### 2-10. 자동 공유 규칙

```
□ share_rule JSONB (030_bubble_share_rule.sql)
□ auto_synced 플래그 (bubble_shares 테이블)
□ bubble-share-sync.ts: evaluateShareRule, matchesShareRule, computeShareDiff
□ use-bubble-auto-sync.ts: 자동 동기화 hook
□ share-rule-editor.tsx: 규칙 편집 UI
□ batchUpsertAutoShares / batchDeleteAutoShares 동작
□ cleanManualShares 동작
```

### 2-11. 랭킹 크론 (T7.6)

```
□ Edge Function 파일 존재: supabase/functions/weekly-ranking-snapshot/index.ts
□ pg_cron 마이그레이션 존재 (019_ranking_cron.sql)
□ 스냅샷 생성: 정확한 데이터 (target별 avg_satisfaction + record_count + rank)
□ UPSERT: 재실행 안전
□ bubbles 주간 통계 갱신 (weekly/prev_weekly)
□ bubble_members.weekly_share_count 리셋
□ 에러 격리: 개별 버블 실패 시 계속 처리
□ SECURITY DEFINER 사용 안 함
```

---

## 3. RLS 정책 검증

### bubbles RLS

```
□ public 버블: 누구나 SELECT 가능
□ private 버블: 멤버만 SELECT 가능
  → 비멤버 접근 시 빈 결과 반환 (에러 아님)
```

### bubble_shares RLS

```
□ 버블 멤버만 공유 기록 SELECT 가능
□ INSERT: shared_by = auth.uid() + 본인 기록 + 해당 버블 멤버 + role IN (owner/admin/member)
□ INSERT: privacy_profile='private'이면 차단
□ follower는 공유 불가
```

### comments RLS

```
□ 버블 멤버만 (owner/admin/member) 댓글 읽기/쓰기
□ follower는 댓글 접근 불가
□ DELETE: 본인 댓글만 삭제 가능
```

### reactions RLS

```
□ 본인 리액션만 CRUD (user_id = auth.uid())
□ 버블 멤버십 검증은 application layer에서 처리
```

### 추가 마이그레이션

```
□ 006_social.sql — 소셜 테이블 기본 구조
□ 019_ranking_cron.sql — pg_cron 스케줄 등록
□ 025_bubble_owner_read_policy.sql — 버블 소유자 읽기 정책
□ 030_bubble_share_rule.sql — 자동 공유 규칙 (share_rule JSONB, auto_synced)
□ 033_bubble_member_read_rls.sql — 버블 멤버 읽기 RLS
```

---

## 4. S1~S6 회귀 테스트

### S1 Foundation

```
□ 인증 4종 (Google/카카오/네이버/Apple) 여전히 동작
□ 디자인 토큰 (CSS 변수) 깨지지 않음
□ DB 스키마 변경 없음 (S7 마이그레이션은 추가만)
```

### S2 Core Recording

```
□ 기록 생성 플로우 정상 (사분면 + 만족도 + 아로마)
□ DiningRecord 엔티티 변경 없음
□ record_photos 정상
```

### S3 Search

```
□ 카메라/검색/OCR 정상 동작
□ 식당/와인 등록 플로우 정상
```

### S4 Detail Pages

```
□ 식당/와인 상세 L1~L8 정상
□ 기록 상세 정상
□ 찜 CRUD 정상
```

### S5 Home

```
□ 앱 셸 + 탭 전환 정상
□ 4종 뷰 (상세/간단/캘린더) 정상
□ 필터/소팅 정상
□ 추천 기능 정상
□ FAB 동작 정상 (S7 버블 FAB 추가 후에도)
```

### S6 XP & Profile

```
□ XP 엔진 정상 (S7 소셜 XP 추가 후에도 기존 XP 계산 영향 없음)
□ 프로필 페이지 정상
□ 설정 페이지 정상
□ 알림 정상 (S7 알림 타입 추가 후에도)
□ 활성 XP 크론 정상
```

---

## 5. 스프린트 완료 절차

```
□ 이전 스프린트 기능 회귀 없음 (위 S1~S6 전부 통과)
□ DECISIONS_LOG.md에 S7 주요 결정 기록:
  - taste_match_pct 구현 방식 (RPC 온디맨드 vs 버블 평균)
  - 댓글 익명 옵션 범위
  - 랭킹 기준 (avg_satisfaction 우선 vs record_count 우선)
□ MASTER_TRACKER.md 갱신:
  - T7.1~T7.7 상태 → done
  - S7 상태 → completed
□ CURRENT_SPRINT.md 갱신:
  - S7 완료 기록
  - S8 프리뷰 (팔로우/맞팔 + L9 + 홈 소셜 탭 + 버블 공유 + 버블러 프로필)
```
