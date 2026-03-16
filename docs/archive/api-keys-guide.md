# API Key 발급 가이드

Nyam 앱에서 사용하는 외부 API 키 발급 방법.

---

## 1. Kakao REST API Key

식당 검색의 주 데이터 소스. Kakao Local API (키워드 검색)를 사용.

### 발급 절차

1. [Kakao Developers](https://developers.kakao.com/) 접속
2. 로그인 후 **내 애플리케이션** > **애플리케이션 추가하기**
3. 앱 이름: `Nyam` (또는 원하는 이름)
4. 사업자명: 개인 이름 입력
5. 생성된 앱 클릭 > **앱 키** 탭
6. **REST API 키** 복사

### .env.local 설정

```
KAKAO_REST_API_KEY=여기에_REST_API_키_붙여넣기
```

### 사용량 제한

| 항목 | 제한 |
|------|------|
| 일일 요청 | 300,000건 (기본) |
| 초당 요청 | 30건 |
| 비용 | 무료 |

### 참고

- 별도의 도메인 등록 불필요 (서버 사이드 호출)
- 키워드 검색 API 문서: https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword

---

## 2. Naver Search API (Client ID + Secret)

식당 정보 보강용. 네이버 지역 검색 API를 사용하여 리뷰 수, 설명 등을 가져옴.

### 발급 절차

1. [Naver Developers](https://developers.naver.com/) 접속
2. 로그인 후 **Application** > **애플리케이션 등록**
3. 애플리케이션 이름: `Nyam`
4. **사용 API** 선택:
   - `검색` 체크 (지역 검색 포함)
5. **비로그인 오픈 API 서비스 환경** 추가:
   - 환경: `WEB 설정`
   - 웹 서비스 URL: `http://localhost:5588` (개발용)
6. 등록 완료 후 **Client ID**와 **Client Secret** 확인

### .env.local 설정

```
NAVER_CLIENT_ID=여기에_Client_ID_붙여넣기
NAVER_CLIENT_SECRET=여기에_Client_Secret_붙여넣기
```

### 사용량 제한

| 항목 | 제한 |
|------|------|
| 일일 요청 | 25,000건 |
| 비용 | 무료 |

### 참고

- 지역 검색 API 문서: https://developers.naver.com/docs/serviceapi/search/local/local.md
- 프로덕션 배포 시 웹 서비스 URL을 실제 도메인으로 변경 필요

---

## 최종 .env.local 형식

```bash
# Tavily (웹 검색)
TAVILY_API_KEY=tvly-xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
SUPABASE_ACCESS_TOKEN=sbp_xxx

# Kakao Local API (식당 검색)
KAKAO_REST_API_KEY=발급받은_REST_API_키

# Naver Search API (식당 정보 보강)
NAVER_CLIENT_ID=발급받은_Client_ID
NAVER_CLIENT_SECRET=발급받은_Client_Secret
```

---

## 키 없이도 동작하나요?

Kakao/Naver 키가 없으면 외부 검색이 비활성화되고, Supabase DB에 이미 저장된 식당만 표시됩니다. 에러 없이 빈 결과가 반환됩니다.
