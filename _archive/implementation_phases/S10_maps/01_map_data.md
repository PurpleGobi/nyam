# S10-T1: SVG 지도 데이터 준비

> 식당/와인 드릴다운 지도에 공통으로 사용할 SVG path 데이터 구축.

---

## 1. 필요 데이터

### 세계 지도 (Level 0 공통)

- 대륙 윤곽선 SVG path (6대륙)
- viewBox: `0 0 1000 500` (2:1 비율)
- 주요 와인/식당 생산국 10~15개 국가 영역 하이라이트 가능

### 국가별 윤곽선 (Level 1)

와인 주요 생산국 우선:

| 국가 | ISO | 우선순위 | 비고 |
|------|-----|---------|------|
| 프랑스 | FR | P1 | 보르도/부르고뉴/샹파뉴/론/루아르/알자스 |
| 이탈리아 | IT | P1 | 토스카나/피에몬테/베네토/시칠리아 |
| 스페인 | ES | P1 | 리오하/리베라델두에로/프리오랏 |
| 미국 | US | P2 | 나파/소노마/오레곤/워싱턴 |
| 호주 | AU | P2 | 바로사/마가렛리버/야라밸리 |
| 칠레 | CL | P2 | 마이포/카사블랑카/콜차과 |
| 아르헨티나 | AR | P2 | 멘도사 |
| 독일 | DE | P2 | 모젤/라인가우 |
| 포르투갈 | PT | P3 | 도우루/알렌테주 |
| 뉴질랜드 | NZ | P3 | 말보로/센트럴오타고 |
| 남아공 | ZA | P3 | 스텔렌보쉬 |
| 일본 | JP | P3 | 야마나시/홋카이도 |
| 한국 | KR | P3 | 식당 지도용 |

### 산지 윤곽선 (Level 2, 와인 전용)

- 국가 내 주요 산지 영역 SVG path
- 서브 AOC/하위 지역 경계선

---

## 2. 데이터 소스 전략

### 옵션 A: Natural Earth (추천)

- [Natural Earth](https://www.naturalearthdata.com/) 1:110m 해상도
- TopoJSON → SVG path 변환
- 라이선스: Public Domain

### 옵션 B: 직접 간소화 SVG

- 복잡한 해안선을 단순화한 커스텀 path
- 파일 크기 최소화 (국가당 ~1KB 목표)

---

## 3. 파일 구조

```
src/shared/constants/
├── map-world.ts          # 세계 지도 대륙 path + 국가 중심점
├── map-countries/
│   ├── fr.ts             # 프랑스 윤곽선 + 산지 영역
│   ├── it.ts             # 이탈리아
│   ├── es.ts             # 스페인
│   └── ...
└── map-types.ts          # 공통 타입 정의
```

### 타입 정의

```typescript
// src/shared/constants/map-types.ts

export interface CountryMapData {
  code: string              // ISO 3166-1 alpha-2
  name: string
  nameKo: string
  path: string              // SVG path d attribute
  center: [number, number]  // [lat, lng] 라벨 위치
  regions?: RegionMapData[]
}

export interface RegionMapData {
  name: string
  nameKo: string
  path: string
  center: [number, number]
  subRegions?: { name: string; nameKo: string; path: string }[]
}

export interface ContinentPath {
  name: string
  path: string
}
```

---

## 4. 완료 기준

```
□ 세계 지도 대륙 path 6개
□ P1 국가 윤곽선 3개 (FR, IT, ES)
□ P1 국가 주요 산지 path (최소 3개/국가)
□ 타입 정의 완료
□ 총 번들 크기 < 50KB (gzipped)
```
