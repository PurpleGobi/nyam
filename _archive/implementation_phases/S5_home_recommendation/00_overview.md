# S5: Home & Recommendation

> 앱의 메인 허브. 모든 기능이 홈에서 시작하고 홈으로 돌아온다.
> 앱 헤더 + FAB 등 전체 페이지 공통 셸도 이 스프린트에서 구현.

---

## SSOT 참조

| 문서 | 역할 |
|------|------|
| `pages/06_HOME.md` | 홈 레이아웃, 탭, 뷰 모드, 필터, 소팅, 통계, AI 인사 |
| `pages/07_DISCOVER.md` | Discover 서브스크린 (별도 `/discover` 라우트) |
| `systems/RECOMMENDATION.md` | 추천 알고리즘 7종 (미구현 — Phase 2 이후) |
| `systems/RATING_ENGINE.md` | 사분면 좌표, 만족도 (카드 표시용) |
| `00_IA.md` | 앱 헤더, FAB, 네비게이션 구조 |
| `prototype/01_home.html` | `screen-home`, `screen-discover` 목업 |

---

## 현재 구현 상태

- [x] 앱 헤더 (sticky glassmorphism — nyam 로고, bubbles, 알림, 레벨바, 아바타 드롭다운)
- [x] FAB 공통 컴포넌트 (+ 추가, ← 뒤로, → 전진, FAB Actions)
- [x] 홈 레이아웃 + 식당/와인 탭 전환
- [x] 뷰 모드 4종 (카드/리스트/캘린더/지도)
- [x] 조건 칩 기반 필터 + 소팅 드롭다운 + 홈 내 검색
- [x] 통계 패널 (토글, 차트)
- [x] AI 인사 메시지 (5초 후 소멸)
- [x] 팔로잉 피드 (FollowingFeed 컴포넌트)
- [x] Discover 서브스크린 (Google Places + AI 랭킹 기반)
- [ ] 넛지 스트립 (미구현)
- [ ] 추천 알고리즘 7종 (미구현)

---

## 태스크 목록

| # | 태스크 | 지침 문서 | 선행 | 상태 |
|---|--------|----------|------|------|
| 5.1 | 앱 헤더 + FAB 공통 컴포넌트 | `01_app_shell.md` | S1~S4 완료 | 완료 |
| 5.2 | 홈 레이아웃 + 탭 구조 | `02_home_layout.md` | 5.1 | 완료 |
| 5.3 | 뷰 모드 4종 | `03_view_modes.md` | 5.2 | 완료 |
| 5.4 | 필터 + 소팅 + 홈 검색 | `04_filter_sort.md` | 5.2 | 완료 |
| 5.5 | 통계 패널 | `05_stats_panel.md` | 5.2 | 완료 |
| 5.6 | AI 인사 + 넛지 스트립 | `06_nudge.md` | 5.2 | 부분 완료 (AI 인사만) |
| 5.7 | 추천 알고리즘 (7종) | `07_recommendation.md` | 5.2 | 미구현 |
| 5.8 | Discover 서브스크린 | `08_discover.md` | 5.2 | 완료 (설계 변경) |
| 5.9 | S5 검증 | `09_validation.md` | 전체 | 진행 중 |

---

## 완료 기준

```
□ 앱 헤더: nyam 로고(Comfortaa), bubbles(--brand), 알림 뱃지, 레벨바, 아바타 드롭다운
□ FAB: + 추가(우하단), ← 뒤로(상세 페이지), → 전진(기록 플로우), FAB Actions(멀티 액션)
□ 식당/와인 탭 전환 (밑줄 색상: 식당=--accent-food, 와인=--accent-wine)
□ 카드→리스트→캘린더 뷰 순환 + 지도 뷰 토글 (식당 전용)
□ 조건 칩 기반 필터 (속성:값 칩 + Advanced Filter 바텀시트) + 소팅 드롭다운
□ 통계 패널 토글 + 차트 렌더링
□ AI 인사 (5초 후 소멸, 기록 기반 개인화)
□ 팔로잉 피드 (팔로잉 사용자의 기록 표시)
□ Discover: Google Places 검색 + AI 랭킹 + AI 분석/추천
```
