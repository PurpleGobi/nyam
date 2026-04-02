# 09: S5 검증 — 홈 & Discover 전체 검증 + 회귀 테스트

> S5 전체 기능 검증 + 이전 스프린트 회귀 테스트

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `CLAUDE.md` | 크리티컬 게이트, 스프린트 완료 시 추가 체크 |
| `pages/06_HOME.md` | 전체 |
| `pages/07_DISCOVER.md` | 전체 |
| `systems/DESIGN_SYSTEM.md` | 전체 컬러 토큰, 타이포그래피, 컴포넌트 |

---

## 1. 빌드 & 린트 게이트

```bash
□ pnpm build          # 에러 0개
□ pnpm lint           # 경고 0개
□ TypeScript strict   # any/as any/@ts-ignore/! 사용 0건
```

---

## 2. Clean Architecture 검증 (R1~R5)

```bash
# R1: domain에 외부 의존 없음
□ grep -r "from 'react\|from '@supabase\|from 'next" src/domain/
# 결과: 0건

# R2: infrastructure가 domain 인터페이스를 implements로 구현
□ grep -rL "implements" src/infrastructure/repositories/
# 결과: 0건

# R3: application이 infrastructure 직접 사용 안 함
□ grep -r "from '.*infrastructure" src/application/
# 결과: 0건

# R4: presentation이 Supabase/infrastructure 직접 사용 안 함
□ grep -r "from '@supabase\|from '.*infrastructure" src/presentation/
# 결과: 0건

# R5: app/ page.tsx가 Container 렌더링만
□ 수동 확인: src/app/(main)/page.tsx → HomeContainer import + 렌더링만
□ 수동 확인: src/app/(main)/discover/page.tsx → DiscoverContainer import + 렌더링만
```

---

## 3. S5 기능별 검증

### 3-1. 앱 셸 (01_app_shell)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 앱 헤더 | 홈 화면 렌더 확인 | nyam 로고 (Comfortaa gradient) + bubbles + bell + 레벨바 + 아바타 |
| glassmorphism | 시각 확인 | `.top-fixed` blur + opacity + shadow |
| 알림 벨 + 드롭다운 | 벨 탭 | 미읽음 dot + NotificationDropdown 팝오버 |
| 레벨 바 | XP 시스템 연동 | 레벨 뱃지 + 진행률 바 |
| 아바타 드롭다운 | 아바타 탭 | 프로필/설정 메뉴, 외부 클릭 닫힘 |
| FAB back | 상세 페이지 좌하단 | useBackNavigation 연동 |
| FAB add | 홈 우하단 | variant 지원 (food/wine), Plus 26x26 |
| FAB forward | 기록 플로우 | accent 배경, 흰색 아이콘 |
| FAB actions | 상세 페이지 | 수정/공유/삭제 버튼 조합 |

### 3-2. 홈 레이아웃 (02_home_layout)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 식당/와인 탭 | 탭 전환 | accent 밑줄 색상 변경 |
| 탭 sticky | 스크롤 | top:46px z-index:80 고정 |
| 뷰 모드 유지 | 탭 전환 | list 모드에서 탭 변경 → list 유지 |
| 조건 칩 필터 | 칩 추가/제거 | 속성:값 칩 + ✕ 삭제 |
| 칩 초기화 | 탭 전환 | 칩 배열 빈 상태로 리셋 |
| cascading 칩 | 위치 필터 | 국가→도시→구/동 3단계 |
| Advanced Filter | + Advanced 탭 | 바텀시트 열림 → AdvancedFilterChip 생성 |
| InlinePager | 레코드 5개+ | ◀ 1/3 ▶ 표시 |
| 빈 상태 | 레코드 0개 | "첫 식당/와인을 기록해보세요" + CTA |

### 3-3. 뷰 모드 (03_view_modes)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 카드 뷰 | 식당 카드 렌더 | 46% 사진 + info, radius 16px, min-height 190px |
| 소스 태그 | 나/버블/웹 | 색상 정확 |
| 사분면 미니 | dot 위치/크기 | 크기/게이지 색상 정확 |
| 미평가 카드 | satisfaction null | "평가하기 →" CTA |
| 와인 카드 | 와인 탭 | 어두운 gradient + --accent-wine |
| 버블 행 | 멤버 2명 + 3명 | 최대 2명, +N 표시 |
| visitCount | 2회+ | "N회" 뱃지 표시 |
| 버블 스티커 | sharedBubbles | 버블명 칩 + 공유 버튼 |
| 리스트 뷰 | 뷰 전환 | rank accent, 사분면 48px, 점수 |
| 리스트 버블 모드 | bubbleDots | BubbleQuadrant 멀티 dot |
| 캘린더 뷰 | 뷰 전환 | 7열 그리드, 사진 배경, today 강조 |
| 날짜 상세 | 날짜 탭 | mealTime + name + score 목록 |
| 지도 뷰 | 지도 토글 | MapView (식당 전용), GroupedTarget 기반 |
| 팔로잉 피드 | 팔로잉 모드 | FollowingFeed + 소스 필터 |
| 뷰 사이클 | 아이콘 버튼 | card → list → calendar → card (map 별도) |
| lazy loading | dynamic import | CalendarView, MapView, FollowingFeed (ssr:false) |

### 3-4. 필터/소팅/검색 (04_filter_sort)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| ConditionFilterBar | 칩 추가 | + 필터 추가 → 속성 팝오버 → 값 팝오버 |
| 칩 수정 | 칩 클릭 | 값 변경 팝오버 (Check 표시) |
| 칩 삭제 | ✕ 클릭 | 칩 제거, cascading 그룹 삭제 |
| cascading | 위치 필터 | 3단계 계층, "전체" 플레이스홀더 |
| Advanced Filter | 바텀시트 | AdvancedFilterChip 생성 |
| 소팅 | 소팅 버튼 | 5개 옵션 (Check + accent), 자동 닫힘 |
| 검색 | 검색 버튼 | HomeTabs 내 인라인 입력 또는 /discover 이동 |
| 상호 배타 | 소팅/검색 | 하나 열면 다른 하나 닫힘 |
| 독립 상태 | 뷰 모드 전환 | 8개 ViewModeState 독립 |
| 필터 적용 | 조건 설정 | applyFilterRules → matchesAllRules 클라이언트 필터링 |

### 3-5. 통계 패널 (05_stats_panel)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 식당 세계지도 | 통계 토글 | WorldMapChart SVG 렌더 |
| 장르 차트 | 통계 패널 | GenreChart 수평 바 |
| 점수 분포 | 통계 패널 | ScoreDistribution 6등분 |
| 월별 소비 | 통계 패널 | MonthlyChart 6개월 |
| 상황별 차트 | 통계 패널 | SceneChart scene 색상 |
| 와인 산지 지도 | 와인 통계 | WineRegionMap |
| 품종 차트 | 와인 통계 | VarietalChart |
| 와인 타입 | 와인 통계 | WineTypeChart |
| PD 잠금 | 기록 수 부족 | PdLockOverlay blur + 자물쇠 |
| PD 해제 | 5/10/20개+ | 순차적 해제 |
| 통계 숨김 | 캘린더/지도/팔로잉 | 통계 패널 숨김 |
| lazy loading | dynamic import | 모든 차트 ssr:false |

### 3-6. AI 인사 (06_nudge)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| AI 인사 | 세션 첫 진입 | 15px/500 텍스트, aiPulse dot |
| 시간대 분기 | 시간 변경 | 아침/점심/저녁/밤 멘트 |
| 5초 소멸 | 대기 | max-height + opacity 0 |
| 세션 1회 | 새로고침 | sessionStorage 확인, 미표시 |
| 탭 이동 | restaurant-id | 식당 상세 이동 |
| 넛지 스트립 | — | 미구현 (Phase 2) |

### 3-7. Discover (08_discover)

| 항목 | 검증 방법 | 합격 기준 |
|------|----------|----------|
| 지역 칩 | 8개 | 다중 선택, active accent |
| 내 근처 | GPS 탭 | GPS 위치 기반 검색 |
| 직접 입력 | 텍스트 | 구/동 검색 |
| 음식 종류 | 칩 | 다중 선택 |
| Google Places | API 호출 | 식당 목록 반환 |
| AI 추천순위 | 버튼 탭 | ScoreBreakdown 표시, 점수순 정렬 |
| AI 자연어 | 랭킹 후 | 질문 → 답변 + picks |
| AI 분석 | 식당 확장 | 맛/분위기/꿀팁/가격대/추천메뉴 |
| 기록하기 | 버튼 탭 | 미등록 자동 등록 → 기록 플로우 |
| 찜 | 하트 탭 | 미등록 자동 등록 → 찜 토글 |
| 외부 링크 | 구글맵/네이버/카카오 | 새 탭 열림 |
| 빈 상태 | 결과 0개 | "검색 결과가 없어요" |
| 인증 | 비로그인 | 401 반환 |

---

## 4. 모바일 검증 (360px)

```
□ 앱 헤더: 요소 잘림 없음
□ HomeTabs + 아이콘 버튼: 줄바꿈 없음
□ 조건 칩: 가로 스크롤 정상
□ 플레이스 카드: 46% 사진 비율 유지
□ 리스트 뷰: 사분면 + 점수 정렬 정상
□ 캘린더 뷰: 7열 그리드 비율 유지
□ 통계 차트: 정상 표시
□ Discover: 칩 wrap, 카드 표시 정상
□ FAB: 다른 요소와 겹침 없음
□ 터치 타겟: 44x44px 이상
```

---

## 5. 디자인 토큰 검증

```
□ bg-white/text-black 하드코딩 없음
□ 식당 accent → --accent-food
□ 와인 accent → --accent-wine
□ 브랜드 → --brand (로고/bubbles에만)
```

---

## 6. 이전 스프린트 회귀 테스트

| 스프린트 | 검증 항목 | 방법 |
|---------|----------|------|
| S1 | DB 스키마 무결성 | `pnpm build` 성공 |
| S1 | 인증 | 로그인 → 홈 진입 가능 |
| S2 | 기록 플로우 | 카메라 → 식당 특정 → 저장 |
| S3 | 검색/등록 | 식당 검색 → 등록 → 기록 |
| S4 | 식당/와인 상세 | 정상 표시 |
| S4 | 찜 CRUD | 하트 탭 → wishlists INSERT/DELETE |

---

## 7. 미구현 항목 (참고)

```
□ 넛지 스트립 (06_nudge.md) — Phase 2
□ 추천 알고리즘 7종 (07_recommendation.md) — 미구현
□ Discover 검색바 실제 검색 (discover-search-bar.tsx) — 직접 입력으로 대체
```

---

## 8. 스프린트 완료 체크리스트

```
□ 이전 스프린트 기능 회귀 없음 (§6)
□ DECISIONS_LOG에 주요 결정 기록
□ MASTER_TRACKER 갱신
□ CURRENT_SPRINT 갱신
```
