# S2: Core Recording — 사분면 + 아로마 + 품질평가 + 기록 플로우

> 앱의 핵심 UX. 사분면 평가의 완성도가 앱 품질을 결정한다.
> 와인은 식당보다 평가 단계가 많다 (RATING_ENGINE §8: 5단계).

---

## SSOT 참조

| 문서 | 역할 |
|------|------|
| `systems/RATING_ENGINE.md` | 사분면 좌표, 만족도, 씬태그, 아로마 팔레트, 품질평가(BLIC), 페어링 |
| `systems/DATA_MODEL.md` | lists, records 테이블 스키마 (domain 엔티티 출처), record_photos |
| `pages/05_RECORD_FLOW.md` | 기록 플로우 UI 스펙, Phase 1/2 구분, 진입 경로 3종 |
| `prototype/01_home.html` | `screen-rest-record`, `screen-wine-record`, `screen-add-success` 목업 |
| `prototype/00_design_system.html` | §15 점 비주얼, §15b Circle Rating 스펙 |

---

## 산출물

- [x] Record, ListItem, Quadrant domain 엔티티
- [x] 사분면 UI (식당: 음식 퀄리티×경험 가치, 와인: 구조·완성도×즐거움·감성)
- [x] 만족도 자동 계산 ((x + y) / 2) + Circle Rating 인터랙션
- [x] 아로마 휠 (와인 16섹터 3링 — 1차향 9 + 2차향 4 + 3차향 3, WSET Level 3 기준)
- [x] 와인 품질평가 BLIC (균형/여운/강도/복합성 슬라이더 4개, 선택)
- [x] 페어링 카테고리 (WSET 8종 그리드 + AI 추천 + 직접 입력)
- [x] 씬태그 (식당 6종 단일 선택) + 동행자 선택 UI
- [x] 사진 업로드 UI + Supabase Storage 연결 (record_photos)
- [x] 기록 저장 플로우 (Phase 1 필수 + Phase 2 선택)
- [x] Supabase repository 구현

---

## 태스크 목록

| # | 태스크 | 지침 문서 | 선행 |
|---|--------|----------|------|
| 2.1 | domain 엔티티 정의 | `01_domain.md` | S1 완료 |
| 2.2 | 사분면 UI | `02_quadrant_ui.md` | 2.1 |
| 2.3 | 만족도 게이지 + Circle Rating | `03_satisfaction.md` | 2.1 |
| 2.4 | 아로마 휠 (16섹터 3링) | `04_aroma.md` | 2.1 |
| 2.5 | 와인 품질평가 BLIC (슬라이더 4개) | `05_structure.md` | 2.1 |
| 2.6 | 페어링 카테고리 (8종 그리드) | `06_pairing.md` | 2.1 |
| 2.7 | 씬태그 + 동행자 | `07_scene_tags.md` | 2.1 |
| 2.8 | 사진 업로드 + Storage | `08_photos.md` | 2.1 |
| 2.9 | 기록 저장 플로우 | `09_record_flow.md` | 2.2~2.8 |
| 2.10 | infrastructure 연결 | `10_infra.md` | 2.9 |
| 2.11 | S2 검증 | `11_validation.md` | 전체 |

---

## 와인 평가 5단계 (RATING_ENGINE §8)

```
Step 1: 사분면 (구조·완성도×즐거움·감성) + 만족도 자동 계산  ← 필수
Step 2: 아로마 휠 (16섹터 3링, WSET Level 3)               ← 필수
Step 3: 품질평가 BLIC (균형/여운/강도/복합성)                ← 선택
Step 4: 페어링 (WSET 8카테고리 그리드)                      ← 필수
Step 5: 만족도 확정 (자동산출 + 수동조정)                    ← 필수
```

---

## 완료 기준

```
□ 사분면 터치/드래그 → 좌표 정확히 저장 (위치 이동, 만족도=(x+y)/2 자동 계산)
□ 만족도 1~100 범위 제한
□ 아로마 16섹터 3링: 탭 토글, 드래그 연속 칠하기, 링별(primary/secondary/tertiary) 저장
□ 품질평가 BLIC: 균형/여운/강도/복합성 슬라이더 → 만족도 자동산출 (수동 우선)
□ 페어링: 8카테고리 다중 선택, AI pre-select, 직접 입력 필드
□ 씬태그 식당 6종 단일 선택 (solo/romantic/friends/family/business/drinks)
□ 사진 촬영/선택 → Supabase Storage 업로드 → record_photos 테이블 저장
□ lists upsert + records INSERT 시퀀스 (2-테이블 구조)
□ 저장된 기록 조회 시 모든 필드 정확히 표시
```
