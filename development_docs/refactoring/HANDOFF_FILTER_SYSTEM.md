# 핸즈오프: 조건 필터 시스템 리디자인

**세션 날짜**: 2026-03-31 ~ 2026-04-01
**상태**: 핵심 구현 완료, 빌드 통과, 사용자 후속 수정 반영됨

---

## 작업 요약

프리셋(SavedFilter) 기반 필터를 **개별 조건 칩 기반 필터**로 전면 교체.

| 항목 | Before | After |
|------|--------|-------|
| 칩 의미 | 저장된 프리셋 (방문/찜/팔로잉) | 개별 조건 (attribute:value) |
| 기본 상태 | "전체" 칩 활성 | 칩 없음 = 전체보기. `[+]` 버튼만 표시 |
| 칩 조합 | 프리셋 하나만 활성 | 여러 칩 AND 조합 |
| 칩 추가 | 고급필터에서 저장 | `+` → 속성 팝오버 → 값 팝오버 |
| 고급 필터 | Notion식 패널 (독립) | `+ Advanced Filter` → floating panel (칩 바 바로 아래) |
| status 속성 | 전용 칩 (고정) | 다른 속성과 동등 |

---

## 변경된 파일

### 새 파일
| 파일 | 역할 |
|------|------|
| `src/domain/entities/condition-chip.ts` | `ConditionChip`, `AdvancedFilterChip` 타입, `chipsToFilterRules()`, `generateChipId()` |
| `src/presentation/components/home/condition-filter-bar.tsx` | 조건 칩 바 UI + Portal 팝오버 (속성/값 선택) + InlinePager |
| `src/presentation/components/home/advanced-filter-sheet.tsx` | Advanced Filter floating panel (FilterSystem 재사용) |

### 수정된 파일
| 파일 | 변경 내용 |
|------|----------|
| `src/presentation/components/ui/nyam-select.tsx` | 드롭다운을 Portal(`createPortal`) + `fixed` 포지셔닝으로 변경. 좌측 정렬 원칙, 우측 오버플로 자동 보정, 상하 크기 자동 계산, 스크롤 힌트 쉐브론 |
| `src/presentation/containers/home-container.tsx` | `SavedFilterChips` → `ConditionFilterBar` 교체. `conditionChips` 상태 관리. `GroupedTarget` 기반으로 리팩토링됨 (사용자 후속 수정) |
| `src/application/hooks/use-home-state.ts` | `activeChipId`, `isFilterOpen`, `toggleFilter` 제거 |
| `src/presentation/components/home/home-tabs.tsx` | 필터 토글 버튼 제거 (필터는 칩 바에서 직접 관리) |
| `src/app/globals.css` | `@keyframes slide-down` 추가 |
| `src/app/design-system/page.tsx` | 7-B 섹션 추가 (ConditionFilterBar + AdvancedFilterSheet 데모) |

### 제거/미사용
| 파일 | 상태 |
|------|------|
| `src/presentation/components/home/saved-filter-chips.tsx` | import 제거됨. 파일 자체는 남아있을 수 있음 (삭제 가능) |
| `src/application/hooks/use-saved-filters.ts` | home-container에서 import 제거됨. 다른 곳에서 사용 여부 확인 필요 |

---

## 아키텍처

### 데이터 흐름
```
ConditionFilterBar (chips 상태)
  ↓ onChipsChange
HomeContainer.handleChipsChange
  → chipsToFilterRules(chips) → FilterRule[]
  → setFilterRules(rules) → useHomeState의 viewModeState에 저장
  → applyFilterRules(records, rules, 'and') → 필터 적용
  → groupRecordsByTarget → sortGroupedTargets → 화면 표시
```

### 팝오버 시스템
- `ConditionFilterBar` 내 `Popover` 컴포넌트: `createPortal` + `fixed` 포지셔닝
- 버튼의 `getBoundingClientRect()` 기준 위치 계산
- 좌/우 자동 판별 (버튼이 왼쪽이면 left align, 오른쪽이면 right align)
- 바깥 클릭으로 닫기

### NyamSelect Portal 드롭다운
- `createPortal` + `fixed` + `z-index: 300`
- 좌측 정렬 원칙 → 렌더 후 `requestAnimationFrame`에서 우측 오버플로 보정
- `width: max-content` + `minWidth: btn.width` → 항목 최대 길이에 자동 확장
- 상하 방향 자동 (`dropUp` — 아래 공간 부족 시 위로 열림)
- `maxHeight` = 가용 공간에서 자동 계산
- `canScrollUp`/`canScrollDown` → 쉐브론 힌트

### Advanced Filter Panel
- floating panel (인라인, 칩 바 바로 아래)
- 기존 `FilterSystem` (Notion 스타일 룰 빌더) 재사용
- 바깥 클릭/Escape로 닫기
- 적용 시 `AdvancedFilterChip` 생성 → 칩 바에 "N개 조건" 칩 추가

---

## 사용자 후속 수정 (세션 중간에 반영됨)

1. **`accentType` 확장**: `'food' | 'wine'` → `'food' | 'wine' | 'social'` (ConditionFilterBar, AdvancedFilterSheet)
2. **`GroupedTarget` 도입**: home-container에서 레코드를 target별로 그룹화하는 로직 추가 (`groupRecordsByTarget`, `sortGroupedTargets`)
3. **카드/리스트/맵 뷰**가 `GroupedTarget` 기반으로 변경됨

---

## 디자인 시스템 (7-B 섹션)

`/design-system` 페이지에 **7-B. Condition Filter System** 섹션 추가:
- Food / Wine 빈 상태 (칩 없음 = 전체보기)
- 칩 적용 상태 (상태:방문 + 음식종류:한식 + 상황:데이트)
- Advanced Filter Sheet 열기 버튼 + floating panel 데모

---

## 남은 작업 / 고려사항

1. **`saved-filter-chips.tsx` / `use-saved-filters.ts` 정리**: 다른 곳에서 참조하지 않으면 삭제 가능
2. **cascading-select 속성 (위치/생활권)**: 현재 `+` 팝오버에서 옵션이 없어 "Advanced Filter에서 설정하세요" 안내. 별도 캐스케이딩 UI를 칩 팝오버에 넣을지 검토
3. **칩 저장/복원**: 현재 칩은 메모리 상태만 유지. 세션 간 유지가 필요하면 localStorage 또는 DB 저장 추가
4. **버블 페이지 필터**: `BUBBLE_FILTER_ATTRIBUTES`는 정의되어 있고 `accentType: 'social'` 지원 추가됨. 버블 목록에도 동일 시스템 적용 가능
5. **NyamSelect Portal 변경 영향**: 프로젝트 전체에서 사용되는 공용 컴포넌트이므로, 다른 페이지(기록 플로우, 설정 등)에서 드롭다운 동작 확인 필요
