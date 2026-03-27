# Current Sprint

> 현재 활성 스프린트의 실시간 상태. 세션 시작 시 MASTER_TRACKER 다음으로 읽는다.

---

## 활성 작업

> **목업 1:1 매칭 진행 중**

```
작업:         prototype HTML vs 실제 구현 Playwright 비교 + 수정
시작일:       2026-03-27
목표:         모든 목업 화면과 실제 코드의 시각적 일치
```

---

## 목업 매칭 진행 상황

| 목업 파일 | 화면 수 | 매칭 상태 |
|----------|---------|----------|
| `00_onboarding.html` | 5 | ✅ 완료 (로그인/인트로/맛집등록/버블생성/버블탐색) |
| `01_home.html` | ~15 | **in_progress** — 홈 메인 화면 매칭 완료 ← 다음: 서브화면(카메라/검색/기록폼 등) |
| `02_detail_restaurant.html` | ~5 | not_started |
| `02_detail_wine.html` | ~5 | not_started |
| `03_profile.html` | ~3 | not_started |
| `04_bubbles.html` | ~3 | not_started |
| `04_bubbles_detail.html` | ~5 | not_started |
| `04_bubbler_profile.html` | ~3 | not_started |
| `05_settings.html` | ~3 | not_started |
| `06_notifications.html` | ~2 | not_started |
| `00_design_system.html` | 참조 | — |

---

## 컨텍스트 노트

> 2026-03-28:
> - 01_home.html 홈 메인 화면 목업 매칭 진행 (7개 파일 수정)
>   - app-header: bubbles 텍스트 링크 추가
>   - ai-greeting: 시간대별 인사 + nyam AI 서브텍스트 + 5초 자동접힘 (목업 구조 맞춤 재작성)
>   - nudge-strip: 인라인 카메라 넛지 스트립 (목업 구조 맞춤 재작성)
>   - home-tabs: pill → 밑줄 active 스타일, 지도/검색 아이콘 추가
>   - record-card: place-card 구조로 재작성 (미니사분면+점수+출처태그 3종+배지+좋아요/댓글)
>   - home-container: AiGreeting+NudgeStrip+SavedFilterChips 연결, getTimeGreeting()
>   - (main)/layout.tsx: 중복 임시 헤더 제거 (AppHeader로 대체)
> - pnpm build 0 errors, pnpm lint 0 errors
> - 다음: 01_home.html 서브화면 (카메라 촬영, 사진 선택, 식당 검색, 기록 폼, 성공 화면, 디스커버)

> 2026-03-27:
> - S1~S9 전체 구현 완료 (지침 문서 파일 커버리지 ~95%)
> - 온보딩 목업 매칭 완료: login-buttons, login-container, onboarding-intro, onboarding-container 수정
> - 다음: 01_home.html 목업 매칭

---

## 갱신 규칙

- 목업 매칭 완료 시: 진행 상황 테이블 갱신
- 세션 종료 시: "컨텍스트 노트"에 인수인계 사항 기록
