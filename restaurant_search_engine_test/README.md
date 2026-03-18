# Restaurant Search Engine Test

식당 검색 엔진 파이프라인 비교 테스트.
현재 "LLM 추천 → 검증" 방식의 환각 문제를 해결하기 위해
"실제 데이터 수집 → LLM 평가" 방식을 테스트한다.

## 파이프라인 비교

| 파이프라인 | 방식 | 장점 | 단점 |
|-----------|------|------|------|
| A (현행) | LLM 추천 → 카카오 검증 | 다양한 추천 | 환각 80%+, 느림 |
| B | 카카오 검색 → LLM 평가 | 실존 보장 | 카카오 검색 범위 제한 |
| C | 멀티소스 수집 → LLM 평가 | 풍성한 후보 | API 비용 |
| D | 멀티소스 + 외부 시그널 → LLM 평가 | 가장 정확 | 가장 복잡 |

## 테스트 시퀀스 (Pipeline D)

```
1. 후보 수집 (Search Layer)
   ├── 카카오맵 키워드 검색
   ├── 카카오맵 카테고리 검색
   ├── 네이버 지역 검색
   └── (옵션) 구글 Places

2. 후보 병합 & 중복 제거
   └── 이름+주소 유사도 기반 dedup

3. 외부 시그널 수집 (Signal Layer)
   ├── LLM: 미슐랭/블루리본 등급 조회
   ├── 카카오/네이버 별점 + 리뷰 수
   └── LLM: 웨이팅/예약 난이도, 광고 아닌 리뷰 평판

4. 사용자 필터 적용
   ├── 장르 분류 (카카오 카테고리 기반)
   └── 씬 적합성 사전 필터

5. LLM 평가 & 랭킹
   ├── 씬별 가중치 적용
   ├── 외부 시그널 종합
   └── 최종 점수 + 추천 이유 생성
```

## 실행

```bash
cd restaurant_search_engine_test
pip install -r requirements.txt
cp .env.example .env  # API 키 설정

# 개별 파이프라인 테스트
python test_pipeline_a.py  # 현행: LLM 추천 → 검증
python test_pipeline_b.py  # 카카오 단독 → LLM 평가
python test_pipeline_c.py  # 멀티소스 → LLM 평가
python test_pipeline_d.py  # 멀티소스 + 시그널 → LLM 평가

# 전체 비교
python compare_all.py
```
