# S6-T5: Sprint 6 검증

> 대상: S6-T1(XP 엔진), S6-T2(프로필), S6-T3(설정), S6-T4(알림)
> 선행: S6-T1~T4 전체 완료
> 기준: CLAUDE.md 크리티컬 게이트 + S6 고유 검증

---

## 1. XP 계산 정확성 검증

### 1-1. 기록 XP 공식 (calculateRecordXp)

| 테스트 케이스 | 입력 | 기대 XP | 기대 reason |
|-------------|------|---------|-------------|
| 이름만 등록 | `{ satisfaction: null, hasExifGps: false, comment: null, menuTags: [] }` | `0` | `record_name` |
| 점수만 | `{ satisfaction: 85, hasExifGps: false, comment: null, menuTags: [] }` | `3` | `record_score` |
| 점수 + 사진 (EXIF) | `{ satisfaction: 85, hasExifGps: true, isExifVerified: true, comment: null, menuTags: [] }` | `8` | `record_photo` |
| 풀 기록 | `{ satisfaction: 85, hasExifGps: true, isExifVerified: true, comment: '맛있다', menuTags: ['오마카세'] }` | `18` | `record_full` |
| 점수 없이 사진만 | `{ satisfaction: null, hasExifGps: true, comment: null, menuTags: [] }` | `0` | `record_name` |
| 점수 + 사진 없이 코멘트만 | `{ satisfaction: 85, hasExifGps: false, comment: '좋았다', menuTags: ['파스타'] }` | `3` | `record_score` |

### 1-2. 세부 축 XP (calculateDetailAxisXp)

| 테스트 | targetType | area | genre | wineRegion | wineVariety | 기대 결과 |
|--------|-----------|------|-------|------------|-------------|----------|
| 식당 기록 (둘 다 있음) | `restaurant` | `을지로` | `일식` | — | — | `[{area,'을지로',5}, {genre,'일식',5}]` |
| 식당 기록 (area만) | `restaurant` | `강남` | `null` | — | — | `[{area,'강남',5}]` |
| 와인 기록 | `wine` | — | — | `Bordeaux` | `Cabernet Sauvignon` | `[{wine_region,'Bordeaux',5}, {wine_variety,'Cabernet Sauvignon',5}]` |
| 와인 기록 (품종 없음) | `wine` | — | — | `Champagne` | `null` | `[{wine_region,'Champagne',5}]` |

### 1-3. 소셜 XP (calculateSocialXp)

| 테스트 | action | dailyTotal | 기대 XP |
|--------|--------|-----------|---------|
| 일반 share | `share` | `0` | `1` |
| 일반 mutual | `mutual` | `5` | `2` |
| 상한 근접 (total=9) + share | `share` | `9` | `1` |
| 상한 근접 (total=9) + mutual | `mutual` | `9` | `1` (잔여분만) |
| 상한 초과 (total=10) | `share` | `10` | `0` |
| 상한 초과 (total=11) | `follow` | `11` | `0` |

### 1-4. 어뷰징 방지

| 테스트 | 함수 | 입력 | 기대 결과 |
|--------|------|------|----------|
| 일일 기록 19개 | `isDailyRecordCapReached` | `19` | `false` |
| 일일 기록 20개 | `isDailyRecordCapReached` | `20` | `true` |
| 일일 기록 21개 | `isDailyRecordCapReached` | `21` | `true` |
| 같은 식당 1개월 전 | `isDuplicateScoreBlocked` | 1개월 전 날짜 | `true` |
| 같은 식당 7개월 전 | `isDuplicateScoreBlocked` | 7개월 전 날짜 | `false` |
| 같은 식당 처음 | `isDuplicateScoreBlocked` | `null` | `false` |
| 정확히 6개월 전 | `isDuplicateScoreBlocked` | 6개월 전 날짜 | `false` |

---

## 2. 레벨 산출 검증

### 2-1. getLevel 함수

| 입력 XP | 기대 레벨 | 기대 칭호 | 기대 색상 |
|---------|----------|----------|----------|
| `0` | `1` | `입문자` | `#7EAE8B` |
| `3` | `2` | `입문자` | `#7EAE8B` |
| `4` | `2` | `입문자` | `#7EAE8B` |
| `25` | `6` | `탐식가` | `#8B7396` |
| `50` | `8` | `미식가` | `#C17B5E` |
| `100` | `12` | `식도락 마스터` | `#C9A96E` |
| `500` | `30` | `식도락 마스터` | `#C9A96E` |
| `3700` | `62` | `식도락 마스터` | `#C9A96E` |
| `7500` | `72` | `식도락 마스터` | `#C9A96E` |
| `100000` | `99` | `식도락 마스터` | `#C9A96E` |

### 2-2. 레벨 커브 앵커 검증

`generateLevelThresholds()` 출력에서 14개 앵커 포인트가 정확히 일치하는지 검증:

```typescript
const thresholds = generateLevelThresholds();
expect(thresholds.find(t => t.level === 1)?.requiredXp).toBe(0);
expect(thresholds.find(t => t.level === 2)?.requiredXp).toBe(3);
expect(thresholds.find(t => t.level === 6)?.requiredXp).toBe(25);
expect(thresholds.find(t => t.level === 8)?.requiredXp).toBe(50);
expect(thresholds.find(t => t.level === 12)?.requiredXp).toBe(100);
expect(thresholds.find(t => t.level === 18)?.requiredXp).toBe(200);
expect(thresholds.find(t => t.level === 30)?.requiredXp).toBe(500);
expect(thresholds.find(t => t.level === 62)?.requiredXp).toBe(3700);
expect(thresholds.find(t => t.level === 72)?.requiredXp).toBe(7500);
expect(thresholds.find(t => t.level === 78)?.requiredXp).toBe(12000);
expect(thresholds.find(t => t.level === 81)?.requiredXp).toBe(16000);
expect(thresholds.find(t => t.level === 85)?.requiredXp).toBe(25000);
expect(thresholds.find(t => t.level === 92)?.requiredXp).toBe(50000);
expect(thresholds.find(t => t.level === 99)?.requiredXp).toBe(100000);
```

### 2-3. 레벨업 이벤트 트리거

| 시나리오 | 이전 XP | XP 추가 | 기대 레벨 변화 | 알림 생성 |
|----------|---------|---------|--------------|----------|
| Lv.1→Lv.2 | `0` | `+3` | `1 → 2` | O (level_up) |
| Lv.2 내 (추가) | `3` | `+3` | `2 → 2` | X |
| Lv.5→Lv.6 (칭호 변경) | 앵커 직전 | 앵커 도달분 | `5 → 6` | O |
| 세부 축 레벨업 | — | `+5` | 축 레벨 변경 | O (축 이름 포함) |
| 카테고리 레벨업 | — | 합산분 | 카테고리 레벨 변경 | O |

---

## 3. 활성 XP 크론 검증

| 테스트 | 조건 | 기대 결과 |
|--------|------|----------|
| 정상 유저 | 최근 6개월 기록 XP 합산 = 500 | `active_xp = 500` |
| 7개월 전 기록만 | 최근 6개월 기록 0 | `active_xp = 0` |
| 혼합 | 최근 3개월 300 + 8개월 전 200 | `active_xp = 300` |
| EXIF 검증 기록 | 최근 6개월 검증 기록 5개 | `active_verified = 5` |
| 소셜/보너스 XP | 최근 6개월 소셜 XP 50 | `active_xp`에 **미포함** (기록 XP만) |

---

## 4. 프로필 렌더링 검증

### 4-1. 프로필 헤더 (§2)

| 항목 | 검증 내용 |
|------|----------|
| 아바타 | 64px 원형, avatarColor 그라디언트 배경, 이니셜 표시 |
| 레벨 뱃지 | 아바타 우하단, `Lv.N`, 레벨 색상 적용 |
| 닉네임 | 15px bold, 중앙 정렬 |
| 핸들 | `@handle_name`, 11px hint 색상 |
| 미식 정체성 카드 | 이탤릭 텍스트, 3줄 clamp, 키워드 bold, 태그 pills |
| 공유 버튼 | 탭 → `/profile/wrapped` 이동 |

### 4-2. 활동 요약 (§3)

| 항목 | 검증 내용 |
|------|----------|
| 총 레벨 카드 | 그라디언트 bg, award 아이콘, XP 수치, 진행바 |
| 2×2 그리드 | 식당/와인/평균점수/이번달XP, 트렌드 표시 |
| 히트맵 | 13×7 그리드, 셀 강도 l1~l4, 통계 3개 (총기록/연속/기간) |
| 최근 XP | 4~5개, 아이콘/색상 매핑, +XP 수치 |

### 4-3. 세부 통계 탭 (§4~§7)

| 항목 | 검증 내용 |
|------|----------|
| sticky 탭 | 스크롤 시 상단 고정, glassmorphism blur |
| 식당 탭 active | primary 하단 라인 |
| 와인 탭 active | wine 하단 라인 |
| 요약 3카드 | 올바른 값, 트렌드 |
| 미니탭 | [지역\|장르] / [산지\|품종] 전환 |
| 레벨 리스트 | max-height 340px, 내부 스크롤, 레벨 색상 뱃지 |
| 레벨 리스트 아이템 탭 | → LevelDetailSheet 바텀시트 오픈 |
| 바텀시트 | 진행바, 통계 3열, XP 구성 5항목, 다음 마일스톤 |
| 식당 지도 | SVG 마커, 크기 비례, 범례 |
| 와인 산지 지도 | Level 0→1→2 드릴다운, 뒤로 버튼, 와인 타입별 색상 |
| 차트들 | 올바른 데이터 바인딩, 색상 적용, 정렬 순서 |

### 4-4. Wrapped (§7)

| 항목 | 검증 내용 |
|------|----------|
| 카테고리 필터 | [전체\|식당\|와인] 전환 → 카드 변경 |
| 게이지 개인정보 | 3단: 최소/보통/공개 → 카드 요소 노출 변경 |
| 게이지 디테일 | 3단: 심플/보통/상세 → 카드 요소 노출 변경 |
| 그라디언트 | 카테고리별 올바른 그라디언트 적용 |
| visibility 연동 | `visibility_public.level=false` → 레벨 행 제거 |
| visibility 연동 | `visibility_public.bubbles=false` → 버블 행 제거 |
| 저장/공유 | 카드 이미지 렌더링 → 다운로드 가능 |

---

## 5. 설정 페이지 검증

### 5-1. 프라이버시 계층형 제어

| 테스트 | 동작 | 기대 결과 |
|--------|------|----------|
| 세그먼트: 전체 공개 | 탭 | 3개 레이어 모두 표시, 기록 범위 표시 |
| 세그먼트: 버블만 | 탭 | 전체 공개 레이어 숨김, 나머지 표시 |
| 세그먼트: 비공개 | 탭 | 모든 레이어 숨김, 기록 범위 숨김 |
| 레이어 애니메이션 | 전환 | max-height + opacity transition (0.35s/0.25s) |
| 전체 공개 토글 price | 표시 | disabled, "버블에서만" 힌트, opacity 0.5 |
| 버블별 커스텀 | 항목 클릭 | BubblePrivacySheet 바텀시트 오픈 |
| 바텀시트 라디오 | "기본값 사용" | 토글 비활성 |
| 바텀시트 라디오 | "커스텀 설정" | 7개 토글 활성 |

### 5-2. 토글 동기화

| 테스트 | 동작 | 기대 결과 |
|--------|------|----------|
| 토글 ON→OFF | 탭 | 즉시 UI 변경 (optimistic) → 500ms 후 서버 반영 |
| 서버 실패 | 에러 | 이전 값 롤백 + 에러 토스트 |
| 세그먼트 변경 | 탭 | 즉시 서버 반영 (debounce 없음) |

### 5-3. NyamSelect

| 테스트 | 동작 | 기대 결과 |
|--------|------|----------|
| 닫힌 상태 | 표시 | 현재 선택값 + chevron-down |
| 클릭 | 오픈 | 드롭다운 패널 표시 |
| 항목 선택 | 탭 | 값 변경 + 닫힘 + 서버 동기화 |

### 5-4. 계정 삭제

| 테스트 | 동작 | 기대 결과 |
|--------|------|----------|
| 삭제 항목 탭 | 시트 오픈 | DeleteAccountSheet 표시 |
| 기록 익명화 선택 | 라디오 | 기본 선택 상태 |
| 기록 완전 삭제 선택 | 라디오 | 경고 문구 강조 |
| [계정 삭제 요청] 클릭 | 확인 | `deleted_at` 설정 + 로그아웃 |
| 삭제 후 30일 이내 | 로그인 시도 | 복구 가능 안내 |

### 5-5. 알림 설정

| 테스트 | 동작 | 기대 결과 |
|--------|------|----------|
| 푸시 알림 OFF | 토글 | `notify_push = false` |
| 방해 금지 설정 | chevron 탭 | 시간 설정 UI 표시 |
| DND 저장 | 시간 입력 | `dnd_start`, `dnd_end` 저장 |

---

## 6. 알림 시스템 검증

### 6-1. 드롭다운 UI

| 테스트 | 동작 | 기대 결과 |
|--------|------|----------|
| 벨 아이콘 탭 | 오픈 | 드롭다운 표시 + 애니메이션 (scale 0.94→1, translateY -6→0, 0.16s) |
| 외부 탭 | 닫기 | 드롭다운 숨김 |
| ESC | 닫기 | 드롭다운 숨김 |
| 벨 재탭 | 닫기 | 드롭다운 숨김 |
| 빈 상태 | 알림 0개 | 벨 아이콘 + "아직 알림이 없어요" |

### 6-2. 미읽음 뱃지

| 테스트 | 조건 | 기대 결과 |
|--------|------|----------|
| 미읽음 3개 | `unreadCount = 3` | 빨간 dot 표시 (숫자 없음) |
| 미읽음 0개 | `unreadCount = 0` | dot 숨김 |
| 새 알림 수신 | realtime INSERT | dot 표시 갱신 |

### 6-3. 알림 유형별 표시

| 유형 | 아이콘 | 색상 | 액션 버튼 |
|------|--------|------|----------|
| `level_up` | `trophy` | `--caution` | 없음 |
| `bubble_join_request` | `circle-dot` | `--accent-food` | [수락][거절] |
| `follow_request` | `user-plus` | `--accent-social` | [수락][거절] |
| `bubble_join_approved` | `circle-check` | `--positive` | 없음 |
| `follow_accepted` | `user-check` | `--accent-social` | 없음 |

### 6-4. 액션 처리

| 테스트 | 동작 | 기대 결과 |
|--------|------|----------|
| [수락] 클릭 | 처리 | 버튼 → "수락 완료" (positive 색상) + 읽음 처리 |
| [거절] 클릭 | 처리 | 버튼 → "거절됨" (hint 색상) + 읽음 처리 |
| "모두 읽음" | 탭 | 전체 dot 제거, 액션 상태 불변 |
| 읽음 후 알림 탭 | 탭 | 관련 페이지 이동 + 닫기 |

### 6-5. 실시간 구독

| 테스트 | 조건 | 기대 결과 |
|--------|------|----------|
| 새 알림 INSERT | Supabase Realtime | 목록 상단에 추가 + 미읽음 카운트 증가 |
| 컴포넌트 언마운트 | cleanup | `unsubscribe()` 호출 |

---

## 7. S1/S2 회귀 검증

| 대상 | 검증 내용 |
|------|----------|
| 인증 | 4종 소셜 로그인 정상 작동 |
| RLS | 모든 테이블 RLS 활성, 타인 데이터 접근 차단 |
| 기록 플로우 | 기록 생성 → XP 적립 → 레벨 체크 전체 파이프라인 |
| 사분면 | 점수 입력 → 저장 → 조회 정상 |
| 아로마 | 향 팔레트 렌더링 정상 |
| DB 마이그레이션 | 새 함수 (upsert_user_experience 등) 기존 스키마 충돌 없음 |

---

## 8. 크리티컬 게이트 (CLAUDE.md 기준)

### 8-1. 빌드 & 린트

```bash
□ pnpm build          # 에러 없음
□ pnpm lint           # 경고 0개
```

### 8-2. TypeScript 엄격성

```bash
□ grep -rn "as any" src/                     # 0개
□ grep -rn "@ts-ignore" src/                 # 0개
□ grep -rn "! " src/ --include="*.ts*"       # 불필요한 ! 단언 0개 (정당한 사용만)
```

### 8-3. Clean Architecture (R1~R5)

```bash
# R1: domain은 외부 의존 0
□ grep -r "from 'react\|from '@supabase\|from 'next\|from '.*infrastructure\|from '.*presentation\|from '.*app/" src/domain/   # 0개

# R2: infrastructure는 implements 사용
□ grep -rL "implements" src/infrastructure/repositories/            # 해당 없음 확인

# R3: application은 domain 인터페이스에만 의존
□ grep -r "from '.*infrastructure" src/application/                 # 0개

# R4: presentation은 application hooks + shared/di만
□ grep -r "from '@supabase\|from '.*infrastructure" src/presentation/  # 0개

# R5: app/은 라우팅만
□ # page.tsx는 Container 렌더링만 (수동 확인)
```

### 8-4. SSOT 정합성

| 검증 항목 | 확인 |
|-----------|------|
| XP 공식 | XP_SYSTEM.md §4 기록 XP 테이블과 일치 |
| 레벨 커브 | XP_SYSTEM.md §5 앵커 14개 정확히 일치 |
| 레벨 색상 | DESIGN_SYSTEM.md + XP_SYSTEM.md §5 색상 일치 |
| 알림 유형 | 09_NOTIFICATIONS.md 5가지 유형과 정확히 일치 |
| 프로필 레이아웃 | 10_PROFILE.md 와이어프레임과 일치 |
| 설정 항목 | 11_SETTINGS.md 전체 항목/DB 필드와 일치 |
| DB 필드 | DATA_MODEL.md 테이블 정의와 일치 |

### 8-5. 목업 정합성

| 검증 | 목업 | 대상 |
|------|------|------|
| 프로필 | `prototype/03_profile.html` | 헤더, 활동요약, 탭, 차트, Wrapped |
| 설정 | `prototype/05_settings.html` | 섹션, 프라이버시 레이어, 토글, NyamSelect |
| 알림 | `prototype/06_notifications.html` | 드롭다운, 아이템, 액션 버튼, 뱃지 |

### 8-6. 보안

```bash
□ RLS 우회 없음
□ SECURITY DEFINER 함수 없음 (모두 SECURITY INVOKER)
□ SUPABASE_SERVICE_ROLE_KEY 클라이언트 노출 없음
□ Edge Function에서만 service role key 사용
```

### 8-7. 모바일

```bash
□ 360px 뷰포트에서 레이아웃 깨짐 없음
□ 터치 타겟 44×44px (Toggle, 알림 아이템, 탭 등)
□ 히트맵 셀 크기 적절 (360px 기준 13열 fit)
□ 드롭다운 300px 너비 모바일 fit (right: 16px)
```

### 8-8. 코딩 규칙

```bash
□ console.log 없음
□ 디자인 토큰 사용 (bg-white/text-black 하드코딩 없음)
□ 컬러 분리: 식당 --accent-food / 와인 --accent-wine
□ 파일명 kebab-case
□ 컴포넌트명 PascalCase
□ hook명 use- prefix
□ 절대 경로 @/ 사용
```

---

## 9. 스프린트 완료 추가 체크

```bash
□ 이전 스프린트 (S1~S5) 기능 회귀 없음
□ DECISIONS_LOG.md에 주요 결정 기록
□ MASTER_TRACKER.md 갱신 (S6 전체 done)
□ CURRENT_SPRINT.md 갱신 (S7 프리뷰)
```

---

## 10. 테스트 파일 목록

| 파일 | 범위 |
|------|------|
| `src/domain/services/__tests__/xp-calculator.test.ts` | 모든 순수 함수 단위 테스트 |
| `src/application/hooks/__tests__/use-xp-calculation.test.ts` | XP 오케스트레이션 통합 테스트 |
| `src/application/hooks/__tests__/use-notifications.test.ts` | 알림 hook (optimistic update, 구독) |
| `src/application/hooks/__tests__/use-settings.test.ts` | 설정 hook (프라이버시 연동) |
| `e2e/profile.spec.ts` | 프로필 렌더링 + 탭 전환 + Wrapped |
| `e2e/settings.spec.ts` | 프라이버시 레이어 + 토글 + 삭제 플로우 |
| `e2e/notifications.spec.ts` | 드롭다운 오픈/닫기 + 액션 + 뱃지 |
