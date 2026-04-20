# S10-T3: 와인 산지 드릴다운 지도

> S6-T2 간이 버전(`wine-region-map-simple.tsx`)을 3단계 드릴다운으로 고도화.
> SSOT: `pages/10_PROFILE.md`, `S6/02_profile.md` §6-12

---

## 1. 드릴다운 구조

| Level | 배경 | 내용 | 인터랙션 |
|-------|------|------|----------|
| **0: 세계** | `#1a1520` (다크) | 국가 마커 (wine 색상, 크기=와인 수), 와인 도트 (레드/화이트/로제/스파클링 색상) | 국가 탭 → Level 1 |
| **1: 국가** | `#1a1520` | 국가 윤곽선, 산지별 반투명 fill, 미탐험 산지 점선 | 산지 탭 → Level 2, ← 뒤로 |
| **2: 산지** | `#1a1520` | 산지 윤곽선 + 서브 AOC, CTA 버튼 | ← 뒤로 |

---

## 2. 컴포넌트

### `src/presentation/components/profile/wine-region-map.tsx` (신규)

```typescript
interface WineRegionMapProps {
  data: WineRegionMapData[]
}

// 내부 상태
// drillLevel: 0 | 1 | 2
// drillTarget: { country?: string; region?: string } | null
```

---

## 3. Level별 상세

### Level 0: 세계 뷰

- 대륙 SVG path (`map-world.ts`)
- 국가 마커: `accent-wine` 원형, 와인 수 비례 크기
- 마커 옆 와인 타입 도트 (최대 4개):
  - 레드: `#722F37`
  - 화이트: `#D4C98A`
  - 로제: `#E8A0B0`
  - 스파클링: `#C8D8A0`
- 국가 마커 탭 → Level 1

### Level 1: 국가 상세

- 헤더: ← 뒤로 + 국가명 + 총 와인 수
- 국가 윤곽선 SVG path (`map-countries/{code}.ts`)
- 산지별 영역:
  - 탐험 산지: 반투명 fill (`accent-wine/30%`), 산지명 라벨, 와인 수
  - 미탐험 산지: 점선 border, opacity 0.3
- 산지 탭 → Level 2

### Level 2: 산지 상세

- 헤더: ← 뒤로 + 산지명
- 산지 윤곽선 확대 SVG
- 서브 AOC/하위 지역 표시 (있으면)
- 와인 타입별 분포 바
- "이 산지의 와인 보기" CTA 버튼 (→ 홈 필터 적용)

---

## 4. 와인 타입 색상 (SSOT)

| 타입 | 색상 | 변수 |
|------|------|------|
| 레드 | `#722F37` | — |
| 화이트 | `#D4C98A` | — |
| 로제 | `#E8A0B0` | — |
| 스파클링 | `#C8D8A0` | — |

---

## 5. 애니메이션

- 드릴 전환: `transform: scale()` + `opacity` 0.2s ease
- Level 0→1: 해당 국가로 줌인
- Level 1→2: 해당 산지로 줌인
- 뒤로: 줌아웃

---

## 6. 완료 기준

```
□ Level 0→1→2 드릴다운 정상 동작
□ 뒤로 버튼 → 상위 레벨 복귀
□ 와인 타입별 도트 색상 정확
□ 미탐험 산지 점선 표시
□ P1 국가 3개 (FR, IT, ES) SVG path 포함
□ 줌 애니메이션 동작
□ 360px 모바일 레이아웃 정상
□ 빈 상태 처리 (와인 기록 없을 때)
```
