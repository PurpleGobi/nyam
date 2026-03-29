"""
미슐랭 가이드 크롤링 설정
"""

# Supabase
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env.local'))

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

# 크롤링 대상
BASE_URL = 'https://guide.michelin.com'

# 국가별 URL 패턴
COUNTRIES = {
    'south-korea': {'name': '한국', 'cities': ['seoul', 'busan']},
    'japan': {'name': '일본', 'cities': ['tokyo', 'kyoto', 'osaka']},
    'france': {'name': '프랑스', 'cities': ['paris', 'lyon']},
    'italy': {'name': '이탈리아', 'cities': ['rome', 'milan']},
    'spain': {'name': '스페인', 'cities': ['madrid', 'barcelona']},
    'united-states': {'name': '미국', 'cities': ['new-york', 'los-angeles', 'chicago', 'san-francisco']},
    'united-kingdom': {'name': '영국', 'cities': ['london']},
    'germany': {'name': '독일', 'cities': ['berlin', 'munich']},
    'thailand': {'name': '태국', 'cities': ['bangkok']},
    'singapore': {'name': '싱가포르', 'cities': ['singapore']},
    'hong-kong': {'name': '홍콩', 'cities': ['hong-kong']},
    'taiwan': {'name': '대만', 'cities': ['taipei']},
}

# 스타 필터
STAR_FILTERS = {
    '3-stars': '3스타',
    '2-stars': '2스타',
    '1-star': '1스타',
    'bib-gourmand': '빕구르망',
}

# 연도 (2020~2025)
YEARS = [2025, 2024, 2023, 2022, 2021, 2020]

# 크롤링 설정
REQUEST_DELAY = 2  # 초 (예의 바른 크롤링)
MAX_PAGES_PER_QUERY = 50
HEADLESS = True
