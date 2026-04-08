import { createClient } from '@/infrastructure/supabase/client'
import { read, utils } from 'xlsx'
import ExcelJS from 'exceljs'
import type { SettingsRepository } from '@/domain/repositories/settings-repository'
import type { UserSettings, VisibilityConfig, FollowPolicy, BubblePrivacyOverride, DeleteMode } from '@/domain/entities/settings'

const SETTINGS_SELECT = 'nickname, bio, avatar_url, is_public, follow_policy, follow_min_records, follow_min_level, visibility_public, visibility_bubble, notify_push, notify_level_up, notify_bubble_join, notify_follow, dnd_start, dnd_end, pref_landing, pref_home_tab, pref_restaurant_sub, pref_wine_sub, pref_bubble_tab, pref_default_sort, pref_record_input, pref_bubble_share, pref_temp_unit, pref_timezone, pref_view_mode, deleted_at, delete_mode, delete_scheduled_at'

export class SupabaseSettingsRepository implements SettingsRepository {
  private get supabase() {
    return createClient()
  }

  async getUserSettings(userId: string): Promise<UserSettings> {
    const { data, error } = await this.supabase
      .from('users')
      .select(SETTINGS_SELECT)
      .eq('id', userId)
      .single()

    if (error) throw new Error(`Settings 조회 실패: ${error.message}`)

    return {
      nickname: data.nickname as string,
      bio: data.bio as string | null,
      avatarUrl: data.avatar_url as string | null,
      isPublic: (data.is_public as boolean) ?? false,
      followPolicy: (data.follow_policy as FollowPolicy) ?? 'blocked',
      followMinRecords: data.follow_min_records as number | null,
      followMinLevel: data.follow_min_level as number | null,
      visibilityPublic: data.visibility_public as VisibilityConfig,
      visibilityBubble: data.visibility_bubble as VisibilityConfig,
      notifyPush: (data.notify_push as boolean) ?? true,
      notifyLevelUp: (data.notify_level_up as boolean) ?? true,
      notifyBubbleJoin: (data.notify_bubble_join as boolean) ?? true,
      notifyFollow: (data.notify_follow as boolean) ?? true,
      dndStart: data.dnd_start as string | null,
      dndEnd: data.dnd_end as string | null,
      prefLanding: (data.pref_landing as string) ?? 'last',
      prefHomeTab: (data.pref_home_tab as string) ?? 'last',
      prefRestaurantSub: (data.pref_restaurant_sub as string) ?? 'last',
      prefWineSub: (data.pref_wine_sub as string) ?? 'last',
      prefBubbleTab: (data.pref_bubble_tab as string) ?? 'last',
      prefViewMode: (data.pref_view_mode as string) ?? 'last',
      prefDefaultSort: (data.pref_default_sort as string) ?? 'latest',
      prefRecordInput: (data.pref_record_input as string) ?? 'camera',
      prefBubbleShare: (data.pref_bubble_share as string) ?? 'ask',
      prefTempUnit: (data.pref_temp_unit as string) ?? 'C',
      prefTimezone: (data.pref_timezone as string) ?? null,
      deletedAt: data.deleted_at as string | null,
      deleteMode: data.delete_mode as DeleteMode | null,
      deleteScheduledAt: data.delete_scheduled_at as string | null,
    }
  }

  // ── 계정 ──

  async updateNickname(userId: string, nickname: string): Promise<void> {
    const { error } = await this.supabase.from('users').update({ nickname }).eq('id', userId)
    if (error) throw error
  }

  async updateBio(userId: string, bio: string): Promise<void> {
    const { error } = await this.supabase.from('users').update({ bio }).eq('id', userId)
    if (error) throw error
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    const { error } = await this.supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', userId)
    if (error) throw error
  }

  // ── 프라이버시 ──

  async updateIsPublic(userId: string, value: boolean): Promise<void> {
    const { error } = await this.supabase.from('users').update({ is_public: value }).eq('id', userId)
    if (error) throw error
  }

  async updateFollowPolicy(userId: string, value: FollowPolicy): Promise<void> {
    const { error } = await this.supabase.from('users').update({ follow_policy: value }).eq('id', userId)
    if (error) throw error
  }

  async updateFollowConditions(userId: string, minRecords: number | null, minLevel: number | null): Promise<void> {
    const { error } = await this.supabase.from('users').update({ follow_min_records: minRecords, follow_min_level: minLevel }).eq('id', userId)
    if (error) throw error
  }

  async updateVisibilityPublic(userId: string, config: VisibilityConfig): Promise<void> {
    const { error } = await this.supabase.from('users').update({ visibility_public: config }).eq('id', userId)
    if (error) throw error
  }

  async updateVisibilityBubble(userId: string, config: VisibilityConfig): Promise<void> {
    const { error } = await this.supabase.from('users').update({ visibility_bubble: config }).eq('id', userId)
    if (error) throw error
  }

  // ── 버블별 프라이버시 ──

  async getBubblePrivacyOverrides(userId: string): Promise<BubblePrivacyOverride[]> {
    const { data, error } = await this.supabase
      .from('bubble_members')
      .select('bubble_id, visibility_override, bubble:bubbles(name, icon_bg_color)')
      .eq('user_id', userId)

    if (error) throw error

    return (data ?? []).map((r) => {
      const bubble = r.bubble as unknown as Record<string, unknown> | null
      return {
        bubbleId: r.bubble_id as string,
        bubbleName: (bubble?.name as string) ?? '',
        bubbleAvatarColor: (bubble?.icon_bg_color as string) ?? null,
        useDefault: r.visibility_override === null,
        visibilityOverride: r.visibility_override as VisibilityConfig | null,
      }
    })
  }

  async updateBubbleVisibilityOverride(userId: string, bubbleId: string, override: VisibilityConfig | null): Promise<void> {
    const { error } = await this.supabase
      .from('bubble_members')
      .update({ visibility_override: override })
      .eq('user_id', userId)
      .eq('bubble_id', bubbleId)
    if (error) throw error
  }

  // ── 알림 ──

  async updateNotifySetting(userId: string, field: string, value: boolean): Promise<void> {
    const { error } = await this.supabase.from('users').update({ [field]: value }).eq('id', userId)
    if (error) throw error
  }

  async updateDndTime(userId: string, start: string | null, end: string | null): Promise<void> {
    const { error } = await this.supabase.from('users').update({ dnd_start: start, dnd_end: end }).eq('id', userId)
    if (error) throw error
  }

  // ── 환경설정 ──

  async updatePreference(userId: string, field: string, value: string): Promise<void> {
    const { error } = await this.supabase.from('users').update({ [field]: value }).eq('id', userId)
    if (error) throw error
  }

  // ── 계정 삭제 ──

  async requestAccountDeletion(userId: string, mode: DeleteMode): Promise<void> {
    const scheduledAt = new Date()
    scheduledAt.setDate(scheduledAt.getDate() + 30)

    const { error } = await this.supabase.from('users').update({
      deleted_at: new Date().toISOString(),
      delete_mode: mode,
      delete_scheduled_at: scheduledAt.toISOString(),
    }).eq('id', userId)
    if (error) throw error
  }

  async cancelAccountDeletion(userId: string): Promise<void> {
    const { error } = await this.supabase.from('users').update({
      deleted_at: null,
      delete_mode: null,
      delete_scheduled_at: null,
    }).eq('id', userId)
    if (error) throw error
  }

  // ── 데이터 ──

  async exportData(userId: string, format: 'json' | 'csv'): Promise<Blob> {
    const { data: records } = await this.supabase
      .from('records')
      .select('*')
      .eq('user_id', userId)

    const content = format === 'json'
      ? JSON.stringify(records ?? [], null, 2)
      : convertToCsv(records ?? [])

    return new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })
  }

  async importData(userId: string, file: File): Promise<void> {
    const name = file.name.toLowerCase()
    let rows: Record<string, unknown>[]

    if (name.endsWith('.json')) {
      const text = await file.text()
      rows = JSON.parse(text)
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      rows = parseExcel(await file.arrayBuffer())
    } else {
      // CSV (including .csv exported from Google Sheets)
      const text = await file.text()
      rows = parseCsv(text)
    }

    if (rows.length === 0) return

    for (const row of rows) {
      row.user_id = userId
      delete row.id
      delete row.created_at
      delete row.updated_at
    }

    const { error } = await this.supabase
      .from('records')
      .insert(rows)
    if (error) throw error
  }

  async generateImportTemplate(): Promise<Blob> {
    return generateTemplateWorkbook()
  }

  async getCacheSize(): Promise<number> {
    if (typeof window === 'undefined') return 0
    const caches = await window.caches?.keys()
    if (!caches) return 0
    let total = 0
    for (const name of caches) {
      const cache = await window.caches.open(name)
      const keys = await cache.keys()
      total += keys.length * 50_000
    }
    return total
  }

  async clearCache(): Promise<void> {
    if (typeof window === 'undefined') return
    const caches = await window.caches?.keys()
    if (!caches) return
    for (const name of caches) {
      await window.caches.delete(name)
    }
  }
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => {
      const trimmed = v.trim()
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        return trimmed.slice(1, -1)
      }
      return trimmed
    })
    const obj: Record<string, unknown> = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
    return obj
  })
}

function parseExcel(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) return []
  return utils.sheet_to_json<Record<string, unknown>>(sheet)
}

async function generateTemplateWorkbook(): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Nyam'

  // ── 스타일 상수 ──
  const HEADER_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } }
  const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  const DESC_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F5' } }
  const DESC_FONT: Partial<ExcelJS.Font> = { italic: true, color: { argb: 'FF666680' }, size: 10 }
  const AUTO_FILL: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
  const REQUIRED_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFD32F2F' }, size: 10 }
  const DATA_ROW_START = 3 // row 1=header, 2=description, 3+=data
  const DATA_ROW_END = 500

  // 헬퍼: 시트 공통 설정
  function setupSheet(ws: ExcelJS.Worksheet, headers: string[], descriptions: string[], autoFillCols: number[]) {
    // Row 1: 헤더
    const headerRow = ws.getRow(1)
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1)
      cell.value = h
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })
    headerRow.height = 28

    // Row 2: 설명
    const descRow = ws.getRow(2)
    descriptions.forEach((d, i) => {
      const cell = descRow.getCell(i + 1)
      cell.value = d
      cell.font = d.includes('*필수') ? REQUIRED_FONT : DESC_FONT
      cell.fill = autoFillCols.includes(i) ? AUTO_FILL : DESC_FILL
      cell.alignment = { wrapText: true, vertical: 'top' }
    })
    descRow.height = 48

    // 열 너비
    ws.columns = headers.map((h, i) => ({
      key: h,
      width: Math.max(h.length * 2, descriptions[i].length > 30 ? 22 : 16),
    }))

    // 프리즈 pane (헤더+설명 고정)
    ws.views = [{ state: 'frozen', ySplit: 2, xSplit: 0 }]
  }

  // 헬퍼: dropdown 추가
  function addDropdown(ws: ExcelJS.Worksheet, col: number, formulae: string[]) {
    for (let row = DATA_ROW_START; row <= DATA_ROW_END; row++) {
      ws.getCell(row, col).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${formulae.join(',')}"`],
        showErrorMessage: true,
        errorTitle: '잘못된 값',
        error: `다음 중 하나를 선택하세요: ${formulae.join(', ')}`,
      }
    }
  }

  // 헬퍼: 정수 범위 validation
  function addWholeRange(ws: ExcelJS.Worksheet, col: number, min: number, max: number) {
    for (let row = DATA_ROW_START; row <= DATA_ROW_END; row++) {
      ws.getCell(row, col).dataValidation = {
        type: 'whole',
        operator: 'between',
        allowBlank: true,
        formulae: [min, max],
        showErrorMessage: true,
        errorTitle: '범위 초과',
        error: `${min}~${max} 사이 정수를 입력하세요`,
      }
    }
  }

  // ══════════════════════════════════════
  // 식당 기록 시트
  // ══════════════════════════════════════
  const rs = wb.addWorksheet('식당 기록', { properties: { tabColor: { argb: 'FFFF6038' } } })

  const rHeaders = [
    'restaurant_name', 'address', 'genre', 'price_range',
    'country', 'city', 'area', 'lat', 'lng',
    'axis_x', 'axis_y', 'comment', 'scene', 'visit_date', 'meal_time',
    'total_price', 'menu_tags', 'companion_count', 'private_note',
  ]
  // autoFillCols: 이름+주소만 입력하면 자동 검색되는 컬럼 (0-indexed)
  const rAutoFill = [4, 5, 6, 7, 8] // country, city, area, lat, lng
  const rDescs = [
    '식당 이름 *필수', '주소 (자동검색에 활용)', '장르', '가격대 (1~3)',
    '자동검색', '자동검색', '자동검색 (쉼표 구분)', '자동검색', '자동검색',
    'X축 (0~100, 음식 퀄리티)', 'Y축 (0~100, 경험 가치)', '한줄평 (200자)',
    '상황 태그', '방문일 (YYYY-MM-DD)', '식사 시간',
    '1인 금액 (원)', '추천 메뉴 (쉼표 구분)', '동반자 수', '비공개 메모',
  ]

  setupSheet(rs, rHeaders, rDescs, rAutoFill)

  // Dropdowns
  const GENRES = ['한식','일식','중식','태국','베트남','인도','이탈리안','프렌치','스페인','지중해','미국','멕시칸','카페','바/주점','베이커리','기타']
  addDropdown(rs, 3, GENRES)                                    // genre
  addDropdown(rs, 4, ['1','2','3'])                             // price_range
  addDropdown(rs, 15, ['breakfast','lunch','dinner','snack'])    // meal_time
  addWholeRange(rs, 10, 0, 100)                                 // axis_x
  addWholeRange(rs, 11, 0, 100)                                 // axis_y

  // 예시 데이터
  const rExamples = [
    ['스시 오마카세 히든', '서울 종로구 익선동 166-55', '일식', 3, '한국', '서울', '익선동,종로', 37.5743, 126.9880, 82, 90, '오마카세 코스 흠잡을 데 없이 완벽', '데이트', '2026-03-15', 'dinner', 150000, '오마카세 코스,사케 페어링', 1, ''],
    ['을지로 골뱅이', '서울 중구 을지로 14길 8', '한식', 1, '한국', '서울', '을지로', 37.5660, 126.9920, 70, 85, '골뱅이 무침 양이 실하고 소주 한잔에 딱', '회식', '2026-03-20', 'dinner', 15000, '골뱅이 무침,소주', 4, '사장님이 서비스 잘 챙겨줌'],
    ['블루보틀 삼청', '서울 종로구 삼청로 76', '카페', 2, '한국', '서울', '삼청동,북촌', 37.5803, 126.9820, 75, 65, '뉴올리언스 아이스커피 추천', '혼자', '2026-04-01', 'snack', 8000, '뉴올리언스 아이스커피', 0, ''],
  ]
  rExamples.forEach((ex, idx) => {
    const row = rs.getRow(DATA_ROW_START + idx)
    ex.forEach((v, col) => { row.getCell(col + 1).value = v as ExcelJS.CellValue })
  })

  // ══════════════════════════════════════
  // 와인 기록 시트
  // ══════════════════════════════════════
  const ws = wb.addWorksheet('와인 기록', { properties: { tabColor: { argb: 'FF722F37' } } })

  const wHeaders = [
    'wine_name', 'producer', 'wine_type', 'country', 'region', 'sub_region',
    'variety', 'vintage', 'abv',
    'axis_x', 'axis_y', 'comment', 'scene', 'visit_date',
    'purchase_price', 'pairing_categories', 'meal_time',
    'aroma_primary', 'aroma_secondary', 'aroma_tertiary',
    'complexity', 'finish', 'balance', 'intensity',
    'companion_count', 'private_note',
  ]
  // autoFillCols: 와인 이름만 입력하면 자동 검색되는 컬럼
  const wAutoFill = [1, 3, 4, 5, 6, 8] // producer, country, region, sub_region, variety, abv
  const wDescs = [
    '와인 이름 *필수', '자동검색', '타입 *필수', '자동검색', '자동검색', '자동검색',
    '자동검색', '빈티지 (NV는 비움)', '자동검색',
    'X축 (0~100, 구조·완성도)', 'Y축 (0~100, 즐거움·감성)', '한줄평 (200자)',
    '상황 태그', '음용일 (YYYY-MM-DD)',
    '구매가 (원)', '페어링 (쉼표 구분)', '식사 시간',
    '1차 아로마 (쉼표 구분)', '2차 아로마 (쉼표 구분)', '3차 아로마 (쉼표 구분)',
    '복합성 (0~100)', '여운 (0~100)', '균형 (0~100)', '강도 (0~100)',
    '동반자 수', '비공개 메모',
  ]

  setupSheet(ws, wHeaders, wDescs, wAutoFill)

  // Dropdowns
  const WINE_TYPES = ['red','white','rose','sparkling','orange','fortified','dessert']
  const PAIRINGS = ['red_meat','white_meat','seafood','cheese','vegetable','spicy','dessert','charcuterie']
  const AROMA_1 = ['citrus','apple_pear','tropical','stone_fruit','red_berry','dark_berry','floral','white_floral','herb']
  const AROMA_2 = ['butter','vanilla','spice','toast']
  const AROMA_3 = ['leather','earth','nut']

  addDropdown(ws, 3, WINE_TYPES)                                // wine_type
  addDropdown(ws, 17, ['breakfast','lunch','dinner','snack'])    // meal_time
  addWholeRange(ws, 10, 0, 100)                                 // axis_x
  addWholeRange(ws, 11, 0, 100)                                 // axis_y
  addWholeRange(ws, 21, 0, 100)                                 // complexity
  addWholeRange(ws, 22, 0, 100)                                 // finish
  addWholeRange(ws, 23, 0, 100)                                 // balance
  addWholeRange(ws, 24, 0, 100)                                 // intensity

  // 쉼표 구분 컬럼 — 셀 코멘트로 선택지 안내
  const multiNotes: Array<[number, string, string[]]> = [
    [16, '페어링 카테고리', PAIRINGS],
    [18, '1차 아로마 (과일/꽃/허브)', AROMA_1],
    [19, '2차 아로마 (발효/양조)', AROMA_2],
    [20, '3차 아로마 (숙성/산화)', AROMA_3],
  ]
  for (const [col, label, opts] of multiNotes) {
    ws.getCell(1, col).note = `${label}\n쉼표로 여러 개 입력 가능:\n${opts.join(', ')}`
  }

  // 예시 데이터
  const wExamples = [
    ['Opus One 2019', 'Opus One Winery', 'red', 'USA', 'California', 'Napa Valley', 'Cabernet Sauvignon', 2019, 14.5, 92, 88, '놀라운 밸런스, 블랙커런트와 시가박스 향', '기념일', '2026-03-10', 650000, 'red_meat,cheese', 'dinner', 'dark_berry,stone_fruit', 'vanilla,toast', 'leather', 90, 95, 92, 85, 1, '결혼기념일 와인'],
    ['Cloudy Bay Sauvignon Blanc 2023', 'Cloudy Bay', 'white', 'New Zealand', 'Marlborough', '', 'Sauvignon Blanc', 2023, 13.0, 72, 80, '풀향과 자몽 노트가 상쾌', '홈파티', '2026-04-05', 35000, 'seafood,vegetable', 'lunch', 'citrus,tropical,herb', '', '', 50, 45, 70, 65, 3, ''],
    ['Moët & Chandon Impérial Brut NV', 'Moët & Chandon', 'sparkling', 'France', 'Champagne', '', 'Chardonnay', '', 12.0, 78, 92, '축하 자리에 빠지지 않는 클래식', '축하', '2026-02-14', 89000, 'cheese,charcuterie', 'dinner', 'apple_pear,citrus,white_floral', 'toast,butter', '', 70, 60, 80, 70, 2, '발렌타인 데이'],
  ]
  wExamples.forEach((ex, idx) => {
    const row = ws.getRow(DATA_ROW_START + idx)
    ex.forEach((v, col) => { row.getCell(col + 1).value = v as ExcelJS.CellValue })
  })

  // ── Buffer → Blob ──
  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

function convertToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))
  }
  return lines.join('\n')
}
