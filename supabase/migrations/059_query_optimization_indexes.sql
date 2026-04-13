-- ============================================================
-- 059: 쿼리 최적화 인덱스
-- 목적: 검색/필터링 전반의 응답 시간 단축
-- 근거: docs/Nyam 개념문서/DB_쿼리_리팩토링_구현계획.md (섹션 5)
--        docs/Nyam 개념문서/DB_인덱싱_전략.md (분석/측정 데이터)
-- 영향: 읽기 전용 변경, 코드 수정 없이 즉시 효과
-- 롤백: 각 CREATE INDEX의 역은 DROP INDEX
-- ============================================================

-- ── restaurants ──────────────────────────────────────────────

-- R-SEARCH: address trgm (텍스트 검색 OR에서 643ms → ~5ms)
CREATE INDEX IF NOT EXISTS idx_restaurants_address_trgm
  ON restaurants USING GIN (address gin_trgm_ops);

-- R-ENUM: genre btree (지도뷰 genre EQ 필터, 홈뷰 필터)
CREATE INDEX IF NOT EXISTS idx_restaurants_genre
  ON restaurants USING btree (genre);

-- R-FILTER: district btree (홈뷰/지도뷰 district 필터)
CREATE INDEX IF NOT EXISTS idx_restaurants_district
  ON restaurants USING btree (district);

-- R-FILTER + R-PAGINATE: genre 필터 + name 정렬 복합 (지도뷰, 홈뷰)
CREATE INDEX IF NOT EXISTS idx_restaurants_genre_name
  ON restaurants USING btree (genre, name);

-- R-FILTER: area GIN (TEXT[] 배열에 대한 ANY() 연산 지원)
-- 기존 idx_restaurants_area(btree)는 .eq() 정확 매칭용으로 유지
CREATE INDEX IF NOT EXISTS idx_restaurants_area_gin
  ON restaurants USING GIN (area);

-- 미사용 인덱스 삭제 (코드 전체 검색으로 WHERE절 사용처 0건 확인)
DROP INDEX IF EXISTS idx_restaurants_country_city;
DROP INDEX IF EXISTS idx_restaurants_data_source;
DROP INDEX IF EXISTS idx_restaurants_is_closed;


-- ── wines ────────────────────────────────────────────────────
-- 기존 인덱스: wines_pkey, idx_wines_country, idx_wines_region, idx_wines_type

-- R-SEARCH: name trgm (와인 검색 name ILIKE)
CREATE INDEX IF NOT EXISTS idx_wines_name_trgm
  ON wines USING GIN (name gin_trgm_ops);

-- R-SEARCH: producer trgm (와인 검색 producer ILIKE)
CREATE INDEX IF NOT EXISTS idx_wines_producer_trgm
  ON wines USING GIN (producer gin_trgm_ops);

-- R-ENUM + R-PAGINATE: wine_type + name 복합 (홈뷰 필터+정렬)
-- idx_wines_type(wine_type 단독)을 대체
CREATE INDEX IF NOT EXISTS idx_wines_type_name
  ON wines USING btree (wine_type, name);

DROP INDEX IF EXISTS idx_wines_type;

-- R-FILTER: variety (홈뷰 포도품종 필터)
CREATE INDEX IF NOT EXISTS idx_wines_variety
  ON wines USING btree (variety);

-- ※ acidity_level, sweetness_level: 카디널리티 3이므로 인덱스 불필요. RPC WHERE만 적용
-- ※ vintage: EQ/범위 쿼리 빈도 낮으므로 보류


-- ── users ────────────────────────────────────────────────────

-- R-SEARCH: nickname trgm (버블 초대, 사용자 검색)
CREATE INDEX IF NOT EXISTS idx_users_nickname_trgm
  ON users USING GIN (nickname gin_trgm_ops);

-- R-FILTER: 공개 유저 partial (홈뷰 public 소스)
CREATE INDEX IF NOT EXISTS idx_users_is_public
  ON users USING btree (is_public) WHERE is_public = true;


-- ── records ──────────────────────────────────────────────────

-- R-FILTER + R-PAGINATE: target별 기록 + 날짜 정렬 (상세 페이지)
CREATE INDEX IF NOT EXISTS idx_records_target_date
  ON records USING btree (target_id, target_type, visit_date DESC);


-- ── follows ──────────────────────────────────────────────────

-- R-MUTUAL: accepted 팔로잉 partial (홈뷰 following, 맞팔 확인)
CREATE INDEX IF NOT EXISTS idx_follows_follower_accepted
  ON follows USING btree (follower_id, following_id)
  WHERE status = 'accepted';

-- R-MUTUAL: accepted 팔로워 partial (프로필, 팔로워 목록)
CREATE INDEX IF NOT EXISTS idx_follows_following_accepted
  ON follows USING btree (following_id, follower_id)
  WHERE status = 'accepted';
