-- auth.users에 새 사용자 가입 시 public.users 테이블에 자동 INSERT
-- AUTH.md §1: "가입 시 users 테이블에 자동 row 생성 (trigger)"
-- AUTH.md §1: "닉네임: 소셜 계정 이름 자동 설정"

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _nickname TEXT;
  _email TEXT;
  _provider TEXT;
  _provider_id TEXT;
  _avatar_url TEXT;
BEGIN
  _nickname := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'preferred_username',
    '냠유저'
  );
  _nickname := LEFT(_nickname, 20);
  _email := NEW.email;
  _provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'google');
  _provider_id := COALESCE(
    NEW.raw_app_meta_data->>'provider_id',
    NEW.id::TEXT
  );
  _avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO public.users (
    id, email, nickname, avatar_url,
    auth_provider, auth_provider_id,
    privacy_profile, privacy_records,
    created_at, updated_at
  ) VALUES (
    NEW.id, _email, _nickname, _avatar_url,
    _provider, _provider_id,
    'bubble_only', 'shared_only',
    NOW(), NOW()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
