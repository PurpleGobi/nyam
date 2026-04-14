-- 069: follow_counts RPC — followers, following, mutual 카운트를 1회 쿼리로
CREATE OR REPLACE FUNCTION follow_counts(p_user_id UUID)
RETURNS TABLE(followers BIGINT, following BIGINT, mutual BIGINT) AS $$
  SELECT
    (SELECT count(*) FROM follows WHERE following_id = p_user_id AND status = 'accepted') AS followers,
    (SELECT count(*) FROM follows WHERE follower_id = p_user_id AND status = 'accepted') AS following,
    (SELECT count(*) FROM follows f1
     INNER JOIN follows f2
       ON f1.following_id = f2.follower_id
       AND f1.follower_id = f2.following_id
     WHERE f1.follower_id = p_user_id
       AND f1.status = 'accepted'
       AND f2.status = 'accepted') AS mutual;
$$ LANGUAGE sql STABLE;
