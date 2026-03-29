// src/domain/entities/filter-config.ts
// R1: 외부 의존 0
// SSOT: pages/06_HOME.md §3-1 (식당), §4-0 (와인)

export type FilterAttributeType = 'select' | 'multi-select' | 'range' | 'text'

export interface FilterAttributeOption {
  value: string
  label: string
}

export interface FilterAttribute {
  key: string
  label: string
  type: FilterAttributeType
  options?: FilterAttributeOption[]
}

// ─── 식당 필터 속성 (11종) ───

export const RESTAURANT_FILTER_ATTRIBUTES: FilterAttribute[] = [
  {
    key: 'status',
    label: '상태',
    type: 'select',
    options: [
      { value: 'visited', label: '방문' },
      { value: 'wishlist', label: '찜' },
      { value: 'following', label: '팔로잉' },
    ],
  },
  {
    key: 'scene',
    label: '상황',
    type: 'select',
    options: [
      { value: 'solo', label: '혼밥' },
      { value: 'romantic', label: '데이트' },
      { value: 'friends', label: '친구' },
      { value: 'family', label: '가족' },
      { value: 'business', label: '회식' },
      { value: 'drinks', label: '술자리' },
    ],
  },
  {
    key: 'genre',
    label: '음식종류',
    type: 'select',
    options: [
      { value: '한식', label: '한식' },
      { value: '일식', label: '일식' },
      { value: '중식', label: '중식' },
      { value: '태국', label: '태국' },
      { value: '베트남', label: '베트남' },
      { value: '인도', label: '인도' },
      { value: '이탈리안', label: '이탈리안' },
      { value: '프렌치', label: '프렌치' },
      { value: '스페인', label: '스페인' },
      { value: '지중해', label: '지중해' },
      { value: '미국', label: '미국' },
      { value: '멕시칸', label: '멕시칸' },
      { value: '카페', label: '카페' },
      { value: '바/주점', label: '바/주점' },
      { value: '베이커리', label: '베이커리' },
      { value: '기타', label: '기타' },
    ],
  },
  {
    key: 'area',
    label: '위치',
    type: 'select',
    options: [
      { value: '강남', label: '강남' },
      { value: '을지로', label: '을지로' },
      { value: '청담', label: '청담' },
      { value: '이태원', label: '이태원' },
      { value: '홍대', label: '홍대' },
      { value: '광화문', label: '광화문' },
      { value: '성수', label: '성수' },
      { value: '한남', label: '한남' },
    ],
  },
  {
    key: 'satisfaction',
    label: '점수',
    type: 'select',
    options: [
      { value: '90', label: '90+' },
      { value: '80', label: '80~89' },
      { value: '70', label: '70~79' },
      { value: '69', label: '~69' },
    ],
  },
  {
    key: 'visit_date',
    label: '시기',
    type: 'select',
    options: [
      { value: '1w', label: '최근 1주' },
      { value: '1m', label: '1개월' },
      { value: '3m', label: '3개월' },
      { value: '6m', label: '6개월' },
      { value: '1y', label: '1년+' },
    ],
  },
  {
    key: 'companion_count',
    label: '동반자',
    type: 'select',
    options: [
      { value: '1', label: '혼자' },
      { value: '2', label: '2인' },
      { value: '3-4', label: '3~4인' },
      { value: '5+', label: '5인+' },
    ],
  },
  {
    key: 'prestige',
    label: '명성',
    type: 'select',
    options: [
      { value: 'michelin_1', label: '미슐랭' },
      { value: 'blue_ribbon', label: '블루리본' },
      { value: 'tv', label: 'TV출연' },
      { value: 'none', label: '수상없음' },
    ],
  },
  {
    key: 'menu_type',
    label: '대표메뉴',
    type: 'select',
    options: [
      { value: 'course', label: '코스' },
      { value: 'single', label: '단품' },
      { value: 'omakase', label: '오마카세' },
      { value: 'buffet', label: '뷔페' },
      { value: 'set', label: '세트' },
    ],
  },
  {
    key: 'price_range',
    label: '가격대',
    type: 'select',
    options: [
      { value: '1', label: '~2만' },
      { value: '2', label: '2~5만' },
      { value: '3', label: '5~10만' },
      { value: '4', label: '10만+' },
    ],
  },
]

// ─── 버블 필터 속성 (5종) ───
// SSOT: pages/08_BUBBLE.md §11-2

export const BUBBLE_FILTER_ATTRIBUTES: FilterAttribute[] = [
  {
    key: 'focus_type',
    label: '유형',
    type: 'select',
    options: [
      { value: 'all', label: '전체' },
      { value: 'restaurant', label: '식당' },
      { value: 'wine', label: '와인' },
    ],
  },
  {
    key: 'area',
    label: '지역',
    type: 'select',
    options: [
      { value: '강남', label: '강남' },
      { value: '을지로', label: '을지로' },
      { value: '청담', label: '청담' },
      { value: '이태원', label: '이태원' },
      { value: '홍대', label: '홍대' },
      { value: '광화문', label: '광화문' },
      { value: '성수', label: '성수' },
      { value: '한남', label: '한남' },
    ],
  },
  {
    key: 'join_policy',
    label: '가입 방식',
    type: 'select',
    options: [
      { value: 'open', label: '자유 가입' },
      { value: 'auto_approve', label: '자동 승인' },
      { value: 'manual_approve', label: '승인 필요' },
      { value: 'invite_only', label: '초대만' },
      { value: 'closed', label: '비공개' },
    ],
  },
  {
    key: 'member_count',
    label: '멤버 수',
    type: 'select',
    options: [
      { value: '5', label: '5명 이상' },
      { value: '10', label: '10명 이상' },
      { value: '20', label: '20명 이상' },
      { value: '50', label: '50명 이상' },
    ],
  },
  {
    key: 'activity',
    label: '활성도',
    type: 'select',
    options: [
      { value: '1d', label: '24시간 내' },
      { value: '1w', label: '최근 1주' },
      { value: '1m', label: '최근 1개월' },
    ],
  },
]

// ─── 와인 필터 속성 (12종) ───

export const WINE_FILTER_ATTRIBUTES: FilterAttribute[] = [
  {
    key: 'wine_status',
    label: '상태',
    type: 'select',
    options: [
      { value: 'tasted', label: '시음' },
      { value: 'wishlist', label: '찜' },
      { value: 'cellar', label: '셀러' },
    ],
  },
  {
    key: 'wine_type',
    label: '스타일',
    type: 'select',
    options: [
      { value: 'red', label: 'Red' },
      { value: 'white', label: 'White' },
      { value: 'rose', label: 'Rosé' },
      { value: 'sparkling', label: 'Sparkling' },
      { value: 'orange', label: 'Orange' },
      { value: 'dessert', label: 'Dessert' },
      { value: 'fortified', label: 'Fortified' },
    ],
  },
  {
    key: 'variety',
    label: '품종',
    type: 'select',
    options: [
      // WSET L2+L3 완전 커버리지 (55종, body_order 순)
      // ── White (33종) ──
      { value: 'Muscat', label: '뮈스카' },
      { value: 'Glera', label: '글레라' },
      { value: 'Cortese', label: '코르테제' },
      { value: 'Melon de Bourgogne', label: '멜롱 드 부르고뉴' },
      { value: 'Trebbiano', label: '트레비아노' },
      { value: 'Albarino', label: '알바리뇨' },
      { value: 'Riesling', label: '리슬링' },
      { value: 'Pinot Grigio', label: '피노 그리' },
      { value: 'Sauvignon Blanc', label: '소비뇽 블랑' },
      { value: 'Gruner Veltliner', label: '그뤼너 벨트리너' },
      { value: 'Garganega', label: '가르가네가' },
      { value: 'Verdicchio', label: '베르디키오' },
      { value: 'Vermentino', label: '베르멘티노' },
      { value: 'Assyrtiko', label: '아시르티코' },
      { value: 'Arneis', label: '아르네이스' },
      { value: 'Friulano', label: '프리울라노' },
      { value: 'Furmint', label: '푸르민트' },
      { value: 'Falanghina', label: '팔랑기나' },
      { value: 'Fiano', label: '피아노' },
      { value: 'Greco', label: '그레코' },
      { value: 'Chenin Blanc', label: '슈냉 블랑' },
      { value: 'Semillon', label: '세미용' },
      { value: 'Gewurztraminer', label: '게뷔르츠트라미너' },
      { value: 'Marsanne', label: '마르산느' },
      { value: 'Roussanne', label: '루산느' },
      { value: 'Viognier', label: '비오니에' },
      { value: 'Chardonnay', label: '샤르도네' },
      { value: 'Torrontes', label: '토론테스' },
      { value: 'Grillo', label: '그릴로' },
      { value: 'Carricante', label: '카리칸테' },
      { value: 'Pecorino', label: '페코리노' },
      { value: 'Vernaccia', label: '베르나차' },
      { value: 'Catarratto', label: '카타라토' },
      // ── Red (32종) ──
      { value: 'Schiava', label: '스키아바' },
      { value: 'Frappato', label: '프라파토' },
      { value: 'Gamay', label: '가메' },
      { value: 'Dolcetto', label: '돌체토' },
      { value: 'Cinsault', label: '생소' },
      { value: 'Pinot Noir', label: '피노 누아' },
      { value: 'Corvina', label: '코르비나' },
      { value: 'Nerello Mascalese', label: '네렐로 마스칼레제' },
      { value: 'Lambrusco', label: '람브루스코' },
      { value: 'Barbera', label: '바르베라' },
      { value: 'Cabernet Franc', label: '카베르네 프랑' },
      { value: 'Grenache', label: '그르나슈' },
      { value: 'Carignan', label: '카리냥' },
      { value: 'Sangiovese', label: '산지오베제' },
      { value: 'Tempranillo', label: '템프라니요' },
      { value: 'Merlot', label: '메를로' },
      { value: 'Montepulciano', label: '몬테풀치아노' },
      { value: 'Nero d\'Avola', label: '네로 다볼라' },
      { value: 'Carmenere', label: '카르메네르' },
      { value: 'Pinotage', label: '피노타주' },
      { value: 'Zinfandel', label: '진판델' },
      { value: 'Negroamaro', label: '네그로아마로' },
      { value: 'Syrah', label: '쉬라즈' },
      { value: 'Nebbiolo', label: '네비올로' },
      { value: 'Malbec', label: '말벡' },
      { value: 'Cabernet Sauvignon', label: '카베르네 소비뇽' },
      { value: 'Mourvedre', label: '무르베드르' },
      { value: 'Aglianico', label: '알리아니코' },
      { value: 'Sagrantino', label: '사그란티노' },
      { value: 'Touriga Nacional', label: '투리가 나시오날' },
      { value: 'Tannat', label: '타나' },
      { value: 'Petit Verdot', label: '프티 베르도' },
    ],
  },
  {
    key: 'country',
    label: '산지',
    type: 'select',
    options: [
      // WSET L2+L3 전체 커버리지 (15개국)
      { value: 'France', label: 'France' },
      { value: 'Italy', label: 'Italy' },
      { value: 'Spain', label: 'Spain' },
      { value: 'Portugal', label: 'Portugal' },
      { value: 'Germany', label: 'Germany' },
      { value: 'Austria', label: 'Austria' },
      { value: 'Hungary', label: 'Hungary' },
      { value: 'Greece', label: 'Greece' },
      { value: 'USA', label: 'USA' },
      { value: 'Chile', label: 'Chile' },
      { value: 'Argentina', label: 'Argentina' },
      { value: 'Australia', label: 'Australia' },
      { value: 'New Zealand', label: 'NZ' },
      { value: 'South Africa', label: 'South Africa' },
      { value: 'Canada', label: 'Canada' },
    ],
  },
  {
    key: 'vintage',
    label: '빈티지',
    type: 'select',
    options: [
      { value: '2024', label: '2024' },
      { value: '2023', label: '2023' },
      { value: '2022', label: '2022' },
      { value: '2021', label: '2021' },
      { value: '2020', label: '2020' },
      { value: '2019', label: '2019' },
      { value: 'before_2018', label: '2018 이전' },
    ],
  },
  {
    key: 'satisfaction',
    label: '점수',
    type: 'select',
    options: [
      { value: '90', label: '90+' },
      { value: '80', label: '80~89' },
      { value: '70', label: '70~79' },
      { value: '69', label: '~69' },
    ],
  },
  {
    key: 'visit_date',
    label: '시음시기',
    type: 'select',
    options: [
      { value: '1w', label: '최근 1주' },
      { value: '1m', label: '1개월' },
      { value: '3m', label: '3개월' },
      { value: '6m', label: '6개월' },
      { value: '1y', label: '1년+' },
    ],
  },
  {
    key: 'pairing_categories',
    label: '페어링',
    type: 'select',
    options: [
      { value: 'red_meat', label: '적색육' },
      { value: 'white_meat', label: '백색육' },
      { value: 'seafood', label: '어패류' },
      { value: 'cheese', label: '치즈' },
      { value: 'vegetable', label: '채소' },
      { value: 'dessert', label: '디저트' },
    ],
  },
  {
    key: 'purchase_price',
    label: '가격대',
    type: 'select',
    options: [
      { value: '30000', label: '~3만' },
      { value: '70000', label: '3~7만' },
      { value: '150000', label: '7~15만' },
      { value: '150001', label: '15만+' },
    ],
  },
  {
    key: 'acidity_level',
    label: '산미',
    type: 'select',
    options: [
      { value: '1', label: '낮음' },
      { value: '2', label: '중간' },
      { value: '3', label: '높음' },
    ],
  },
  {
    key: 'sweetness_level',
    label: '당도',
    type: 'select',
    options: [
      { value: '1', label: '드라이' },
      { value: '2', label: '오프드라이' },
      { value: '3', label: '스위트' },
    ],
  },
  {
    key: 'complexity',
    label: '복합도',
    type: 'select',
    options: [
      { value: 'simple', label: '단순 (0~33)' },
      { value: 'medium', label: '중간 (34~66)' },
      { value: 'complex', label: '복합 (67~100)' },
    ],
  },
]
