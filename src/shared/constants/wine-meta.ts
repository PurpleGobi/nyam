// src/shared/constants/wine-meta.ts
// WSET Level 3 공식 Specification (Issue 2, 2022) 기준 와인 산지·품종 선택지
// SSOT: development_docs/systems/DATA_MODEL.md "와인 산지 Cascade 선택지" 참조
// 4단계 cascade: country → region → sub_region → appellation

/** country → region[] */
export const WINE_REGIONS: Record<string, string[]> = {
  France: ['Bordeaux', 'South West France', 'Burgundy', 'Beaujolais', 'Alsace', 'Loire Valley', 'Rhône Valley', 'Southern France'],
  Germany: ['Mosel', 'Nahe', 'Rheingau', 'Rheinhessen', 'Pfalz', 'Baden', 'Franken'],
  Austria: ['Niederösterreich', 'Burgenland'],
  Hungary: ['Tokaj'],
  Greece: ['Naoussa', 'Nemea', 'Santorini'],
  Italy: ['Trentino-Alto Adige', 'Friuli-Venezia Giulia', 'Veneto', 'Piedmont', 'Tuscany', 'Marche', 'Umbria', 'Lazio', 'Abruzzo', 'Campania', 'Puglia', 'Basilicata', 'Sicily'],
  Spain: ['The Upper Ebro', 'Catalunya', 'The Duero Valley', 'The North West', 'The Levante', 'Castilla-La Mancha', 'Castilla y León'],
  Portugal: ['Vinho Verde', 'Douro', 'Dão', 'Bairrada', 'Alentejo', 'Lisboa', 'Alentejano'],
  USA: ['California', 'Oregon', 'Washington', 'New York'],
  Canada: ['Ontario', 'British Columbia'],
  Chile: ['Coquimbo Region', 'Aconcagua Region', 'Central Valley', 'Southern Region'],
  Argentina: ['Salta', 'San Juan', 'Mendoza', 'Patagonia'],
  'South Africa': ['Coastal Region', 'Breede River Valley', 'Cape South Coast'],
  Australia: ['South Eastern Australia', 'South Australia', 'Victoria', 'New South Wales', 'Tasmania', 'Western Australia'],
  'New Zealand': ['North Island', 'South Island'],
}

export const WINE_COUNTRIES = Object.keys(WINE_REGIONS)

/** region → sub_region[] */
export const WINE_SUB_REGIONS: Record<string, string[]> = {
  // France
  Bordeaux: ['Médoc', 'Haut-Médoc', 'Saint-Estèphe', 'Pauillac', 'Saint-Julien', 'Margaux', 'Graves', 'Pessac-Léognan', 'Saint-Émilion', 'Pomerol', 'Sauternes', 'Barsac', 'Côtes de Bordeaux', 'Entre-Deux-Mers'],
  'South West France': ['Bergerac', 'Monbazillac', 'Cahors', 'Madiran', 'Jurançon', 'Côtes de Gascogne'],
  Burgundy: ['Chablis', 'Côte de Nuits', 'Côte de Beaune', 'Côte Chalonnaise', 'Mâconnais'],
  Beaujolais: ['Brouilly', 'Fleurie', 'Morgon', 'Moulin-à-Vent'],
  Alsace: [],
  'Loire Valley': ['Muscadet', 'Anjou', 'Coteaux du Layon', 'Savennières', 'Saumur', 'Saumur-Champigny', 'Vouvray', 'Touraine', 'Bourgueil', 'Chinon', 'Sancerre', 'Pouilly-Fumé', 'Menetou-Salon'],
  'Rhône Valley': ['Côtes du Rhône', 'Côtes du Rhône Villages', 'Côte-Rôtie', 'Condrieu', 'Saint-Joseph', 'Hermitage', 'Crozes-Hermitage', 'Cornas', 'Châteauneuf-du-Pape', 'Gigondas', 'Vacqueyras', 'Lirac', 'Tavel'],
  'Southern France': ['Pays d\'Oc', 'Languedoc', 'Minervois', 'Fitou', 'Corbières', 'Picpoul de Pinet', 'Côtes du Roussillon', 'Côtes du Roussillon Villages', 'Bandol', 'Côtes de Provence'],

  // Germany
  Mosel: ['Bernkastel', 'Wehlen', 'Piesport'],
  Nahe: ['Schlossböckelheim'],
  Rheingau: ['Rüdesheim', 'Johannisberg'],
  Rheinhessen: ['Nierstein'],
  Pfalz: ['Forst', 'Deidesheim'],
  Baden: [],
  Franken: [],

  // Austria
  'Niederösterreich': ['Wachau', 'Weinviertel'],
  Burgenland: [],

  // Hungary
  Tokaj: [],

  // Greece
  Naoussa: [],
  Nemea: [],
  Santorini: [],

  // Italy
  'Trentino-Alto Adige': ['Trentino', 'Alto Adige'],
  'Friuli-Venezia Giulia': ['Collio', 'Colli Orientali', 'Friuli Grave'],
  Veneto: ['Valpolicella', 'Soave', 'Amarone della Valpolicella'],
  Piedmont: ['Barolo', 'Barbaresco', 'Barbera d\'Asti', 'Dolcetto d\'Alba', 'Gavi'],
  Tuscany: ['Chianti', 'Chianti Classico', 'Bolgheri', 'Brunello di Montalcino', 'Vino Nobile di Montepulciano'],
  Marche: ['Verdicchio dei Castelli di Jesi'],
  Umbria: ['Orvieto'],
  Lazio: ['Frascati'],
  Abruzzo: ['Montepulciano d\'Abruzzo'],
  Campania: ['Taurasi', 'Fiano di Avellino', 'Greco di Tufo'],
  Puglia: ['Salice Salentino'],
  Basilicata: ['Aglianico del Vulture'],
  Sicily: ['Etna'],

  // Spain
  'The Upper Ebro': ['Rioja', 'Navarra', 'Calatayud', 'Cariñena'],
  Catalunya: ['Priorat', 'Catalunya', 'Penedès'],
  'The Duero Valley': ['Ribera del Duero', 'Toro', 'Rueda'],
  'The North West': ['Rías Baixas', 'Bierzo'],
  'The Levante': ['Valencia', 'Jumilla', 'Yecla'],
  'Castilla-La Mancha': ['La Mancha', 'Valdepeñas'],
  'Castilla y León': [],

  // Portugal
  'Vinho Verde': [],
  Douro: [],
  'Dão': [],
  Bairrada: [],
  Alentejo: [],
  Lisboa: [],
  Alentejano: [],

  // USA
  California: ['Napa Valley', 'Sonoma County', 'Mendocino County', 'Santa Cruz Mountains', 'Monterey', 'Paso Robles', 'Santa Maria Valley', 'Lodi'],
  Oregon: ['Willamette Valley'],
  Washington: ['Columbia Valley', 'Yakima Valley'],
  'New York': ['Finger Lakes'],

  // Canada
  Ontario: ['Niagara Peninsula'],
  'British Columbia': ['Okanagan Valley'],

  // Chile
  'Coquimbo Region': ['Elqui Valley', 'Limarí Valley'],
  'Aconcagua Region': ['Casablanca Valley', 'San Antonio Valley', 'Leyda Valley', 'Aconcagua Valley'],
  'Central Valley': ['Maipo Valley', 'Cachapoal Valley', 'Colchagua Valley', 'Curicó Valley', 'Maule Valley'],
  'Southern Region': [],

  // Argentina
  Salta: ['Cafayate'],
  'San Juan': [],
  Mendoza: ['Uco Valley', 'Luján de Cuyo', 'Maipú'],
  Patagonia: [],

  // South Africa
  'Coastal Region': ['Stellenbosch', 'Paarl', 'Constantia', 'Durbanville', 'Swartland'],
  'Breede River Valley': ['Worcester', 'Robertson'],
  'Cape South Coast': ['Walker Bay', 'Elim', 'Elgin'],

  // Australia
  'South Eastern Australia': ['Murray-Darling', 'Riverina', 'Riverland'],
  'South Australia': ['Barossa', 'Clare Valley', 'Adelaide Hills', 'McLaren Vale', 'Coonawarra'],
  Victoria: ['Yarra Valley', 'Geelong', 'Mornington Peninsula', 'Heathcote', 'Goulburn Valley'],
  'New South Wales': ['Hunter Valley'],
  Tasmania: [],
  'Western Australia': ['Margaret River', 'Great Southern'],

  // New Zealand
  'North Island': ['Gisborne', 'Hawke\'s Bay', 'Martinborough'],
  'South Island': ['Marlborough', 'Nelson', 'Canterbury', 'Central Otago'],
}

/** sub_region → appellation[] (4단계가 있는 곳만) */
export const WINE_APPELLATIONS: Record<string, string[]> = {
  // France - Burgundy
  'Côte de Nuits': ['Gevrey-Chambertin', 'Vougeot', 'Vosne-Romanée', 'Nuits-Saint-Georges'],
  'Côte de Beaune': ['Aloxe-Corton', 'Beaune', 'Pommard', 'Volnay', 'Meursault', 'Puligny-Montrachet', 'Chassagne-Montrachet'],
  'Côte Chalonnaise': ['Rully', 'Mercurey', 'Givry', 'Montagny'],
  'Mâconnais': ['Pouilly-Fuissé', 'Saint-Véran'],

  // USA - California
  'Napa Valley': ['Rutherford', 'Oakville', 'Stags Leap District', 'Howell Mountain', 'Mt. Veeder', 'Los Carneros', 'St. Helena', 'Calistoga'],
  'Sonoma County': ['Russian River Valley', 'Alexander Valley', 'Dry Creek Valley', 'Sonoma Coast'],

  // Australia - South Australia
  Barossa: ['Barossa Valley', 'Eden Valley'],

  // South Africa - Cape South Coast
  'Walker Bay': ['Hemel-en-Aarde Wards'],
}

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
