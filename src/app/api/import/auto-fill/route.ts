import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { read, utils } from 'xlsx'
import ExcelJS from 'exceljs'
import { searchKakaoLocal } from '@/infrastructure/api/kakao-local'
import { getWineDetailByName } from '@/infrastructure/api/ai-recognition'

/**
 * POST /api/import/auto-fill
 * 엑셀 파일을 받아 식당/와인 정보를 자동 검색으로 채워서 반환
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'FILE_REQUIRED' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const wb = read(buffer, { type: 'array' })

  // ExcelJS로 결과 workbook 생성
  const outWb = new ExcelJS.Workbook()

  // ── 식당 시트 처리 ──
  const rSheetName = wb.SheetNames.find((n) => n.includes('식당'))
  if (rSheetName) {
    const rSheet = wb.Sheets[rSheetName]
    if (rSheet) {
      const rows = utils.sheet_to_json<Record<string, string>>(rSheet, { defval: '' })
      const filled = await fillRestaurants(rows)
      writeSheet(outWb, '식당 기록', filled, 'FFFF6038')
    }
  }

  // ── 와인 시트 처리 ──
  const wSheetName = wb.SheetNames.find((n) => n.includes('와인'))
  if (wSheetName) {
    const wSheet = wb.Sheets[wSheetName]
    if (wSheet) {
      const rows = utils.sheet_to_json<Record<string, string>>(wSheet, { defval: '' })
      const filled = await fillWines(rows)
      writeSheet(outWb, '와인 기록', filled, 'FF722F37')
    }
  }

  const outBuffer = await outWb.xlsx.writeBuffer()
  return new NextResponse(outBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="nyam-auto-filled.xlsx"',
    },
  })
}

// ── 식당 자동 채우기 ──

async function fillRestaurants(rows: Record<string, string>[]): Promise<Record<string, string>[]> {
  const results: Record<string, string>[] = []

  for (const row of rows) {
    const name = row['restaurant_name']?.trim()
    if (!name) {
      results.push(row)
      continue
    }

    // 이미 모두 채워져 있으면 스킵
    const needsFill = !row['lat'] || !row['lng'] || !row['country'] || !row['city']
    if (!needsFill) {
      results.push(row)
      continue
    }

    try {
      const searchQuery = row['address'] ? `${name} ${row['address']}` : name
      const kakaoResults = await searchKakaoLocal(searchQuery, undefined, undefined, { radius: 50000, size: 1 })

      if (kakaoResults.length > 0) {
        const match = kakaoResults[0]
        if (!row['address'] && match.address) row['address'] = match.address
        if (!row['lat'] && match.lat) row['lat'] = String(match.lat)
        if (!row['lng'] && match.lng) row['lng'] = String(match.lng)
        if (!row['country']) row['country'] = '한국'
        if (!row['city']) {
          const city = extractCity(match.address)
          if (city) row['city'] = city
        }
        if (!row['area']) {
          const area = extractArea(match.address)
          if (area) row['area'] = area
        }
      }
    } catch {
      // 검색 실패 시 원본 유지
    }

    results.push(row)
  }

  return results
}

// ── 와인 자동 채우기 ──

async function fillWines(rows: Record<string, string>[]): Promise<Record<string, string>[]> {
  const results: Record<string, string>[] = []

  for (const row of rows) {
    const name = row['wine_name']?.trim()
    if (!name) {
      results.push(row)
      continue
    }

    try {
      const vintage = row['vintage'] ? Number(row['vintage']) : null
      const producer = row['producer']?.trim() || null
      const detail = await getWineDetailByName(name, producer, vintage)

      if (detail.wineName) {
        // 기본 정보
        if (!row['producer'] && detail.producer) row['producer'] = detail.producer
        if (!row['wine_type'] && detail.wineType) row['wine_type'] = detail.wineType
        if (!row['country'] && detail.country) row['country'] = detail.country
        if (!row['region'] && detail.region) row['region'] = detail.region
        if (!row['sub_region'] && detail.subRegion) row['sub_region'] = detail.subRegion
        if (!row['variety'] && detail.variety) row['variety'] = detail.variety
        if (!row['variety'] && detail.grapeVarieties && detail.grapeVarieties.length > 0) {
          row['variety'] = detail.grapeVarieties.map((g) => g.name).join(', ')
        }
        if (!row['abv'] && detail.abv) row['abv'] = String(detail.abv)
        // 아로마
        if (!row['aroma_primary'] && detail.aromaPrimary.length > 0) row['aroma_primary'] = detail.aromaPrimary.join(',')
        if (!row['aroma_secondary'] && detail.aromaSecondary.length > 0) row['aroma_secondary'] = detail.aromaSecondary.join(',')
        if (!row['aroma_tertiary'] && detail.aromaTertiary.length > 0) row['aroma_tertiary'] = detail.aromaTertiary.join(',')
        // 구조 (complexity는 WineLabelRecognition에 없으므로 스킵)
        if (!row['finish'] && detail.finish != null) row['finish'] = String(detail.finish)
        if (!row['balance'] && detail.balance != null) row['balance'] = String(detail.balance)
        if (!row['intensity'] && detail.intensity != null) row['intensity'] = String(detail.intensity)
      }
    } catch {
      // 검색 실패 시 원본 유지
    }

    results.push(row)
  }

  return results
}

// ── 헬퍼 ──

function writeSheet(wb: ExcelJS.Workbook, name: string, rows: Record<string, string>[], tabColor: string) {
  if (rows.length === 0) return
  const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: tabColor } } })
  const headers = Object.keys(rows[0])

  // 헤더
  const headerRow = ws.getRow(1)
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } }
  })

  // 데이터
  rows.forEach((row, idx) => {
    const dataRow = ws.getRow(idx + 2)
    headers.forEach((h, col) => {
      const val = row[h]
      // 숫자 변환 시도
      const num = Number(val)
      dataRow.getCell(col + 1).value = val !== '' && !isNaN(num) && typeof val === 'string' && val.trim() !== '' ? num : val
    })
  })

  // 열 너비 자동
  ws.columns = headers.map((h) => ({ key: h, width: Math.max(h.length * 2, 14) }))
}

function extractCity(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(' ')
  return parts[0] ?? null
}

function extractArea(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(' ')
  // "서울 종로구 익선동 ..." → 익선동
  const dong = parts.find((p) => /[동면읍리가로길]$/.test(p) && p.length >= 2)
  return dong ?? null
}
