# S10-T2: 식당 드릴다운 지도

> S6-T2 간이 버전(`restaurant-map.tsx`)을 2단계 드릴다운으로 고도화.
> SSOT: `pages/10_PROFILE.md`, `S6/02_profile.md` §6-11

---

## 1. 드릴다운 구조

| Level | 뷰 | 내용 | 인터랙션 |
|-------|-----|------|----------|
| **0: 세계** | SVG 세계 지도 | 대륙 윤곽선 + 국가/도시 마커 (accent-food, count 비례 크기) | 마커 탭 → Level 1 |
| **1: 도시 목록** | 리스트 뷰 | 해당 국가 도시별 방문 수, 평균 점수, 최근 방문일 | ← 뒤로 → Level 0 |

---

## 2. 컴포넌트

### `src/presentation/components/profile/restaurant-map.tsx` (기존 파일 교체)

```typescript
interface RestaurantMapProps {
  markers: MapMarker[]
}

// 내부 상태
// drillLevel: 0 | 1
// selectedCountry: string | null
```

### Level 0: 세계 뷰

- 배경: `#1a1520`
- 대륙 SVG path (`map-world.ts`)
- 도시 마커: `accent-food` 원형, count 비례 크기 (5/7/10px)
- 6곳+ 마커: 내부 숫자 (흰색)
- 범례: `● 1~2곳 ● 3~5곳 ● 6곳+`
- 국가 영역 탭 → Level 1 전환

### Level 1: 도시 목록

- 헤더: ← 뒤로 + 국가명
- 도시별 행: 도시명 + 방문 수 + 바 (방문 수 비례)
- accent-food 색상 바

---

## 3. 완료 기준

```
□ Level 0 세계 뷰: 실제 대륙 윤곽선 SVG
□ 마커: lat/lng 기반 정확한 위치
□ 탭 → Level 1 도시 목록 전환
□ 뒤로 → Level 0 복귀
□ 360px 레이아웃 정상
□ 빈 상태 처리
```
