export const AREA_MAPPINGS: Record<string, string> = {
  // Seoul
  "역삼동": "강남역",
  "서초동": "강남역",
  "논현동": "신논현/강남",
  "청담동": "청담/압구정",
  "신사동": "가로수길/압구정",
  "압구정동": "청담/압구정",
  "삼성동": "삼성/코엑스",
  "대치동": "대치/학여울",
  "잠실동": "잠실/송파",
  "송파동": "잠실/송파",
  "방이동": "잠실/송파",
  "문정동": "문정/가든파이브",
  "이태원동": "이태원/경리단길",
  "한남동": "한남동/이태원",
  "용산동": "용산역",
  "서교동": "홍대/합정",
  "합정동": "홍대/합정",
  "연남동": "연남동",
  "상수동": "상수/망원",
  "망원동": "상수/망원",
  "성수동": "성수동",
  "화양동": "건대/성수",
  "종로1가": "종로/광화문",
  "종로2가": "종각",
  "종로3가": "종로3가/익선동",
  "익선동": "익선동",
  "을지로3가": "을지로",
  "을지로4가": "을지로",
  "충무로": "충무로/명동",
  "연희동": "연희동",
  "이촌동": "이촌/용산",
  "여의도동": "여의도",
  "영등포동": "영등포",
  "목동": "목동",
  "천호동": "천호/강동",
  "노원동": "노원",
  "도곡동": "도곡/매봉",
  "반포동": "반포/서래",
  // Gyeonggi/Incheon
  "정자동": "분당/정자",
  "서현동": "분당/서현",
  "판교동": "판교",
  "부평동": "부평",
} as const

/**
 * Extract area name from Kakao address_name (지번 주소).
 * @param addressName e.g. "서울 강남구 역삼동 123-4"
 * @returns Mapped area name or gu/si fallback
 */
export function extractArea(addressName: string): string | null {
  if (!addressName) return null

  const parts = addressName.split(" ")
  for (const part of parts) {
    const cleaned = part.replace(/[0-9-]+$/, "")
    if (AREA_MAPPINGS[cleaned]) return AREA_MAPPINGS[cleaned]
  }

  // Fallback to gu or si
  const gu = parts.find((p) => p.endsWith("구") || p.endsWith("시"))
  return gu ?? null
}
