# 07: 추천 알고리즘 (7종)

> 홈 식당 탭 추천 필터칩에 노출되는 7종 추천 알고리즘. **현재 전체 미구현.**

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `systems/RECOMMENDATION.md` | §2 Phase 1 추천 전체 (2-1 ~ 2-8), §5 콜드스타트, §6 API |
| `pages/06_HOME.md` | §3-2-3 추천 서브탭, §3-2 추천 칩 카운트 |
| `systems/DATA_MODEL.md` | §5-2 ai_recommendations 테이블 |

---

## 구현 상태: 미구현

추천 시스템의 모든 구성 요소가 미구현 상태:

```
(미구현)
- src/domain/entities/recommendation.ts                          ← AIRecommendation 엔티티
- src/domain/services/recommendation-service.ts                  ← 추천 점수 계산 + 병합 정렬
- src/domain/repositories/recommendation-repository.ts           ← RecommendationRepository 인터페이스
- src/infrastructure/repositories/supabase-recommendation-repository.ts
- src/application/hooks/use-recommendations.ts                   ← 추천 데이터 조회 + 통합
- src/presentation/components/home/recommendation-card.tsx       ← 추천 카드 UI
- src/presentation/components/home/recommendation-source-tag.tsx
- src/app/api/recommend/revisit/route.ts                         ← 재방문 추천 API
- src/app/api/recommend/scene/route.ts                           ← 상황별 추천 API
- src/app/api/recommend/authority/route.ts                       ← 권위 추천 API
- src/app/api/recommend/bubble/route.ts                          ← 버블 추천 API
- src/app/api/recommend/wine-pairing/route.ts                    ← 와인 페어링 API
```

---

## 설계 문서 (구현 시 참조)

### 7종 알고리즘 분류

#### 자동 호출 (기본 병합 대상) — 3종

| # | 알고리즘 | 점수 계산 | 소스 태그 |
|---|---------|----------|----------|
| 1 | 재방문 | 60% 만족도 + 30% 오래 안 감 + 10% 재방문 보너스 | AI |
| 2 | 권위 | 외부 평점 정규화 + 미슐랭/블루리본 가산 | 웹 |
| 3 | 버블 | 멤버 만족도 × (1 + log₁₀(평가 멤버 수)) | 버블 |

#### 온디맨드 호출 (사용자 액션 시) — 4종

| # | 알고리즘 | 호출 시점 | Phase |
|---|---------|----------|-------|
| 4 | 상황별 | 사용자가 상황 필터 선택 시 | Phase 1 |
| 5 | 사분면 | 사분면 범위 지정 시 | Phase 1 |
| 6 | 찜 리마인드 | 찜한 식당 근처 위치 시 (geofence) | Phase 2 |
| 7 | 와인 페어링 | 음식 페어링 카테고리 선택 시 | Phase 1 |

### 콜드스타트 임계값

| 기록 수 | 자동 호출 범위 |
|---------|-------------|
| < 5개 | 권위만 |
| 5~19개 | 재방문 + 권위 + 버블 |
| 20+ | 전체 |

### 병합 정렬

- 각 알고리즘 결과를 normalizedScore (0~100)로 정규화
- 중복 제거 (targetId 기준)
- normalizedScore DESC 통합 정렬
- 캐싱: 30분 TTL

---

## 참고

Discover 서브스크린(`08_discover.md`)에서는 Google Places API + AI 랭킹 기반의 별도 탐색 시스템이 구현되어 있어, 추천 시스템의 일부 역할(권위 추천 등)을 대체하고 있다.
