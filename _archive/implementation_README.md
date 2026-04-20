# Nyam v2 Implementation Guide

> LLM 기반 바이브코딩 전용 실행 문서. SSOT는 `development_docs/`의 설계 문서들이며, 이 폴더는 그 설계를 코드로 옮기기 위한 **실행 지침**이다.

---

## 문서 구조

```
implementation/
├── README.md                  # 이 파일 — 진입점 (실행 규칙은 루트 CLAUDE.md)
│
├── orchestration/             # LLM이 따라가는 중심축
│   ├── MASTER_TRACKER.md      #   전체 진행 상황 + 스프린트 상태
│   ├── CURRENT_SPRINT.md      #   현재 활성 스프린트 상세
│   ├── DEPENDENCY_MAP.md      #   구현 순서 의존성
│   ├── DECISIONS_LOG.md       #   개발 중 내린 설계 결정 기록
│   └── REVIEW_LOOP.md         #   검증 루프 + 품질 게이트
│
├── phases/                    # 스프린트별 세부 구현 지침
│   ├── S1_foundation/         #   DB + 인증 + 디자인 토큰
│   ├── S2_core_recording/     #   사분면 + 아로마 + 기록 플로우
│   ├── S3_search/             #   검색 + 등록
│   ├── S4_detail_pages/       #   식당/와인 상세
│   ├── S5_home_recommendation/#   홈 + 추천
│   ├── S6_xp_profile/         #   XP + 프로필 + 설정
│   ├── S7_bubble/             #   버블 시스템
│   ├── S8_integration/        #   소셜 통합 + 팔로우
│   └── S9_onboarding_polish/  #   온보딩 + 마무리
│
└── shared/                    # 스프린트 횡단 공통 가이드
    ├── CLEAN_ARCH_PATTERN.md  #   클린 아키텍처 구현 패턴
    ├── TESTING_STRATEGY.md    #   테스트 전략 + 체크포인트
    └── CONVENTIONS.md         #   네이밍 + 파일 구조 + 코드 규칙
```

---

## 작업 흐름 (웨이브 병렬 실행)

```
1. orchestration/MASTER_TRACKER.md → 현재 웨이브 + 가용 세션 확인
2. orchestration/CURRENT_SPRINT.md → 이 세션이 담당할 태스크 확인
3. phases/SN_xxx/ 의 세부 지침 따라 구현
4. orchestration/REVIEW_LOOP.md 의 검증 루프 실행
5. 통과 → MASTER_TRACKER 갱신 → 조기 전환 규칙에 따라 다음 작업 or 세션 종료
   실패 → 수정 → 재검증
```

> 병렬 세션 운용, 조기 전환, 충돌 방지 규칙은 MASTER_TRACKER 참조.

---

## SSOT 참조 관계

| 이 폴더 | 참조하는 SSOT |
|---------|--------------|
| `phases/S1_*` | `systems/DATA_MODEL.md`, `systems/AUTH.md`, `systems/DESIGN_SYSTEM.md` |
| `phases/S2_*` | `systems/RATING_ENGINE.md`, `systems/DATA_MODEL.md`, `pages/05_RECORD_FLOW.md`, `prototype/01_home.html`, `prototype/00_design_system.html` |
| `phases/S3_*` | `pages/01_SEARCH_REGISTER.md`, `pages/05_RECORD_FLOW.md`, `systems/XP_SYSTEM.md` |
| `phases/S4_*` | `pages/02_RESTAURANT_DETAIL.md`, `pages/03_WINE_DETAIL.md`, `pages/04_RECORD_DETAIL.md`, `systems/RATING_ENGINE.md` |
| `phases/S5_*` | `pages/06_HOME.md`, `pages/07_DISCOVER.md`, `systems/RECOMMENDATION.md`, `systems/RATING_ENGINE.md`, `00_IA.md` |
| `phases/S6_*` | `systems/XP_SYSTEM.md`, `systems/DATA_MODEL.md`, `pages/10_PROFILE.md`, `pages/11_SETTINGS.md`, `pages/09_NOTIFICATIONS.md` |
| `phases/S7_*` | `pages/08_BUBBLE.md`, `systems/AUTH.md` (역할/가입정책), `systems/XP_SYSTEM.md` (가입조건/소셜XP) |
| `phases/S8_*` | `pages/08_BUBBLE.md` (L9 통합), `pages/06_HOME.md` (팔로잉 탭), `pages/10_PROFILE.md` |
| `phases/S9_*` | `pages/12_ONBOARDING.md`, `pages/09_NOTIFICATIONS.md` |
| `shared/*` | 루트 `CLAUDE.md` (클린 아키텍처, 코딩 규칙) |

---

## 규칙

1. **이 폴더의 지침이 SSOT와 충돌하면 SSOT가 우선** — 지침을 수정한다
2. **세부 지침 문서는 구체적이어야 한다** — "적절히 구현" 같은 모호한 표현 금지
3. **각 세부 지침은 독립 실행 가능해야 한다** — 선행 지침 완료를 전제로, 그 자체로 완결
4. **진행 상황은 MASTER_TRACKER에만 기록** — 다른 곳에 중복 기록 금지
