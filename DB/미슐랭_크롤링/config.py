"""
미슐랭 가이드 크롤링 설정
"""
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

BASE_URL = 'https://guide.michelin.com'

# 국가별 URL 패턴 (현지 언어 버전이 정확)
COUNTRIES = {
    'kr/ko': {
        'name': '한국',
        'regions': {
            'seoul-capital-area': '서울',
            'busan-region': '부산',
        },
    },
    'jp/ja': {
        'name': '일본',
        'regions': {
            'tokyo': '도쿄',
            'kyoto': '교토',
            'osaka': '오사카',
        },
    },
    'fr/fr': {
        'name': '프랑스',
        'regions': {
            'ile-de-france': '파리',
            'auvergne-rhone-alpes/rhone': '리옹',
        },
    },
    'it/it': {
        'name': '이탈리아',
        'regions': {
            'lazio/roma': '로마',
            'lombardia/milano': '밀라노',
        },
    },
    'es/es': {
        'name': '스페인',
        'regions': {
            'comunidad-de-madrid/madrid': '마드리드',
            'cataluna/barcelona': '바르셀로나',
        },
    },
    'us/en': {
        'name': '미국',
        'regions': {
            'new-york-state': '뉴욕',
            'california': '캘리포니아',
            'illinois': '시카고',
        },
    },
    'gb/en': {
        'name': '영국',
        'regions': {
            'greater-london': '런던',
        },
    },
    'th/th': {
        'name': '태국',
        'regions': {
            'bangkok-and-surroundings': '방콕',
        },
    },
    'sg/en': {
        'name': '싱가포르',
        'regions': {
            'singapore': '싱가포르',
        },
    },
    'tw/zh': {
        'name': '대만',
        'regions': {
            'taipei': '타이베이',
        },
    },
}

# 스타 필터 (URL suffix)
STAR_FILTERS = {
    '3-stars-michelin': '3스타',
    '2-stars-michelin': '2스타',
    '1-star-michelin': '1스타',
    'bib-gourmand': '빕구르망',
}

REQUEST_DELAY = 2
MAX_SCROLL_ATTEMPTS = 20
HEADLESS = True
