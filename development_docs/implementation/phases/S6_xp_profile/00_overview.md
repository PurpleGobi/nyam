# S6: XP, Profile & Settings

> 경험치 시스템 + 사용자 프로필 + 설정. 기록의 축적이 자산이 되는 구조.

---

## SSOT 참조

| 문서 | 역할 |
|------|------|
| `systems/XP_SYSTEM.md` | XP 계산, 레벨, 뱃지, 맛 정체성, 어뷰징 방지 |
| `systems/DATA_MODEL.md` | user_experiences, xp_histories, level_thresholds, milestones, user_milestones 테이블 |
| `pages/10_PROFILE.md` | 프로필 페이지 스펙 |
| `pages/11_SETTINGS.md` | 설정 페이지 스펙 |
| `pages/09_NOTIFICATIONS.md` | 알림 시스템 스펙 |
| `prototype/03_profile.html` | 프로필 목업 |
| `prototype/05_settings.html` | 설정 목업 |
| `prototype/06_notifications.html` | 알림 목업 |

---

## 산출물

- [x] XP 계산 엔진 (기록→XP 적립, 레벨업, 활성 XP 일일 크론)
- [x] 프로필 페이지 (통계, 맛 정체성, 활동 히트맵)
- [x] 설정 페이지 (계정, 프라이버시, 알림, 데이터)
- [x] 알림 시스템 (인라인 드롭다운)

---

## 태스크 목록

| # | 태스크 | 지침 문서 | 선행 |
|---|--------|----------|------|
| 6.1 | XP 계산 엔진 + 활성 XP 크론 | `01_xp_engine.md` | S2 완료 |
| 6.2 | 프로필 페이지 | `02_profile.md` | 6.1 |
| 6.3 | 설정 페이지 | `03_settings.md` | S1 완료 |
| 6.4 | 알림 시스템 | `04_notifications.md` | S1 완료 |
| 6.5 | S6 검증 | `05_validation.md` | 전체 |

---

## 완료 기준

```
□ 기록 저장 → XP 자동 적립 (종합 + 세부 축 + 카테고리)
□ XP 누적 → 레벨업 트리거 (종합/카테고리/세부 축)
□ 활성 XP 일일 갱신 크론/Edge Function 동작 (최근 6개월 윈도우)
□ 프로필: 아바타, 닉네임, 맛 정체성, 활동 요약, 통계
□ 설정: 계정 정보 변경, 프라이버시 설정, 알림 on/off
□ 알림: 드롭다운 표시, 읽음 처리, 뱃지 업데이트
```
