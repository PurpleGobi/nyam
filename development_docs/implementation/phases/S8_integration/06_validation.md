# 8.6: S8 검증 — Social Integration & Follow

> S8 전체 기능 검증 + S1~S7 회귀 테스트. 팔로우 접근 제어, 버블 기록 가시성, 프라이버시 설정이 시스템 전반에 걸쳐 일관되게 동작하는지 확인한다.

---

## SSOT 출처

| 문서 | 역할 |
|------|------|
| `CLAUDE.md` | 크리티컬 게이트 정의, R1~R5 검증 명령 |
| `implementation/orchestration/REVIEW_LOOP.md` | 스프린트 검증 프로세스 |
| S8 전체 태스크 문서 | 01~05 각 검증 체크리스트 |

---

## 선행 조건

- 8.1~8.5 모든 태스크 완료

---

## 구현 범위

이 태스크는 코드 작성이 아닌 **검증 실행**이다. 아래 체크리스트를 순서대로 실행하고, 실패 항목은 즉시 수정한다.

### 스코프 외

- 성능 최적화 (S9에서 처리)
- E2E 테스트 작성 (S9에서 처리)

---

## 1. 빌드 & 린트 게이트

```bash
# 빌드 에러 없음
pnpm build

# 린트 경고 0개
pnpm lint

# TypeScript 위반 0개
grep -r "as any\|@ts-ignore\|@ts-expect-error" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".d.ts"

# ! 단언 검사 (허용된 곳 외)
grep -rn "\!\\." src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "test" | grep -v ".d.ts"
```

**실패 시**: 즉시 수정. 다음 검증으로 넘어가지 않는다.

---

## 2. Clean Architecture R1~R5 검증

```bash
# R1: domain에 외부 의존 0
grep -r "from 'react'\|from '@supabase'\|from 'next'" src/domain/ --include="*.ts"
# 결과: 0건이어야 함

# R2: infrastructure가 domain 인터페이스를 implements
grep -rL "implements" src/infrastructure/repositories/ --include="*.ts"
# 결과: 0건이어야 함 (모든 파일에 implements 존재)

# R3: application이 infrastructure에 직접 의존하지 않음
grep -r "from '.*infrastructure" src/application/ --include="*.ts" --include="*.tsx"
# 결과: 0건이어야 함

# R4: presentation이 Supabase/infrastructure에 직접 의존하지 않음
grep -r "from '@supabase'\|from '.*infrastructure" src/presentation/ --include="*.ts" --include="*.tsx"
# 결과: 0건이어야 함

# R5: app/은 라우팅만 (page.tsx는 Container 렌더링만)
# 수동 확인: src/app/(main)/users/[id]/page.tsx → BubblerProfileContainer만 렌더
```

**실패 시**: 해당 import를 올바른 레이어로 이동. shared/di 경유로 변경.

---

## 3. S8 기능 검증

### 3-1. 팔로우/맞팔로우 (8.1)

```
□ 팔로우 요청 → follows 테이블 INSERT (status='accepted')
□ 팔로우 취소 → follows 테이블 DELETE
□ A→B 팔로우 + B→A 팔로우 → 양쪽 모두 isMutual=true
□ 팔로우 시 users.follower_count/following_count 트리거 갱신
□ 팔로우 요청 알림: follow_request INSERT (수신자=대상)
□ 팔로우 수락 알림: follow_accepted INSERT (수신자=요청자)
□ 맞팔 시 양쪽 XP +2 (social_mutual)
□ 팔로워 획득 시 XP +1 (social_follow)
□ 소셜 XP 일일 상한 10 XP 적용
□ privacy_profile='private' 유저 → 팔로우 불가 (에러 또는 비활성)
□ getAccessLevel 반환값 검증:
  - 비로그인 → 'none'
  - 본인 → 'mutual'
  - 일방 팔로우 → 'follow'
  - 맞팔 → 'mutual'
  - 관계 없음 → 'none'
□ 팔로우 버튼 3상태 렌더링: 팔로우(outline) / 팔로잉(bg-section) / 맞팔로우(positive)
□ 팔로우 버튼 롱프레스 → 언팔 확인 시트
```

### 3-2. 상세 페이지 L9 (8.2)

```
□ 식당 상세: L8 아래에 L9 버블 기록 섹션 표시
□ 와인 상세: L8 아래에 L9 버블 기록 섹션 표시 (accent-wine)
□ 필터 칩: "전체" + 소속 버블별 칩 렌더
□ 필터 칩 단일 선택 → 해당 버블 기록만 표시
□ 활성 칩 색상: 식당=accent-food-light, 와인=accent-wine-light
□ 버블 기록 카드: 아바타(32px) + 이름 + 레벨 뱃지 + 버블명 + 점수 + 한줄평
□ content_visibility='rating_only' + 비멤버 → 아바타+Lv+점수만
□ content_visibility='rating_and_comment' + 비멤버 → +한줄평
□ 멤버 → 모든 필드 표시
□ 최대 5개 + "더보기" 링크
□ 기록 0개 → 빈 상태 ("아직 버블 기록이 없어요")
□ 카드 탭 → scale(0.98) 터치 피드백
```

### 3-3. 홈 팔로잉 서브탭 (8.3)

```
□ "팔로잉" 필터칩 활성 → 피드 표시
□ 버블 팔로우 기록: 이름+점수+지역만 (한줄평/사진 숨김)
□ 맞팔 기록: 풀 액세스 (한줄평 포함)
□ 소스 배지 구분: 버블(아이콘+이름) / 맞팔(아바타+이름)
□ 소스 필터: 전체/버블/맞팔 동작
□ 정렬: 시간순 (최신 먼저, 알고리즘 아님)
□ 빈 상태: "팔로우하는 버블이 없거나 맞팔 친구가 없어요" + CTA
□ 버블 소스 → CTA "버블에 가입하면 더 볼 수 있어요"
□ 카드 탭 → 식당/와인 상세 이동
□ 식당 탭 + 와인 탭 모두 정상 동작
□ 칩 카운트 "팔로잉 N" 반영
```

### 3-4. 기록→버블 공유 (8.4)

```
□ 방법 1: 기록 성공 후 pref_bubble_share='ask' → 시트 표시
□ 방법 1: pref_bubble_share='auto' → 자동 공유
□ 방법 1: pref_bubble_share='never' → 시트 미표시
□ 방법 2: 기록 상세 share-2 아이콘 → 시트 열림
□ 시트: 소속 버블 전체 표시 (owner/admin/member, active)
□ 이미 공유된 버블: "공유됨" 뱃지 + 체크박스 비활성
□ 공유 → bubble_shares INSERT
□ 공유 → XP social_share +1
□ 공유 취소 → bubble_shares DELETE
□ 공유 취소 → 고아 댓글 유지 (comments 삭제 안 됨)
□ 동반자(companions) 공유 데이터에 미포함 확인
□ 가격(price_total) 버블 내에서만 조회 가능 확인
□ 버블 간 격리: 버블X에 공유 → 버블Y에서 미노출
□ privacy_profile='private' → 공유 불가 토스트
```

### 3-5. 버블러 프로필 (8.5)

```
□ /users/[id] 라우트 접근 가능
□ from=bubble 쿼리 → 버블 컨텍스트 카드 표시
□ from 없음 → 컨텍스트 카드 숨김
□ 접근 레벨 'none': 레벨+기록수만
□ 접근 레벨 'follow': + 이름/태그/취향/활동
□ 접근 레벨 'mutual': 전체 (picks, 기록 포함)
□ 팔로우 버튼 3상태 동작 (8.1 연동)
□ 취향 일치도: ≥3 겹치면 "N% (X/Y곳 일치)"
□ 취향 일치도: <3 겹치면 "데이터 부족"
□ 스티키 탭: 식당(accent-food) / 와인(accent-wine)
□ 탭 전환 → 취향/picks/records 데이터 교체
□ picks: 82×82 가로 스크롤, 탭 → 상세 이동
□ 최근 기록: 3행, 점수 색상 식당/와인 분기
□ 히트맵: 13×7 그리드, 4단계 밀도 색상
□ 연속 기록 배너: flame + caution 색상
□ 헤더 뒤로가기: from=bubble → 버블명, 기타 → "뒤로"
```

---

## 4. 프라이버시 횡단 검증

S8의 핵심은 **접근 제어의 일관성**이다. 아래 시나리오를 교차 검증한다.

### 4-1. privacy_profile 설정별 동작

| 설정값 | 팔로우 | 버블러 프로필 | 피드 노출 | 공유 |
|--------|--------|-------------|----------|------|
| `public` | 가능 | 접근 레벨에 따라 | O | O |
| `bubble_only` | 가능 | 접근 레벨에 따라 | 버블 내에서만 | O |
| `private` | **불가** | 레벨+카운트만 | X | **불가** |

### 4-2. companions 절대 비공개 확인

```
□ 기록 상세 (본인): companions 표시
□ 기록 상세 (타인): companions 미표시
□ 버블 피드: companions 미표시
□ 홈 팔로잉 피드: companions 미표시
□ 버블러 프로필 최근 기록: companions 미표시
□ API 응답에서 companions 필드 제외 확인 (타인 조회 시)
```

### 4-3. content_visibility 교차 확인

```
□ 버블A(rating_only) 멤버가 식당X에 공유 → 비멤버는 식당X 상세 L9에서 점수만 봄
□ 버블B(rating_and_comment) 멤버가 식당X에 공유 → 비멤버는 L9에서 점수+한줄평 봄
□ 동일 식당에 두 버블 기록 → 버블별 필터 시 각각 visibility 규칙 적용
□ 홈 팔로잉 피드: 버블 팔로워 → 이름+점수만 (content_visibility 무관, 팔로워 접근 제한)
```

---

## 5. 모바일 레이아웃 검증

```
□ 360px viewport:
  - 팔로우 버튼 터치 영역 ≥ 44×44px
  - 버블 기록 카드 내용 잘림 없음
  - 팔로잉 피드 카드 레이아웃 정상
  - 공유 시트 바텀 시트 정상 동작
  - 버블러 프로필 전체 섹션 스크롤 정상
  - picks 가로 스크롤 동작
  - 히트맵 13×7 그리드 셀 크기 적정
  - 버블 컨텍스트 2×2 그리드 깨짐 없음
```

---

## 6. S1~S7 회귀 검증

### S1 Foundation

```
□ 인증 4종 로그인/로그아웃 정상
□ RLS 정책 위반 없음 (follows 테이블 포함)
□ 디자인 토큰 일관성 (S8 컴포넌트에서 하드코딩 없음)
```

### S2 Core Recording

```
□ 기록 생성 플로우 정상 (사분면, 만족도, 아로마)
□ 기록 수정/삭제 정상
```

### S3 Search

```
□ 카메라/검색/OCR 정상
□ 식당/와인 등록 정상
```

### S4 Detail Pages

```
□ 식당 상세 L1~L8 정상 (L9 추가로 인한 레이아웃 깨짐 없음)
□ 와인 상세 L1~L8 정상
□ 기록 상세 정상 (share-2 아이콘 추가 확인)
□ 찜 CRUD 정상
```

### S5 Home

```
□ 홈 탭 전환 정상
□ 필터/소팅 정상
□ 뷰 사이클 (card/list/calendar) 정상
□ 저장 필터칩 행 정상 ("팔로잉" 칩 추가 확인)
□ FAB 동작 정상
□ 통계 패널 정상
```

### S6 XP & Profile

```
□ XP 획득 정상 (소셜 XP 추가: social_follow, social_mutual, social_share)
□ 레벨업 알림 정상
□ 프로필 페이지 정상
□ 설정 페이지 정상 (프라이버시 설정 연동 확인)
□ 알림 드롭다운 정상 (follow_request, follow_accepted 표시 확인)
```

### S7 Bubble

```
□ 버블 생성/가입/초대 정상
□ 버블 피드 정상 (공유된 기록 표시)
□ 버블 랭킹 정상
□ 버블 멤버 탭 정상 (팔로우 버튼 통합 확인)
□ 댓글/리액션 정상
□ 역할별 권한 정상
```

---

## 7. 최종 게이트

```bash
# 전체 빌드
pnpm build

# 전체 린트
pnpm lint

# TypeScript strict 위반
grep -rn "as any\|@ts-ignore\|@ts-expect-error" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# console.log 잔존
grep -rn "console\\.log" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# 하드코딩된 색상
grep -rn "bg-white\|bg-black\|text-white\|text-black" src/ --include="*.tsx" | grep -v node_modules | grep -v "// allowed"
```

---

## 검증 완료 기준

아래 **모두 통과** 시 S8 완료:

```
□ pnpm build 에러 0개
□ pnpm lint 경고 0개
□ any / @ts-ignore / ! 0개
□ R1~R5 위반 0건
□ S8 기능 검증 (3-1~3-5) 전체 통과
□ 프라이버시 횡단 검증 (4-1~4-3) 전체 통과
□ companions 절대 비공개 확인
□ 360px 모바일 레이아웃 정상
□ S1~S7 회귀 없음
□ console.log 0개
□ 하드코딩된 색상 0개
□ MASTER_TRACKER 갱신 (S8 → done)
□ DECISIONS_LOG에 주요 결정 기록
```
