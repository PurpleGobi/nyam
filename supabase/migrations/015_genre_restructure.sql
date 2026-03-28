-- 015: 식당 장르 체계 변경 (19개 → 16개)
-- 글로벌 앱에 맞게 국가/지역 기반으로 재편
-- 6대분류: 동아시아 / 동남아·남아시아 / 유럽 / 아메리카 / 음료·디저트 / 기타

-- Step 1: 기존 데이터 변환
UPDATE restaurants SET genre = '이탈리안' WHERE genre = '양식';
UPDATE restaurants SET genre = '기타' WHERE genre = '동남아';
UPDATE restaurants SET genre = '기타' WHERE genre = '아시안';
UPDATE restaurants SET genre = '프렌치' WHERE genre = '파인다이닝';
UPDATE restaurants SET genre = '프렌치' WHERE genre = '비스트로';
UPDATE restaurants SET genre = '바/주점' WHERE genre = '주점';
UPDATE restaurants SET genre = '바/주점' WHERE genre = '바';

-- Step 2: CHECK 제약 교체
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS chk_restaurants_genre;
ALTER TABLE restaurants ADD CONSTRAINT chk_restaurants_genre CHECK (genre IS NULL OR genre IN (
  '한식', '일식', '중식',
  '태국', '베트남', '인도',
  '이탈리안', '프렌치', '스페인', '지중해',
  '미국', '멕시칸',
  '카페', '바/주점', '베이커리',
  '기타'
));
