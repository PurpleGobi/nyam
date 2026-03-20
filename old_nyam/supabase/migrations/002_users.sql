-- 002: 사용자 테이블
-- TECH_SPEC Section 3-1

CREATE TABLE users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id),
  nickname          VARCHAR NOT NULL,
  avatar_url        TEXT NULL,
  email             VARCHAR NOT NULL,
  auth_provider     auth_provider NOT NULL,
  is_deactivated    BOOLEAN DEFAULT false,
  deactivated_at    TIMESTAMPTZ NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  last_active_at    TIMESTAMPTZ DEFAULT now()
);

-- auth.users 생성 시 자동으로 users 행 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, nickname, email, auth_provider, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', '사용자'),
    COALESCE(NEW.email, ''),
    COALESCE((NEW.raw_app_meta_data ->> 'provider')::public.auth_provider, 'google'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  -- 관련 테이블 초기 행 생성
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id);
  INSERT INTO public.taste_dna_restaurant (user_id) VALUES (NEW.id);
  INSERT INTO public.taste_dna_wine (user_id) VALUES (NEW.id);
  INSERT INTO public.taste_dna_cooking (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
