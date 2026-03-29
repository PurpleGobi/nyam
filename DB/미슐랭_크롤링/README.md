# 미슐랭 가이드 크롤러

guide.michelin.com에서 전 세계 미슐랭 스타/빕구르망 레스토랑 데이터를 수집합니다.

## 설치

```bash
cd DB/미슐랭_크롤링
pip install -r requirements.txt
playwright install chromium
```

## 사용법

```bash
# 전체 크롤링 (12개국, 4등급)
python crawl_michelin.py

# 한국만
python crawl_michelin.py --country south-korea

# 한국 서울 3스타만
python crawl_michelin.py --country south-korea --city seoul --star 3-stars

# DB 저장 없이 CSV만 (테스트)
python crawl_michelin.py --country south-korea --dry-run

# 상세 페이지도 크롤링 (주소, 전화번호 등)
python crawl_michelin.py --country south-korea --detail

# 브라우저 표시 (디버깅)
python crawl_michelin.py --country south-korea --no-headless
```

## 대상 국가

| 국가 | 도시 |
|------|------|
| 한국 | 서울, 부산 |
| 일본 | 도쿄, 교토, 오사카 |
| 프랑스 | 파리, 리옹 |
| 이탈리아 | 로마, 밀라노 |
| 스페인 | 마드리드, 바르셀로나 |
| 미국 | 뉴욕, LA, 시카고, SF |
| 영국 | 런던 |
| 독일 | 베를린, 뮌헨 |
| 태국 | 방콕 |
| 싱가포르 | 싱가포르 |
| 홍콩 | 홍콩 |
| 대만 | 타이베이 |

## 출력

- `data/michelin_YYYYMMDD_HHMMSS.csv` — CSV 파일
- Supabase `restaurant_accolades` 테이블 — DB 저장 (--dry-run 없을 때)

## 등급별 prestige_tier

| 등급 | tier | 점수 |
|------|------|------|
| 3스타 | S | 15 |
| 2스타 | S | 15 |
| 1스타 | A | 10 |
| 빕구르망 | B | 5 |
