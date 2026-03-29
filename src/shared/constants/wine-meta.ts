// src/shared/constants/wine-meta.ts
// 와인 산지·품종 선택지 — XP 시스템 wine_region / wine_variety 축과 연동

/** 국가 → 주요 산지 매핑 */
export const WINE_REGIONS: Record<string, string[]> = {
  France: [
    'Bordeaux', 'Burgundy', 'Champagne', 'Rhône Valley', 'Loire Valley',
    'Alsace', 'Provence', 'Languedoc', 'Beaujolais', 'Jura',
  ],
  Italy: [
    'Tuscany', 'Piedmont', 'Veneto', 'Sicily', 'Puglia',
    'Lombardy', 'Sardinia', 'Trentino-Alto Adige', 'Friuli', 'Campania',
  ],
  Spain: [
    'Rioja', 'Ribera del Duero', 'Priorat', 'Rías Baixas', 'Cava',
    'Jerez', 'Navarra', 'Penedès',
  ],
  USA: [
    'Napa Valley', 'Sonoma', 'Willamette Valley', 'Paso Robles',
    'Santa Barbara', 'Washington State', 'Finger Lakes',
  ],
  Australia: [
    'Barossa Valley', 'McLaren Vale', 'Hunter Valley', 'Margaret River',
    'Yarra Valley', 'Coonawarra', 'Adelaide Hills',
  ],
  Chile: [
    'Maipo Valley', 'Colchagua Valley', 'Casablanca Valley', 'Rapel Valley',
  ],
  Argentina: [
    'Mendoza', 'Salta', 'Patagonia',
  ],
  Germany: [
    'Mosel', 'Rheingau', 'Pfalz', 'Baden', 'Franken',
  ],
  Portugal: [
    'Douro', 'Alentejo', 'Dão', 'Vinho Verde',
  ],
  'New Zealand': [
    'Marlborough', 'Central Otago', 'Hawke\'s Bay',
  ],
  'South Africa': [
    'Stellenbosch', 'Swartland', 'Constantia',
  ],
}

export const WINE_COUNTRIES = Object.keys(WINE_REGIONS)

/**
 * 와인 타입 (SSOT: DATA_MODEL.md wines.wine_type)
 * 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'
 */
export const WINE_TYPES = [
  { value: 'red', label: 'Red' },
  { value: 'white', label: 'White' },
  { value: 'rose', label: 'Rosé' },
  { value: 'sparkling', label: 'Sparkling' },
  { value: 'orange', label: 'Orange' },
  { value: 'fortified', label: 'Fortified' },
  { value: 'dessert', label: 'Dessert' },
] as const

/** 품종 — wine_type별 매핑. 이탈리아 품종은 스타일 표기로 구분 */
export const WINE_VARIETIES_BY_TYPE: Record<string, string[]> = {
  red: [
    'Cabernet Sauvignon',
    'Merlot',
    'Pinot Noir',
    'Syrah / Shiraz',
    'Grenache',
    'Malbec',
    'Tempranillo',
    'Cabernet Franc',
    'Zinfandel',
    'Mourvèdre',
    'Carménère',
    'Petit Verdot',
    'Gamay',
    'Pinotage',
    // Italian
    'Sangiovese',
    'Nebbiolo',
    'Barbera',
    'Primitivo',
    'Montepulciano',
    'Nero d\'Avola',
    'Aglianico',
    'Dolcetto',
    'Corvina',
  ],
  white: [
    'Chardonnay',
    'Sauvignon Blanc',
    'Riesling',
    'Pinot Grigio',
    'Gewürztraminer',
    'Viognier',
    'Chenin Blanc',
    'Sémillon',
    'Grüner Veltliner',
    'Albariño',
    'Marsanne',
    'Roussanne',
    'Muscadet',
    'Torrontés',
    // Italian
    'Vermentino',
    'Trebbiano',
    'Garganega',
    'Fiano',
    'Arneis',
  ],
  rose: [
    'Grenache',
    'Syrah / Shiraz',
    'Mourvèdre',
    'Cinsault',
    'Pinot Noir',
    'Sangiovese',
    'Tempranillo',
  ],
  sparkling: [
    'Chardonnay',
    'Pinot Noir',
    'Pinot Meunier',
    'Glera',
    'Macabeo',
    'Xarel·lo',
    'Parellada',
  ],
  orange: [
    'Rkatsiteli',
    'Pinot Grigio',
    'Gewürztraminer',
    'Ribolla Gialla',
    'Sauvignon Blanc',
    'Garganega',
  ],
  fortified: [
    'Touriga Nacional',
    'Palomino',
    'Pedro Ximénez',
    'Muscat',
    'Tinta Roriz',
  ],
  dessert: [
    'Sémillon',
    'Riesling',
    'Muscat',
    'Chenin Blanc',
    'Furmint',
  ],
}

/** 이탈리아 품종 세트 (UI에서 스타일 표기용) */
export const ITALIAN_VARIETIES = new Set([
  'Sangiovese', 'Nebbiolo', 'Barbera', 'Primitivo', 'Montepulciano',
  'Nero d\'Avola', 'Aglianico', 'Dolcetto', 'Corvina',
  'Vermentino', 'Trebbiano', 'Garganega', 'Fiano', 'Arneis',
  'Ribolla Gialla', 'Glera',
])

/** 전체 품종 flat 리스트 (검색용) */
export const ALL_VARIETIES = [...new Set(Object.values(WINE_VARIETIES_BY_TYPE).flat())]
