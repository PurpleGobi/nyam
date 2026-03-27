const SUFFIX_PATTERN = /\s*(점|역|호|지점|본점|매장|가게|식당|맛집)$/

const KOREAN_TO_ENGLISH: globalThis.Record<string, string[]> = {
  '스시': ['sushi'],
  '파스타': ['pasta'],
  '라멘': ['ramen'],
  '피자': ['pizza'],
  '카페': ['cafe', 'coffee'],
  '치킨': ['chicken'],
  '버거': ['burger'],
  '스테이크': ['steak'],
  '와인': ['wine'],
  '비스트로': ['bistro'],
}

export function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(SUFFIX_PATTERN, '').replace(/\s/g, '').trim()
}

export function fuzzyMatch(query: string, target: string): boolean {
  const normQuery = normalizeQuery(query)
  const normTarget = normalizeQuery(target)

  if (normTarget.includes(normQuery)) return true
  if (normQuery.includes(normTarget)) return true

  for (const [ko, enVariants] of Object.entries(KOREAN_TO_ENGLISH)) {
    if (normQuery.includes(ko)) {
      for (const en of enVariants) {
        if (normTarget.includes(en)) return true
      }
    }
    for (const en of enVariants) {
      if (normQuery.includes(en)) {
        if (normTarget.includes(ko)) return true
      }
    }
  }

  return false
}

export function calculateSearchRelevance(query: string, name: string): number {
  const normQuery = normalizeQuery(query)
  const normName = normalizeQuery(name)

  if (normName === normQuery) return 100
  if (normName.startsWith(normQuery)) return 80
  if (normName.includes(normQuery)) return 60
  if (fuzzyMatch(query, name)) return 40
  return 0
}
