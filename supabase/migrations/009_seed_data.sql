insert into prompt_templates (title, description, category, template, variables, is_official, is_public) values
(
  '리뷰 검증',
  '식당 리뷰의 신뢰도를 AI에게 분석 요청',
  'review_verify',
  '[식당명] [지역]의 리뷰를 분석해줘.
네이버, 구글맵, 인스타그램 등 여러 소스의 평판을 종합해서:
1. 체험단/협찬 리뷰 비율이 높은지
2. 최근 6개월 리뷰 트렌드 (개선/악화)
3. 반복 언급되는 긍정/부정 키워드
4. 가격 대비 만족도
5. 실제 방문 가치가 있는지 (10점 만점)
솔직하게 평가해줘.',
  '[{"key":"restaurant_name","label":"식당명","type":"auto"},{"key":"region","label":"지역","type":"auto"}]',
  true, true
),
(
  '상황 맞춤 추천',
  '상황에 맞는 식당 3곳 추천 요청',
  'situation_recommend',
  '[지역]에서 [상황]에 맞는 식당 3곳만 추천해줘.
조건:
- 인원: [인원]명
- 예산: 1인당 [예산]원
- 분위기: [분위기]
- 제외: [제외]
추천 이유와 대표 메뉴, 예상 가격을 포함해줘.
광고/협찬이 아닌 실제 평판 기반으로만.',
  '[{"key":"region","label":"지역","type":"auto"},{"key":"situation","label":"상황","type":"preset"},{"key":"party_size","label":"인원","type":"input"},{"key":"budget","label":"예산","type":"input"},{"key":"mood","label":"분위기","type":"input"},{"key":"exclude","label":"제외","type":"input"}]',
  true, true
),
(
  '비교 분석',
  '여러 식당을 비교 분석 요청',
  'compare',
  '다음 식당들을 비교해줘: [식당A], [식당B], [식당C]
비교 기준: 맛, 가성비, 서비스, 분위기, 대기시간
표 형식으로 정리하고 최종 추천 1곳과 이유를 알려줘.',
  '[{"key":"restaurant_a","label":"식당A","type":"input"},{"key":"restaurant_b","label":"식당B","type":"input"},{"key":"restaurant_c","label":"식당C","type":"input"}]',
  true, true
),
(
  '정보 확인',
  '식당의 최신 영업 정보 확인',
  'info_check',
  '[식당명] [지역] 현재 영업 중인지 확인해줘.
최근 메뉴, 가격, 영업시간, 휴무일, 예약 필요 여부 등
가장 최신 정보를 알려줘.',
  '[{"key":"restaurant_name","label":"식당명","type":"auto"},{"key":"region","label":"지역","type":"auto"}]',
  true, true
),
(
  '숨은 맛집 발굴',
  '광고 없이 입소문으로 유명한 맛집 찾기',
  'hidden_gem',
  '[지역]에서 광고나 인플루언서 없이 입소문으로만 유명한
숨은 맛집을 찾아줘. 조건:
- 네이버 블로그 체험단 리뷰가 적을 것
- 동네 주민/단골이 추천하는 곳
- 오래된 곳 우선
- [음식종류] 중심으로',
  '[{"key":"region","label":"지역","type":"auto"},{"key":"cuisine","label":"음식종류","type":"input"}]',
  true, true
)
on conflict do nothing;

insert into badges (slug, name, description, category, icon, tier, condition) values
('first_verification', '맛집 탐정', '첫 번째 AI 검증 완료', 'milestone', 'search', null, '{"type":"verification_count","value":1}'),
('verification_10', '검증 루키', 'AI 검증 10회 달성', 'milestone', 'shield-check', 'bronze', '{"type":"verification_count","value":10}'),
('verification_50', '맛집 분석가', 'AI 검증 50회 달성', 'milestone', 'bar-chart-3', 'silver', '{"type":"verification_count","value":50}'),
('verification_100', '검증 마스터', 'AI 검증 100회 달성', 'milestone', 'award', 'gold', '{"type":"verification_count","value":100}'),
('streak_7', '일주일 연속 검증', '7일 연속 검증 달성', 'special', 'flame', null, '{"type":"streak","value":7}'),
('prompt_creator', '프롬프트 장인', '커스텀 프롬프트 공유', 'special', 'sparkles', null, '{"type":"prompt_shared","value":1}'),
('early_adopter', '얼리어답터', '앱 출시 초기 가입', 'special', 'rocket', null, '{"type":"early_adopter","value":true}')
on conflict (slug) do nothing;
