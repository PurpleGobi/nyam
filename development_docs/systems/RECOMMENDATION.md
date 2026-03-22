# RECOMMENDATION — 추천 알고리즘

> affects: HOME, RESTAURANT_DETAIL, WINE_DETAIL, DISCOVER

---

## 1. 추천 철학

- **내 데이터가 먼저** — 기록 충분하면 외부 데이터는 배경으로
- **상황이 핵심** — 혼밥/데이트/회식에서 원하는 게 다르다
- **신뢰가 필터** — 알고리즘보다 "아는 사람의 경험" 우선
- **추천은 별도 서브탭** — 홈 식당 탭 → `추천` 서브탭에서 노출, 주인공은 내 기록

---

## 2. Phase 1 추천 (규칙 기반, SQL로 충분)

### 2-1. 재방문 추천 — "다시 가고 싶은 곳"
**트리거**: 홈 식당 탭 → `추천` 서브탭 진입

```sql
SELECT r.target_id,
       AVG(r.satisfaction) as avg_score,
       MAX(r.created_at) as last_visit,
       COUNT(*) as visit_count
FROM records r
WHERE r.user_id = :user AND r.target_type = 'restaurant'
  AND r.satisfaction >= 80
GROUP BY r.target_id
ORDER BY
  (AVG(r.satisfaction) * 0.6)                          -- 60%: 내 평가
  + (EXTRACT(DAY FROM NOW() - MAX(r.created_at)) * 0.002 * 100) * 0.3  -- 30%: 오래 안 감
  + (LEAST(COUNT(*), 5) * 4) * 0.1                     -- 10%: 재방문 보너스
  DESC
LIMIT 10;
```

### 2-2. 상황별 추천
**트리거**: 홈 식당 탭 → `추천` 서브탭 + 필터에서 `상황 is [값]` 선택

```sql
WHERE r.scene = :selected_scene AND r.satisfaction >= 75  -- scene 값: 'solo','romantic','friends','family','business','drinks'
```

### 2-3. 사분면 필터
사분면 좌표는 추천의 **필터 조건**으로만 사용:
```sql
-- "데이트인데 고급스러운 곳"
WHERE r.scene = 'romantic' AND r.axis_x >= 60 AND r.axis_y >= 60 AND r.satisfaction >= 80
```

### 2-4. 찜 리마인드
**트리거**: 홈 식당 탭 → `찜` 서브탭 진입 / 위치 변경 시

```sql
ORDER BY
  (1 / (거리 + 1)) * 0.6          -- 가까운 곳 우선
  + (오래된 찜 일수 * 0.01) * 0.4   -- 오래 찜해둔 곳 리마인드
LIMIT 5;
```

### 2-5. 권위 추천 (콜드스타트/새 지역)
**트리거**: 기록 < 5개 or 새 지역

우선순위:
1. 미슐랭/블루리본
2. 외부 평점 상위 (N ≥ 4.3 AND K ≥ 4.0 AND G ≥ 4.2)
3. Nyam 전체 사용자 평균 상위

### 2-6. 와인 페어링
**트리거**: 홈 와인 탭 → 카메라 3모드 또는 와인 상세에서 메뉴 입력

```
음식 카테고리 매핑 → WSET 기반 페어링 규칙 → 내 와인 기록에서 필터 → 없으면 DB 추천
```

### 2-7. 지역 푸시
**트리거**: geofence 진입

내 높은 평가 + 내 찜 + 권위 추천 조합

---

## 3. Phase 2: 소셜 추천

### 버블 기반
```
score = AVG(member_ratings) * 0.4
      + COUNT(unique_members) * 0.3
      + trust_weight * 0.3  -- 경험치 높은 멤버 가중
```

### 취향 유사도 (CF)
```sql
-- 같은 식당에 비슷한 만족도 → 취향 비슷
SELECT other.user_id, AVG(ABS(my.satisfaction - other.satisfaction)) as avg_diff
FROM records my JOIN records other ON my.target_id = other.target_id
WHERE my.user_id = :user AND other.user_id != :user
GROUP BY other.user_id HAVING COUNT(*) >= 3
ORDER BY avg_diff ASC LIMIT 20;
```

---

## 4. Phase 3: ML Hybrid

```
최종 점수 = α×Content + β×CF + γ×Context + δ×Social
가중치 동적: 기록<10 → α높음, 기록50+ → β,δ높음
```

---

## 5. 콜드스타트 해소 기준

| 유형 | 최소 | 충분 |
|------|------|------|
| 재방문 | 5개 | 20개 |
| 상황별 | 상황 2종, 각 3개 | 각 10개 |
| 와인 | 3개 | 10개 |
| CF (P2+) | 전체 1000+, 개인 20+ | 10000+, 50+ |

---

## 6. API 구조 (Phase 1)

```
/api/recommend/revisit    — 재방문 추천
/api/recommend/scene      — 상황별 추천
/api/recommend/wishlist   — 찜 리마인드
/api/recommend/authority  — 권위 추천
/api/recommend/wine-pairing — 와인 페어링
```
캐싱: 30분 TTL, 위치 변경 시 무효화

---

## 7. 품질 지표

| 지표 | 목표 |
|------|------|
| CTR | > 15% |
| 추천→기록 전환 | > 5% |
| 추천→찜 추가 | > 10% |
| 추천 기반 방문 만족도 | >= 80 |
