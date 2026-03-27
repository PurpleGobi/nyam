# RECOMMENDATION — 추천 알고리즘

> affects: HOME(추천 필터칩, 찜 정렬), RESTAURANT_DETAIL(추천 뷰모드), WINE_DETAIL(음식 페어링)

---

## 1. 추천 철학

- **내 데이터가 먼저** — 기록 충분하면 외부 데이터는 배경으로
- **상황이 핵심** — 혼밥/데이트/회식에서 원하는 게 다르다
- **신뢰가 필터** — 알고리즘보다 "아는 사람의 경험" 우선
- **추천은 별도 필터칩** — 홈 식당 탭 → `추천` 필터칩에서 노출, 주인공은 내 기록
- **식당 전용** — 와인 탭에는 추천 칩 없음 (시음/찜/셀러만), 와인 추천은 Phase 2 검토

> Discover(탐색) 화면은 추천이 아닌 **지역 기반 탐색**이다. 정렬 기준은 DISCOVER.md 참조.

---

## 2. Phase 1 추천 (규칙 기반, SQL로 충분)

### 추천 카드 구성

`추천` 필터칩 진입 시 표시되는 카드는 아래 추천 소스를 혼합하여 추천순으로 정렬:

| 소스 태그 | 배경 | 텍스트 | 표시 내용 | 예시 |
|-----------|------|--------|-----------|------|
| `AI` | `rgba(126,174,139,0.15)` | `--positive` | 개인화 추천 메시지 | "오마카세를 좋아하시니까 여기도 좋아하실 거예요" |
| `버블` | `rgba(122,155,174,0.15)` | `--accent-social` | 버블 멤버명 + 점수 + 한줄평 | **박소연** 91 · "을지로 프렌치 최고" |
| `웹` | `var(--bg-page)` | `--text-hint` | N/K/G 외부 평점 | N4.4 K4.2 G4.3 |

- 각 카드에 인게이지먼트 표시: ♡ + 💬
- 미방문 추천 카드 점수는 `not-mine` 스타일 (`--text-hint` 색상), 재방문 추천은 내 점수(accent 색상) 표시
- AI 추천 카드는 개인화 메시지 필수 (취향 분석, 새 동네 탐험, 재방문 제안 등)
- 버블 추천 카드는 Phase 1부터 노출 (버블 멤버의 높은 평가 기록 기반)
- 카드 형식은 HOME.md §3-4 플레이스 카드와 동일 (compact/detail 뷰 모두 지원)

### 2-1. 재방문 추천 — "다시 가고 싶은 곳"
**트리거**: 홈 식당 탭 → `추천` 필터칩 진입
**소스 태그**: AI

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
**트리거**: 홈 식당 탭 → `추천` 필터칩 + 필터에서 `상황 is [값]` 선택
**소스 태그**: AI

#### 상황 태그 매핑

| UI 라벨 (한글) | DB 값 (영문) | 색상 |
|---------------|-------------|------|
| 혼밥 | solo | `--scene-solo` #7A9BAE |
| 데이트 | romantic | `--scene-romantic` #B8879B |
| 친구 | friends | `--scene-friends` #7EAE8B |
| 가족 | family | `--scene-family` #C9A96E |
| 회식 | business | `--scene-business` #8B7396 |
| 술자리 | drinks | `--scene-drinks` #B87272 |

```sql
WHERE r.scene = :selected_scene AND r.satisfaction >= 75
```

### 2-3. 사분면 필터
사분면 좌표는 추천의 **필터 조건**으로만 사용:
```sql
-- "데이트인데 고급스러운 곳"
WHERE r.scene = 'romantic' AND r.axis_x >= 60 AND r.axis_y >= 60 AND r.satisfaction >= 80
```

### 2-4. 찜 리마인드
**위치**: 홈 식당 탭 → `찜` 필터칩
**기본 정렬**: 저장순 (저장 날짜 내림차순)

찜 목록 자체는 저장순이 기본이며, 거리 기반 리마인드는 **지역 푸시**(2-8)와 연계:

```sql
-- 찜 목록 기본 정렬
ORDER BY bookmarked_at DESC;

-- 지역 푸시 시 찜 항목 우선순위
ORDER BY
  (1 / (거리 + 1)) * 0.6          -- 가까운 곳 우선
  + (오래된 찜 일수 * 0.01) * 0.4   -- 오래 찜해둔 곳 리마인드
LIMIT 5;
```

### 2-5. 권위 추천 (콜드스타트/새 지역)
**트리거**: 기록 < 5개 or 새 지역
**소스 태그**: AI (+ 웹 소스 병기)

우선순위:
1. 미슐랭/블루리본
2. 외부 평점 상위 (N ≥ 4.3 AND K ≥ 4.0 AND G ≥ 4.2)
3. Nyam 전체 사용자 평균 상위

> 권위 추천은 추천 필터칩에 노출. Discover 탐색 화면은 별도 정렬 기준 사용 (DISCOVER.md §7 참조).

### 2-6. 버블 추천
**트리거**: 홈 식당 탭 → `추천` 필터칩 진입
**소스 태그**: 버블

버블 멤버가 높은 점수를 준 식당을 추천 탭에 혼합 노출:

```sql
SELECT br.target_id, br.user_id, br.satisfaction, br.comment, u.nickname,
       b.visibility  -- 'public' | 'private'
FROM records br
JOIN bubble_members bm ON br.user_id = bm.user_id
JOIN bubbles b ON bm.bubble_id = b.id
JOIN users u ON br.user_id = u.id
WHERE bm.bubble_id IN (SELECT bubble_id FROM bubble_members WHERE user_id = :me)
  AND br.target_type = 'restaurant'
  AND br.satisfaction >= 80
  AND br.target_id NOT IN (SELECT target_id FROM records WHERE user_id = :me AND target_type = 'restaurant')
ORDER BY br.satisfaction DESC;
```

#### private 버블 처리
- `visibility = 'public'` → 소스 태그 `버블` + 멤버명 + 점수 표시
- `visibility = 'private'` → 소스 태그 `AI`로 표시 (버블 존재 자체를 비노출, BUBBLE.md §6-3 참조)

### 2-7. 와인 페어링
**트리거**: 와인 기록 플로우(풍성화) 진입 시

와인 기록 시 WSET 기반 **8-카테고리 음식 페어링 그리드**를 AI가 자동 추천:

| 카테고리 | 예시 |
|----------|------|
| 적색육 | 스테이크 · 양갈비 · 오리 · 사슴 |
| 백색육 | 닭 · 돼지 · 송아지 · 토끼 |
| 어패류 | 생선 · 갑각류 · 조개 · 굴 · 초밥 |
| 치즈·유제품 | 숙성 · 블루 · 브리 · 크림소스 |
| 채소·곡물 | 버섯 · 트러플 · 리조또 · 파스타 |
| 매운·발효 | 커리 · 마라 · 김치 · 된장 |
| 디저트·과일 | 다크초콜릿 · 타르트 · 건과일 |
| 샤퀴트리·견과 | 하몽 · 살라미 · 아몬드 · 올리브 |

```
와인 특성(바디, 산미, 당도 등) → WSET 페어링 규칙 → 카테고리 자동 선택(AI 추천) → 사용자 확인/수정
```

- 와인 상세 페이지에서는 저장된 페어링 정보를 **음식 페어링** 태그로 표시 (읽기 전용)
- 직접 입력 필드도 제공 (예: "트러플 리조또")

### 2-8. 지역 푸시
**트리거**: geofence 진입

내 높은 평가 + 내 찜(2-4 거리 기반 로직) + 권위 추천 조합

---

## 3. Phase 2: 소셜 추천 확장

### 버블 기반 점수 고도화
Phase 1에서는 단순 점수 기반, Phase 2에서는 신뢰 가중 점수:
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

### 와인 추천 (검토)
와인 탭에 `추천` 필터칩 추가 여부를 Phase 2에서 검토. 후보:
- 품종 유사도 기반 추천
- 버블 와인 추천
- 음식 페어링 역매칭 (식당 기록 → 어울리는 와인)

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
| 와인 페어링 | 3개 | 10개 |
| 버블 추천 | 가입 버블 1개, 멤버 기록 5+ | 버블 3+, 기록 30+ |
| CF (P2+) | 전체 1000+, 개인 20+ | 10000+, 50+ |

---

## 6. API 구조 (Phase 1)

```
/api/recommend/revisit      — 재방문 추천
/api/recommend/scene         — 상황별 추천
/api/recommend/authority     — 권위 추천
/api/recommend/bubble        — 버블 추천
/api/recommend/wine-pairing  — 와인 페어링
```
캐싱: 30분 TTL, 위치 변경 시 무효화

> 찜 리마인드는 별도 API 없이 찜 목록 조회 + 정렬 옵션으로 처리.
> 추천 탭 진입 시 revisit + authority + bubble을 병합하여 추천순 정렬.

### 추천순 정렬 기준

각 추천 타입별 점수를 정규화(0~100)한 뒤 병합 정렬:

```
추천 점수 = 타입별_관련도_점수 (0~100)
  - 재방문: §2-1 ORDER BY 공식 결과 정규화
  - 권위: 외부 평점 평균 정규화 + 뱃지 가산
  - 버블: 멤버 만족도 * (1 + log(평가 멤버 수))
```

동점 시 최신 데이터 우선. 기본 정렬은 "추천순"이며, 소팅 버튼으로 최신순/권위순/별점순 등으로 전환 가능 (HOME.md §3-3 정렬 행 참조).

---

## 7. 추천 타입 요약

| # | 타입 | Phase | 소스 태그 | 노출 위치 |
|---|------|-------|-----------|-----------|
| 1 | 재방문 | P1 | AI | 추천 필터칩 |
| 2 | 상황별 | P1 | AI | 추천 필터칩 + 상황 필터 |
| 3 | 사분면 유사 | P1 | AI | 추천 필터칩 + 사분면 필터 |
| 4 | 권위 | P1 | AI + 웹 | 추천 필터칩 (콜드스타트) |
| 5 | 버블 | P1 | 버블 | 추천 필터칩 |
| 6 | 와인 페어링 | P1 | AI | 와인 기록 풍성화 |
| 7 | 지역 푸시 | P1 | 혼합 | 푸시 알림 |

---

## 8. 품질 지표

| 지표 | 목표 |
|------|------|
| CTR | > 15% |
| 추천→기록 전환 | > 5% |
| 추천→찜 추가 | > 10% |
| 추천 기반 방문 만족도 | >= 80 |
