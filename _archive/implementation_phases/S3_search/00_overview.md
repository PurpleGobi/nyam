# S3: Search & Register

> 검색→선택→S2 평가로 연결되는 풀 플로우 완성.
> **카메라 경로가 Primary** (RECORD_FLOW §1). 검색은 폴백.

---

## SSOT 참조

| 문서 | 역할 |
|------|------|
| `pages/01_SEARCH_REGISTER.md` | 검색 UI, 자동완성, 외부 API, 등록 플로우 |
| `pages/05_RECORD_FLOW.md` | 진입 경로 3종 (카메라/검색/상세 FAB), status 구분 |
| `systems/RATING_ENGINE.md` | AI 태그 추천, EXIF GPS 검증 (§9) |
| `systems/XP_SYSTEM.md` | EXIF 검증 → XP 차등 (§4-1, §9) |
| `prototype/01_home.html` | `screen-add-restaurant`, `screen-add-wine`, 검색 화면 목업 |

---

## 산출물

- [x] 카메라 촬영 UI + AI 인식 경로 (촬영→OCR/Vision→pre-fill)
- [x] 검색 UI + 자동완성 + AI 와인 검색
- [x] 식당 검색 (Nyam DB → 외부 API 폴백)
- [x] 와인 검색 (Nyam DB → AI 검색 폴백 → 라벨 OCR)
- [x] 사진 EXIF GPS 검증 (반경 200m)
- [x] 신규 식당/와인 등록 플로우
- [x] FAB(+)→카메라/검색→선택→기록 풀플로우 연결

---

## 태스크 목록

| # | 태스크 | 지침 문서 | 선행 |
|---|--------|----------|------|
| 3.1 | 카메라 촬영 + AI 인식 경로 | `01_camera_ai.md` | S1, S2 완료 |
| 3.2 | 검색 UI + 자동완성 | `02_search_ui.md` | 3.1과 병렬 가능 |
| 3.3 | 식당 검색 (Nyam DB + 외부 API) | `03_restaurant_search.md` | 3.2 |
| 3.4 | 와인 검색 (Nyam DB + 라벨 OCR) | `04_wine_search.md` | 3.2 |
| 3.5 | 사진 EXIF GPS 검증 | `05_exif.md` | 3.1 |
| 3.6 | 신규 등록 플로우 | `06_register.md` | 3.3, 3.4 |
| 3.7 | 풀플로우 연결 | `07_full_flow.md` | 3.1~3.6 |
| 3.8 | S3 검증 | `08_validation.md` | 전체 |

---

## 진입 경로 3종 (RECORD_FLOW §1)

| 경로 | 결과 status | 설명 |
|------|------------|------|
| **카메라 (Primary)** | `rated` | 촬영→AI 인식→통합 기록 화면 (AI pre-fill) |
| **검색/목록** | `checked` | 이름 검색 or GPS 목록→최소 데이터만 저장 |
| **상세 FAB** | `rated` | 식당/와인 상세→바로 기록 화면 (대상 선택 스킵) |

---

## 완료 기준

```
□ FAB(+) → 현재 탭 기반 직접 진입 (카메라 or 검색)
□ 카메라 촬영 → AI 인식 → 통합 기록 화면 (pre-fill)
□ 텍스트 입력 → 자동완성 결과 표시
□ 식당: Nyam DB 우선 → 외부 API 폴백 (카카오맵/네이버/구글)
□ 와인: Nyam DB 우선 → AI 검색 폴백 (DB 결과 < 3개 시 자동 트리거)
□ EXIF GPS 검증: 반경 200m 이내 → is_exif_verified=true
□ 신규 등록 → DB에 식당/와인 생성
□ 카메라→기록→저장 풀플로우 동작
□ 검색→선택→기록→저장 풀플로우 동작
```
