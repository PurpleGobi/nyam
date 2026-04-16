-- 1. 기존 리액션 데이터 삭제 (good/bad 외)
DELETE FROM reactions WHERE reaction_type NOT IN ('good', 'bad');

-- 2. 기존 CHECK 제약 삭제 + 새 제약 추가
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS chk_reactions_type;
ALTER TABLE reactions ADD CONSTRAINT chk_reactions_type
  CHECK (reaction_type IN ('good', 'bad'));
