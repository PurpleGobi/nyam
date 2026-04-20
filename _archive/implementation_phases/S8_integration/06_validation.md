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
□ followRepo.follow() → follows 테이블 INSERT (status='accepted')
□ followRepo.unfollow() → follows 테이블 DELETE
□ A→B 팔로우 + B→A 팔로우 → isMutualFollow()=true
□ useFollow.toggleFollow() → accessLevel 상태 갱신
□ useSocialXp.awardSocialXp(userId, 'mutual') 맞팔 시 호출 확인
□ useSocialXp.awardSocialXp(userId, 'follow') 일방 시 호출 확인
□ privacy_profile='private' 유저 → follow() 에러 throw
□ getAccessLevel(FollowRepository) 반환값 검증:
  - 비로그인/null → 'none' (useFollow에서 처리)
  - 본인 → 'mutual'
  - 일방 팔로우 → 'follow'
  - 맞팔 → 'mutual'
  - 관계 없음 → 'none'
□ getAccessLevel(domain service) 순수 함수 검증:
  - (true, true) → 'mutual'
  - (true, false) → 'follow'
  - (false, *) → 'none'
□ FollowButton 3상태: none(accent-social)/follow(bg-section)/mutual(positive)
□ FollowButton 롱프레스(500ms) → 언팔 확인 시트
□ FollowButton isPrivate + none → 비활성 + title="비공개 프로필"
□ 맞팔 성립 → 양쪽에 follow_accepted 알림 (notificationRepo.createNotification)
□ 일방 팔로우 → 대상에게 follow_request 알림
```

### 3-2. 상세 페이지 L9 (8.2)

```
□ 식당 상세: L8 아래에 L9 버블 기록 섹션 표시
□ 와인 상세: L8 아래에 L9 버블 기록 섹션 표시 (accentType="wine")
□ BubbleFilterChips: "전체" + 소속 버블별 칩 (FilterChipGroup 사용)
□ 필터 칩 단일 선택 → 해당 버블 기록만 표시
□ 활성 칩: iconBgColor 배경 + 흰색 텍스트 + Check 아이콘
□ BubbleRecordCard: 아바타(40px) + 이름 + 레벨 뱃지 + MiniQuadrant + 점수
□ 점수 색상: getGaugeColor(satisfaction) 동적 적용
□ content_visibility='rating_only' + 비멤버 → 아바타+Lv+점수(+사분면)만
□ content_visibility='rating_and_comment' + 비멤버 → +한줄평
□ 멤버 → 모든 필드 (한줄평, 상황, 방문일) 표시
□ 최대 5개 + "더보기" 버튼
□ 기록 0개 → 빈 상태 (MessageCircle 28px + 메시지 + 부가 설명)
□ 카드 탭 → scale(0.985) 터치 피드백
□ BubbleExpandPanel: 버블별 평균 점수 확장 패널 동작
```

### 3-3. 홈 팔로잉 서브탭 (8.3)

```
□ "팔로잉" 필터칩 활성 → 피드 표시
□ 버블 소스 기록: 이름+점수만 (한줄평 숨김, sourceType='bubble')
□ 맞팔 소스 기록: 한줄평 포함 (sourceType='user')
□ FollowingSourceBadge: 버블(BubbleIcon+이름, accent-social) / 맞팔(아바타+이름, text-sub)
□ 소스 필터: 전체/버블/맞팔 (accent-social 활성, bg-card 비활성)
□ 정렬: createdAt DESC (시간순, 알고리즘 아님)
□ 빈 상태: Users 아이콘 40px + 메시지 + [버블 탐색하기] Link CTA
□ 버블 소스 → CTA "버블에 가입하면 더 볼 수 있어요"
□ 카드 탭 → onItemPress → 식당/와인 상세 이동
□ 식당 탭 + 와인 탭 모두 정상 동작 (targetType 분기)
□ totalCount 반영
□ 로딩 상태: skeleton 카드 3개
```

### 3-4. 기록→버블 공유 (8.4)

```
□ ShareToBubbleSheet: isOpen 시 렌더, 닫힘 시 null
□ BubbleSelectList: 소속 버블 전체 표시 (BubbleIcon 사용)
□ 이미 공유된 버블: "공유됨" 뱃지 + opacity: 0.4
□ 비활성 멤버십: Lock 아이콘 + blockReason 텍스트
□ 빈 상태: "가입한 버블이 없습니다"
□ 공유 → bubbleRepo.shareRecord 호출
□ 공유 → awardSocialXp(userId, 'share') 호출
□ 첫 공유 → awardBonus(userId, 'first_share') 호출
□ 공유 취소 → bubbleRepo.unshareRecord 호출
□ useShareRecord canShare 로직: isPrivateProfile → false
□ blockReason: "비공개 프로필은 공유할 수 없습니다" / "공유 가능한 버블이 없습니다"
□ 동반자(companions) 공유 데이터에 미포함 확인
□ 버블 간 격리: UNIQUE(record_id, bubble_id) 제약 동작
□ ShareListSheet: 식당/와인 탭 + 필터/소팅/검색 동작
□ ShareRuleEditor: all/filtered 모드 + ConditionFilterBar 연동
□ 공유 완료 토스트: "N개 버블에 공유했어요"
```

### 3-5. 버블러 프로필 (8.5)

```
□ /users/[id] 라우트 접근 가능
□ page.tsx: params/searchParams → Promise 타입, BubblerProfileContainer 렌더
□ bubble 쿼리 → 버블 컨텍스트 카드 표시 (mutual + bubbleContext 존재 시)
□ bubble 쿼리 없음 → 컨텍스트 카드 숨김
□ 접근 레벨 'none': Lv.N 유저 + 기록수만 표시
□ 접근 레벨 'follow': + 이름/핸들/태그/취향/활동/팔로워수/팔로잉수
□ 접근 레벨 'mutual': 전체 (picks, 기록, 취향비교 포함)
□ 본인 프로필: accessLevel=mutual, 팔로우 버튼/취향 비교 숨김
□ FollowButton 3상태 동작 (8.1 연동)
□ 취향 일치도: ≥3 겹치면 "N% + 진행 바"
□ 취향 일치도: <3 겹치면 "데이터 부족"
□ BubbleContextCard: 2×2 그리드 (순위/멤버십/일치도/같이 가본 곳)
□ 1위 카드: gradient 배경 + caution 색상
□ StickyTabs: 식당(food)/와인(wine) 전환
□ 탭 전환 → useBubblerProfile useEffect 재실행 → 데이터 재조회
□ TasteProfile: 카테고리 바(5개) + 점수 성향 척도 + 지역 태그
□ 점수 성향 라벨: getScoreTendencyLabel 함수 동작
□ PicksGrid: 가로 스크롤 82×82 카드 (최대 6개), 탭 → 상세 이동
□ PicksGrid 빈 상태: "아직 기록이 없어요"
□ RecentRecords: 3행, 44×44 썸네일, 점수 색상 accentType 분기
□ ActivitySection: 13×7 히트맵 + 요일 라벨 + 4단계 밀도
□ 스트릭 배너: Flame + caution + "N주 연속 기록 중!"
□ AppHeader + FabBack 정상 렌더
□ 레벨 뱃지 색상: getLevelColor(level) 동적
```

---

## 4. 프라이버시 횡단 검증

S8의 핵심은 **접근 제어의 일관성**이다. 아래 시나리오를 교차 검증한다.

### 4-1. privacy_profile 설정별 동작

| 설정값 | 팔로우 | 버블러 프로필 | 피드 노출 | 공유 |
|--------|--------|-------------|----------|------|
| `public` | 가능 | 접근 레벨에 따라 | O | O |
| `bubble_only` | 가능 | 접근 레벨에 따라 | 버블 내에서만 | O |
| `private` | **불가** (에러 throw) | 레벨+기록수만 | X | **불가** (canShare=false) |

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
□ 버블A(rating_only) 멤버가 식당X에 공유 → 비멤버는 식당X 상세 L9에서 점수+사분면만 봄
□ 버블B(rating_and_comment) 멤버가 식당X에 공유 → 비멤버는 L9에서 점수+사분면+한줄평 봄
□ 동일 식당에 두 버블 기록 → 버블별 필터 시 각각 visibility 규칙 적용
□ 홈 팔로잉 피드: 버블 소스 → 한줄평 숨김 (sourceType='bubble')
□ 홈 팔로잉 피드: 맞팔 소스 → 한줄평 표시 (sourceType='user')
```

---

## 5. 모바일 레이아웃 검증

```
□ 360px viewport:
  - 팔로우 버튼 터치 영역 적정
  - 버블 기록 카드 내용 잘림 없음
  - 팔로잉 피드 카드 레이아웃 정상
  - ShareToBubbleSheet 바텀 시트 정상 동작 (max-w-[480px])
  - 버블러 프로필 전체 섹션 스크롤 정상
  - picks 가로 스크롤 동작
  - 히트맵 13×7 그리드 셀(12px) 크기 적정
  - 버블 컨텍스트 2×2 그리드 깨짐 없음
  - ShareListSheet 전체 화면 시트 동작
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
□ 기록 상세 정상 (share-2 아이콘 → ShareToBubbleSheet 연결 확인)
□ 찜 CRUD 정상
```

### S5 Home

```
□ 홈 탭 전환 정상
□ 필터/소팅 정상
□ 뷰 사이클 (card/list/calendar) 정상
□ 저장 필터칩 행 정상 ("팔로잉" 칩 동작 확인)
□ FAB 동작 정상
□ 통계 패널 정상
```

### S6 XP & Profile

```
□ XP 획득 정상 (소셜 XP: useSocialXp awardSocialXp 호출)
□ 보너스 XP 정상 (useBonusXp awardBonus 호출)
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
□ 버블 멤버 탭 정상 (FollowButton 통합 확인)
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
