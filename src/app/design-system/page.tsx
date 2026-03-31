'use client'

import { useState } from 'react'
import {
  Bell, Search, SlidersHorizontal, ArrowUpDown, Heart,
  Utensils, Wine, MapPin, Camera, Share2, Plus, Settings,
  Trophy, ChevronLeft, ChevronRight, X, Check, Star,
  Home, Compass, MessageCircle, User,
} from 'lucide-react'

/* ── 기본 UI 컴포넌트 ── */
import { Tag } from '@/presentation/components/ui/tag'
import { SceneTag } from '@/presentation/components/ui/scene-tag'
import { WineChip } from '@/presentation/components/ui/wine-chip'
import { Badge } from '@/presentation/components/ui/badge'
import { NyamCard } from '@/presentation/components/ui/nyam-card'
import { FilterChip, FilterChipGroup } from '@/presentation/components/ui/filter-chip'
import { FilterTab } from '@/presentation/components/ui/filter-tab'
import { StickyTabs } from '@/presentation/components/ui/sticky-tabs'
import { Toast } from '@/presentation/components/ui/toast'
import { EmptyState } from '@/presentation/components/ui/empty-state'
import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'
import { IconButton } from '@/presentation/components/ui/icon-button'
import { StepProgress } from '@/presentation/components/ui/step-progress'
import { NyamToggle } from '@/presentation/components/ui/nyam-toggle'
import { Segment } from '@/presentation/components/ui/segment'
import { NyamSelect } from '@/presentation/components/ui/nyam-select'
import { CompactListItem } from '@/presentation/components/ui/compact-list-item'
import { ViewCycleButton } from '@/presentation/components/ui/view-cycle-button'
import { IntroCard } from '@/presentation/components/ui/intro-card'
import { LoadingState } from '@/presentation/components/ui/loading-state'
import { NyamInput } from '@/presentation/components/ui/nyam-input'
import { FilterSystem } from '@/presentation/components/ui/filter-system'
import { SortDropdown } from '@/presentation/components/home/sort-dropdown'
import { SearchDropdown } from '@/presentation/components/ui/search-dropdown'
import { RatingInput } from '@/presentation/components/record/rating-input'
import { RecordSaveBar } from '@/presentation/components/record/record-save-bar'
import { PopupWindow } from '@/presentation/components/ui/popup-window'
import { RESTAURANT_FILTER_ATTRIBUTES, WINE_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'
import { ConditionFilterBar } from '@/presentation/components/home/condition-filter-bar'
import { AdvancedFilterSheet } from '@/presentation/components/home/advanced-filter-sheet'
import type { FilterChipItem } from '@/domain/entities/condition-chip'
import { LayoutGrid, List } from 'lucide-react'

/* ── 섹션 래퍼 (프로토타입 .section 스타일) ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h2 style={{
        fontSize: '16px', fontWeight: 700, color: 'var(--text-sub)',
        textTransform: 'uppercase', letterSpacing: '1px',
        margin: '56px 0 20px', paddingBottom: '8px',
        borderBottom: '1px solid var(--border)',
      }}>{title}</h2>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--r-lg)',
        padding: '24px', marginBottom: '12px',
        border: '1px solid var(--border)',
      }}>{children}</div>
    </>
  )
}

function Sub({ title }: { title: string }) {
  return (
    <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-hint)', margin: '24px 0 10px' }}>
      {title}
    </h3>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>{children}</div>
}

function Swatch({ color, name, hex }: { color: string; name: string; hex: string }) {
  return (
    <div style={{ width: '80px', textAlign: 'center' }}>
      <div style={{
        height: '48px', borderRadius: 'var(--r-md)', marginBottom: '6px',
        backgroundColor: color, border: '1px solid rgba(61,56,51,0.06)',
      }} />
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-sub)' }}>{name}</div>
      <div style={{ fontSize: '9px', color: 'var(--text-hint)', fontFamily: 'monospace' }}>{hex}</div>
    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '8px', lineHeight: 1.6 }}>{children}</div>
}

export default function DesignSystemPage() {
  const [toggleOn, setToggleOn] = useState(false)
  const [segmentVal, setSegmentVal] = useState('public')
  const [selectVal, setSelectVal] = useState('latest')
  const [activeChip, setActiveChip] = useState<string | null>('all')
  const [demoChips, setDemoChips] = useState([
    { id: 'all', name: '광화문 맛집' },
    { id: 'solo', name: '혼밥 85+' },
  ])
  const [chipName, setChipName] = useState('광화문 맛집')
  const [activeTab, setActiveTab] = useState<'food' | 'wine'>('food')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [filterActive, setFilterActive] = useState(false)
  const [sortActive, setSortActive] = useState(false)
  const [searchActive, setSearchActive] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [demoRules, setDemoRules] = useState<FilterRule[]>([
    { attribute: 'scene', operator: 'eq', value: 'solo' },
  ])
  const [demoConjunction, setDemoConjunction] = useState<'and' | 'or'>('and')
  const [demoSort, setDemoSort] = useState<SortOption>('latest')
  const [demoSearch, setDemoSearch] = useState('')

  // 7-B Condition Filter demo states
  const [foodChips, setFoodChips] = useState<FilterChipItem[]>([])
  const [wineChips, setWineChips] = useState<FilterChipItem[]>([])
  const [prefilledChips, setPrefilledChips] = useState<FilterChipItem[]>([
    { id: 'pf_status', attribute: 'status', operator: 'eq' as const, value: 'visited', displayLabel: '방문' },
    { id: 'pf_genre', attribute: 'genre', operator: 'eq' as const, value: '한식', displayLabel: '한식' },
    { id: 'pf_scene', attribute: 'scene', operator: 'eq' as const, value: 'romantic', displayLabel: '데이트' },
  ])
  const [advancedSheetOpen, setAdvancedSheetOpen] = useState(false)
  const [advancedSheetType, setAdvancedSheetType] = useState<'food' | 'wine'>('food')
  const [ratingValue, setRatingValue] = useState({ x: 50, y: 50 })
  const [ratingHint, setRatingHint] = useState(false)
  const [wineRatingValue, setWineRatingValue] = useState({ x: 50, y: 50 })
  const [wineRatingHint, setWineRatingHint] = useState(false)

  // StickyTabs demo states
  const [homeTab, setHomeTab] = useState<'restaurant' | 'wine'>('restaurant')
  const [bubbleTab, setBubbleTab] = useState<'feed' | 'ranking' | 'members'>('feed')
  const [socialTab, setSocialTab] = useState<'bubbles' | 'bubblers'>('bubbles')

  const toggleDark = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100dvh', padding: '40px 20px', maxWidth: '820px', margin: '0 auto', fontFamily: 'var(--font)' }}>
      {/* 다크모드 토글 */}
      <button
        type="button"
        onClick={toggleDark}
        style={{
          position: 'fixed', top: '16px', right: '16px', zIndex: 999,
          padding: '8px 12px', borderRadius: 'var(--r-sm)',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          fontSize: '13px', cursor: 'pointer', color: 'var(--text)',
        }}
      >
        {darkMode ? '☀️ 라이트' : '🌙 다크모드'}
      </button>

      {/* 페이지 타이틀 */}
      <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>
        <span className="header-brand" style={{ fontSize: '28px' }}>nyam</span> Design System
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '48px' }}>
        조용한 개인 컬렉션 — 재사용 가능한 요소 기반 디자인 시스템
      </div>

      {/* ── 0. Brand & Logo ── */}
      <Section title="0. Brand & Logo">
        <Sub title="nyam 로고" />
        <Row>
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '20px 30px', background: 'var(--bg)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
              <span className="header-brand" style={{ fontSize: '42px', letterSpacing: '-1px' }}>nyam</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '8px' }}>로그인 / 스플래시 (42px)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '20px 30px', background: 'var(--bg)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
              <span className="header-brand">nyam</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '8px' }}>앱 헤더 (22px)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '20px 30px', background: '#1E1C1A', borderRadius: 'var(--r-lg)' }}>
              <span style={{
                fontFamily: 'var(--font-logo)', fontSize: '42px', fontWeight: 700, letterSpacing: '-1px',
                background: 'linear-gradient(135deg, #FF8060, #B8A0C8)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>nyam</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '8px' }}>다크 배경 (42px)</div>
          </div>
        </Row>
      </Section>

      {/* ── 1. Color Tokens ── */}
      <Section title="1. Color Tokens">
        <Sub title="Surface" />
        <Row>
          <Swatch color="var(--bg)" name="bg" hex="#F8F6F3" />
          <Swatch color="var(--bg-card)" name="bg-card" hex="#FEFCFA" />
          <Swatch color="var(--bg-elevated)" name="bg-elevated" hex="#FFFFFF" />
          <Swatch color="var(--bg-page)" name="bg-page" hex="#EFECE7" />
        </Row>
        <Sub title="Text" />
        <Row>
          <Swatch color="var(--text)" name="text" hex="#3D3833" />
          <Swatch color="var(--text-sub)" name="text-sub" hex="#8C8580" />
          <Swatch color="var(--text-hint)" name="text-hint" hex="#B5AFA8" />
        </Row>
        <Sub title="Border" />
        <Row>
          <Swatch color="var(--border)" name="border" hex="#E8E4DF" />
          <Swatch color="var(--border-bold)" name="border-bold" hex="#D4CFC8" />
        </Row>
        <Sub title="Accent — Restaurant" />
        <Row>
          <Swatch color="var(--accent-food)" name="accent-food" hex="#C17B5E" />
          <Swatch color="var(--accent-food-light)" name="light" hex="#F5EDE8" />
          <Swatch color="var(--accent-food-dim)" name="dim" hex="#E8D5CB" />
        </Row>
        <Sub title="Accent — Wine" />
        <Row>
          <Swatch color="var(--accent-wine)" name="accent-wine" hex="#8B7396" />
          <Swatch color="var(--accent-wine-light)" name="light" hex="#F0ECF3" />
          <Swatch color="var(--accent-wine-dim)" name="dim" hex="#DDD5E3" />
        </Row>
        <Sub title="Accent — Social" />
        <Row>
          <Swatch color="var(--accent-social)" name="accent-social" hex="#7A9BAE" />
          <Swatch color="var(--accent-social-light)" name="light" hex="#EDF2F5" />
        </Row>
        <Sub title="Semantic" />
        <Row>
          <Swatch color="var(--positive)" name="positive" hex="#7EAE8B" />
          <Swatch color="var(--caution)" name="caution" hex="#C9A96E" />
          <Swatch color="var(--negative)" name="negative" hex="#B87272" />
        </Row>
        <Sub title="Rating Gauge — Food (음식 퀄리티)" />
        <Row>
          <Swatch color="#C4B5A8" name="0~20" hex="#C4B5A8" />
          <Swatch color="#C8907A" name="21~40" hex="#C8907A" />
          <Swatch color="#C17B5E" name="41~60" hex="#C17B5E" />
          <Swatch color="#B5603A" name="61~80" hex="#B5603A" />
          <Swatch color="#A83E1A" name="81~100" hex="#A83E1A" />
        </Row>
        <Sub title="Rating Gauge — Experience (경험 가치)" />
        <Row>
          <Swatch color="#B5B0BA" name="0~20" hex="#B5B0BA" />
          <Swatch color="#A08DA8" name="21~40" hex="#A08DA8" />
          <Swatch color="#8B7396" name="41~60" hex="#8B7396" />
          <Swatch color="#7A5A8E" name="61~80" hex="#7A5A8E" />
          <Swatch color="#6B3FA0" name="81~100" hex="#6B3FA0" />
        </Row>
        <Sub title="Rating Gauge — Total (총점)" />
        <Row>
          <Swatch color="#C4BCA8" name="0~20" hex="#C4BCA8" />
          <Swatch color="#D4B85C" name="21~40" hex="#D4B85C" />
          <Swatch color="#E0A820" name="41~60" hex="#E0A820" />
          <Swatch color="#D49215" name="61~80" hex="#D49215" />
          <Swatch color="#C87A0A" name="81~100" hex="#C87A0A" />
        </Row>
        <Sub title="Rating Gauge — Wine Total (와인 총점)" />
        <Row>
          <Swatch color="#D8D0E0" name="0~20" hex="#D8D0E0" />
          <Swatch color="#D0B0E8" name="21~40" hex="#D0B0E8" />
          <Swatch color="#C090E0" name="41~60" hex="#C090E0" />
          <Swatch color="#B070D8" name="61~80" hex="#B070D8" />
          <Swatch color="#A050D0" name="81~100" hex="#A050D0" />
        </Row>
        <Sub title="Scene Tags" />
        <Row>
          <SceneTag scene="solo" />
          <SceneTag scene="romantic" />
          <SceneTag scene="friends" />
          <SceneTag scene="family" />
          <SceneTag scene="business" />
          <SceneTag scene="drinks" />
        </Row>
        <Sub title="Wine Type Chips" />
        <Row>
          <WineChip type="red" />
          <WineChip type="white" />
          <WineChip type="rose" />
          <WineChip type="orange" />
          <WineChip type="sparkling" />
        </Row>
      </Section>

      {/* ── 2. Typography ── */}
      <Section title="2. Typography">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: 'Display — 36px / 800', cls: 'text-display', example: '92' },
            { label: 'H1 — 22px / 700', cls: 'text-h1', example: '선택한 동네의 대표 맛집이에요' },
            { label: 'H2 — 17px / 600', cls: 'text-h2', example: '미진' },
            { label: 'Body — 15px / 400', cls: 'text-body', example: '한식 · 광화문 · 냉면 전문' },
            { label: 'Sub — 13px / 400', cls: 'text-sub', example: 'N 4.5 · K 4.2 · G 4.3', color: 'var(--text-sub)' },
            { label: 'Caption — 11px / 400', cls: 'text-caption', example: '2026.03.19 화요일 · 데이트', color: 'var(--text-hint)' },
          ].map(({ label, cls, example, color }) => (
            <div key={label}>
              <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '2px' }}>{label}</div>
              <p className={cls} style={color ? { color } : undefined}>{example}</p>
            </div>
          ))}
        </div>
        <Note>텍스트는 <code style={{ fontSize: '11px', background: 'var(--bg)', padding: '2px 6px', borderRadius: 'var(--r-xs)', color: 'var(--accent-food)' }}>--text</code> (#3D3833) 따뜻한 차콜 기본. 순흑(#000) 사용 금지.</Note>
      </Section>

      {/* ── 3. Icons ── */}
      <Section title="3. Icons (Lucide)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          {[
            { icon: Utensils, label: 'utensils', color: 'var(--accent-food)' },
            { icon: Wine, label: 'wine', color: 'var(--accent-wine)' },
            { icon: Camera, label: 'camera', color: 'var(--text-sub)' },
            { icon: Search, label: 'search', color: 'var(--text-sub)' },
            { icon: Heart, label: 'heart', color: 'var(--caution)' },
            { icon: Star, label: 'star', color: 'var(--caution)' },
            { icon: ChevronLeft, label: 'chevron-left', color: 'var(--text)' },
            { icon: ChevronRight, label: 'chevron-right', color: 'var(--text)' },
            { icon: X, label: 'x', color: 'var(--text-hint)' },
            { icon: Plus, label: 'plus', color: 'var(--text)' },
            { icon: Home, label: 'home', color: 'var(--text-sub)' },
            { icon: Compass, label: 'compass', color: 'var(--text-sub)' },
            { icon: MessageCircle, label: 'message-circle', color: 'var(--text-sub)' },
            { icon: User, label: 'user', color: 'var(--text-sub)' },
            { icon: Check, label: 'check', color: 'var(--positive)' },
            { icon: MapPin, label: 'map-pin', color: 'var(--accent-food)' },
            { icon: Share2, label: 'share-2', color: 'var(--text-sub)' },
            { icon: Bell, label: 'bell', color: 'var(--text-sub)' },
          ].map(({ icon: Ic, label, color }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '44px' }}>
              <Ic size={24} style={{ color }} />
              <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>{label}</span>
            </div>
          ))}
        </div>
        <Note>Lucide (https://lucide.dev) 24px 기본. 색상은 컨텍스트에 따라 토큰 사용.</Note>
      </Section>

      {/* ── 4. Buttons ── */}
      <Section title="4. Buttons">
        <Sub title="Primary CTA" />
        <Row>
          <button type="button" className="btn-primary">CTA 텍스트</button>
          <button type="button" className="btn-primary wine">CTA 텍스트</button>
          <button type="button" className="btn-primary" disabled>비활성 상태</button>
        </Row>
        <Note>뒤로가기: §16 Floating Back Button 사용. 건너뛰기: 우측 상단 텍스트 링크로 처리.</Note>

        <Sub title="Card Actions" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '340px' }}>
          <Row>
            <button type="button" className="btn-card-action">가봤음</button>
            <button type="button" className="btn-card-action">가보고싶음</button>
          </Row>
          <Row>
            <button type="button" className="btn-card-action active-food">가봤음</button>
            <button type="button" className="btn-card-action active-wish">찜</button>
            <button type="button" className="btn-card-action active-wine">맞아요</button>
          </Row>
        </div>

        <Sub title="Search Actions" />
        <Row>
          <button type="button" className="btn-ghost">사진으로 찾기</button>
          <button type="button" className="btn-ghost">이름으로 검색</button>
          <button type="button" className="btn-search-submit">찾기</button>
        </Row>

        <Sub title="Social Login" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '340px', margin: '0 auto' }}>
          <button type="button" className="btn-social google">Google로 시작</button>
          <button type="button" className="btn-social kakao">카카오로 시작</button>
          <button type="button" className="btn-social apple">Apple로 시작</button>
          <button type="button" className="btn-social naver">네이버로 시작</button>
        </div>
      </Section>

      {/* ── 5. Cards ── */}
      <Section title="5. Cards">
        <Sub title="Default" />
        <NyamCard className="p-4" style={{ maxWidth: '380px' }}>
          <div className="card-top" style={{ gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--r-md)', background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-sub)' }}>
              <Utensils size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>미진</div>
              <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>한식 · 광화문 <Badge type="blue-ribbon" /></div>
            </div>
          </div>
          <div className="card-actions" style={{ marginTop: '12px' }}>
            <button type="button" className="btn-card-action">가봤음</button>
            <button type="button" className="btn-card-action">가보고싶음</button>
          </div>
        </NyamCard>

        <Sub title="Visited — Restaurant (gauge inline)" />
        <NyamCard state="visited" className="p-4" style={{ maxWidth: '380px' }}>
          <div className="card-top" style={{ gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--r-md)', background: 'var(--accent-food-light)', border: '1px solid var(--accent-food-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent-food)' }}>
              <Utensils size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>미진</div>
              <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>한식 · 광화문</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <div className="satisfaction-gauge" style={{ flex: 1 }}>
              <div className="satisfaction-gauge-fill" style={{ width: '78%', backgroundColor: '#D49215' }} />
              <div className="satisfaction-gauge-label">78</div>
            </div>
            <button type="button" style={{ color: 'var(--text-hint)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
          </div>
        </NyamCard>

        <Sub title="Visited — Wine (confirmed)" />
        <NyamCard state="confirmed" className="p-4" style={{ maxWidth: '380px' }}>
          <div className="card-top" style={{ gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--r-md)', background: 'var(--accent-wine-light)', border: '1px solid var(--accent-wine-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent-wine)' }}>
              <Wine size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>몬테스 알파 까베르네</div>
              <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>레드 · 칠레 · ★4.1</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <div className="satisfaction-gauge" style={{ flex: 1 }}>
              <div className="satisfaction-gauge-fill" style={{ width: '75%', backgroundColor: '#B070D8' }} />
              <div className="satisfaction-gauge-label">75</div>
            </div>
            <button type="button" style={{ color: 'var(--text-hint)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
          </div>
        </NyamCard>

        <Sub title="Wishlisted" />
        <NyamCard state="wishlisted" className="p-4" style={{ maxWidth: '380px' }}>
          <div className="card-top" style={{ gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--r-md)', background: '#FBF8F1', border: '1px solid var(--caution)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--caution)' }}>
              <Heart size={20} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>토속촌</div>
              <div style={{ fontSize: '12px', color: 'var(--text-sub)', marginTop: '2px' }}>한식 · 광화문</div>
            </div>
          </div>
        </NyamCard>
      </Section>

      {/* ── 6. Satisfaction Gauge ── */}
      <Section title="6. Satisfaction Gauge">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { score: 25, label: '25 — Worst' },
            { score: 42, label: '' },
            { score: 63, label: '' },
            { score: 78, label: '' },
            { score: 92, label: '92 — Best' },
          ].map(({ score, label }) => {
            const gaugeColors = [
              { max: 20, color: '#C4BCA8' },
              { max: 40, color: '#D4B85C' },
              { max: 60, color: '#E0A820' },
              { max: 80, color: '#D49215' },
              { max: 100, color: '#C87A0A' },
            ]
            const color = (gaugeColors.find((g) => score <= g.max) ?? gaugeColors[4]).color
            return (
              <div key={score}>
                {label && <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '4px' }}>{label}</div>}
                <div className="satisfaction-gauge">
                  <div className="satisfaction-gauge-fill" style={{ width: `${score}%`, backgroundColor: color }} />
                  <div className="satisfaction-gauge-label">{score}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', padding: '0 4px' }}>
          <span className="satisfaction-gauge-hint">별로</span>
          <span className="satisfaction-gauge-hint">최고</span>
        </div>
        <Note>식당·와인 공통. 절제된 자연색 5단계.</Note>
      </Section>

      {/* ── 7. Sticky Tabs (StickyTabs) ── */}
      <Section title="7. Sticky Tabs">
        <Note>StickyTabs — 중앙화 컴포넌트. variant: food / wine / social. rightSlot으로 우측 아이콘 배치.</Note>

        <Sub title="홈 스타일 (식당/와인 + 우측 아이콘)" />
        <div style={{ maxWidth: '420px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <StickyTabs
            tabs={[
              { key: 'restaurant' as const, label: '식당', variant: 'food' },
              { key: 'wine' as const, label: '와인', variant: 'wine' },
            ]}
            activeTab={homeTab}
            onTabChange={setHomeTab}
            rightSlot={
              <div className="flex items-center gap-1">
                <button type="button" className="view-cycle-btn"><LayoutGrid size={20} /></button>
                <button type="button" className={`icon-button ${homeTab === 'restaurant' ? 'active food' : 'active wine'}`}><SlidersHorizontal size={20} /></button>
                <button type="button" className="icon-button"><ArrowUpDown size={20} /></button>
                <button type="button" className="icon-button"><Search size={20} /></button>
              </div>
            }
          />
        </div>

        <Sub title="버블 상세 (피드/랭킹/멤버)" />
        <div style={{ maxWidth: '420px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <StickyTabs
            tabs={[
              { key: 'feed' as const, label: '피드' },
              { key: 'ranking' as const, label: '랭킹' },
              { key: 'members' as const, label: '멤버' },
            ]}
            activeTab={bubbleTab}
            variant="social"
            onTabChange={setBubbleTab}
            rightSlot={
              <button type="button" className="icon-button"><List size={20} /></button>
            }
          />
        </div>

        <Sub title="버블 목록 (버블/버블러)" />
        <div style={{ maxWidth: '420px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <StickyTabs
            tabs={[
              { key: 'bubbles' as const, label: '버블' },
              { key: 'bubblers' as const, label: '버블러' },
            ]}
            activeTab={socialTab}
            variant="social"
            onTabChange={setSocialTab}
          />
        </div>

        <Sub title="탭 + 필터칩 조합 (표준 간격)" />
        <Note>탭 바(content-tabs) 바로 아래 필터칩. 간격: 탭 하단 border → 칩 상단 = 8px (py-2). 좌우 px-4 동일.</Note>
        <div style={{ maxWidth: '420px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <StickyTabs
            tabs={[
              { key: 'restaurant' as const, label: '식당', variant: 'food' },
              { key: 'wine' as const, label: '와인', variant: 'wine' },
            ]}
            activeTab={homeTab}
            onTabChange={setHomeTab}
          />
          <FilterChipGroup className="px-4 py-2">
            <FilterChip active variant={homeTab === 'restaurant' ? 'food' : 'wine'} count={24}>전체</FilterChip>
            <FilterChip variant={homeTab === 'restaurant' ? 'food' : 'wine'} count={8}>광화문</FilterChip>
            <FilterChip variant={homeTab === 'restaurant' ? 'food' : 'wine'} count={5}>을지로</FilterChip>
          </FilterChipGroup>
          <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--text-hint)' }}>컨텐츠 영역</div>
        </div>

        <div style={{ height: '16px' }} />

        <div style={{ maxWidth: '420px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <StickyTabs
            tabs={[{ key: 'bubbles' as const, label: '버블' }, { key: 'bubblers' as const, label: '버블러' }]}
            activeTab={socialTab}
            variant="social"
            onTabChange={setSocialTab}
          />
          <FilterChipGroup className="px-4 py-2">
            <FilterChip active variant="social" count={12}>전체</FilterChip>
            <FilterChip variant="social" count={3}>운영</FilterChip>
            <FilterChip variant="social" count={9}>가입</FilterChip>
          </FilterChipGroup>
          <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--text-hint)' }}>컨텐츠 영역</div>
        </div>

        <Sub title="개별 FilterTab (레거시 호환)" />
        <Row>
          <FilterTab active variant="food">식당</FilterTab>
          <FilterTab variant="food">와인</FilterTab>
          <FilterTab active variant="wine">레드</FilterTab>
          <FilterTab variant="wine">화이트</FilterTab>
        </Row>
      </Section>

      {/* ── 7-A. Filter Chips ── */}
      <Section title="7-A. Filter Chips">
        <Note>FilterChip + FilterChipGroup — 중앙화 컴포넌트. variant: food / wine / social.</Note>

        <Sub title="Food variant" />
        <FilterChipGroup>
          <FilterChip active variant="food" count={24}>전체</FilterChip>
          <FilterChip variant="food" count={8}>한식</FilterChip>
          <FilterChip variant="food" count={6}>일식</FilterChip>
          <FilterChip variant="food" count={5}>양식</FilterChip>
          <FilterChip variant="food" count={3}>중식</FilterChip>
          <FilterChip variant="food" count={2}>카페</FilterChip>
        </FilterChipGroup>

        <Sub title="Wine variant" />
        <FilterChipGroup>
          <FilterChip active variant="wine" count={18}>전체</FilterChip>
          <FilterChip variant="wine" count={7}>레드</FilterChip>
          <FilterChip variant="wine" count={5}>화이트</FilterChip>
          <FilterChip variant="wine" count={4}>스파클링</FilterChip>
          <FilterChip variant="wine" count={2}>로제</FilterChip>
        </FilterChipGroup>

        <Sub title="Social variant (버블)" />
        <FilterChipGroup>
          <FilterChip active variant="social" count={12}>전체</FilterChip>
          <FilterChip variant="social" count={3}>운영</FilterChip>
          <FilterChip variant="social" count={9}>가입</FilterChip>
        </FilterChipGroup>

        <Sub title="Mixed — 카운트 없음" />
        <FilterChipGroup>
          <FilterChip active variant="food">전체</FilterChip>
          <FilterChip variant="food">이번 주</FilterChip>
          <FilterChip variant="food">이번 달</FilterChip>
          <FilterChip variant="food">90+</FilterChip>
          <FilterChip variant="food">80+</FilterChip>
        </FilterChipGroup>

        <Sub title="States 비교" />
        <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '8px' }}>Default</div>
            <FilterChip>라벨</FilterChip>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '8px' }}>Active (food)</div>
            <FilterChip active variant="food">라벨</FilterChip>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '8px' }}>Active (wine)</div>
            <FilterChip active variant="wine">라벨</FilterChip>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '8px' }}>Active (social)</div>
            <FilterChip active variant="social">라벨</FilterChip>
          </div>
        </div>
      </Section>

      {/* ── 7-B. Condition Filter System ── */}
      <Section title="7-B. Condition Filter System">
        <Note>ConditionFilterBar — 개별 조건 칩 기반 필터. 칩 하나 = 조건 하나 (AND 조합).</Note>

        <Sub title="Food — 빈 상태 (칩 없음 = 전체보기)" />
        <div style={{ margin: '0 -24px', background: 'var(--bg)' }}>
          <ConditionFilterBar
            chips={foodChips}
            onChipsChange={setFoodChips}
            attributes={RESTAURANT_FILTER_ATTRIBUTES}
            accentType="food"
            onAdvancedOpen={() => { setAdvancedSheetType('food'); setAdvancedSheetOpen(true) }}
          />
        </div>

        <Sub title="Wine — 빈 상태 (칩 없음 = 전체보기)" />
        <div style={{ margin: '0 -24px', background: 'var(--bg)' }}>
          <ConditionFilterBar
            chips={wineChips}
            onChipsChange={setWineChips}
            attributes={WINE_FILTER_ATTRIBUTES}
            accentType="wine"
            onAdvancedOpen={() => { setAdvancedSheetType('wine'); setAdvancedSheetOpen(true) }}
          />
        </div>

        <Sub title="Food — 칩 적용 상태 (방문 + 한식 + 데이트)" />
        <div style={{ margin: '0 -24px', background: 'var(--bg)' }}>
          <ConditionFilterBar
            chips={prefilledChips}
            onChipsChange={setPrefilledChips}
            attributes={RESTAURANT_FILTER_ATTRIBUTES}
            accentType="food"
            onAdvancedOpen={() => { setAdvancedSheetType('food'); setAdvancedSheetOpen(true) }}
          />
        </div>

        <Sub title="Advanced Filter Sheet" />
        <button
          type="button"
          onClick={() => { setAdvancedSheetType('food'); setAdvancedSheetOpen(true) }}
          style={{
            padding: '8px 16px', borderRadius: 'var(--r-md)',
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text)', fontSize: '13px', cursor: 'pointer',
          }}
        >
          Advanced Filter Sheet 열기
        </button>

        <AdvancedFilterSheet
          isOpen={advancedSheetOpen}
          onClose={() => setAdvancedSheetOpen(false)}
          onApply={(chip) => {
            if (advancedSheetType === 'food') {
              setFoodChips((prev) => [...prev.filter((c) => c.attribute !== '__advanced__'), chip])
            } else {
              setWineChips((prev) => [...prev.filter((c) => c.attribute !== '__advanced__'), chip])
            }
          }}
          attributes={advancedSheetType === 'food' ? RESTAURANT_FILTER_ATTRIBUTES : WINE_FILTER_ATTRIBUTES}
          accentType={advancedSheetType}
        />
      </Section>

      {/* ── 7-C. Search Dropdown ── */}
      <Section title="7-C. Search Dropdown">
        <Sub title="기본" />
        <div style={{ position: 'relative', height: '44px' }}>
          <SearchDropdown
            query={demoSearch}
            onQueryChange={setDemoSearch}
            onClear={() => setDemoSearch('')}
            placeholder="식당·와인 이름으로 검색"
            autoFocus={false}
          />
        </div>
        <Note>
          ds-search-dropdown 클래스 사용. position: absolute + right: 0 으로 부모 기준 드롭다운 표시.<br />
          홈 툴바 검색 버튼 클릭 시 열리는 입력 패널. 단색 bg-elevated 배경, 아이콘 + 인풋 + 클리어 버튼 구성.
        </Note>
      </Section>

      {/* ── 8. Inputs ── */}
      <Section title="8. Inputs">
        <Sub title="Dropdown Select" />
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '6px' }}>기본 정렬</div>
            <div style={{ width: '160px' }}>
              <NyamSelect
                options={[
                  { value: 'latest', label: '최신순' },
                  { value: 'score_high', label: '점수 높은순' },
                  { value: 'name', label: '이름순' },
                ]}
                value={selectVal}
                onChange={setSelectVal}
              />
            </div>
          </div>
        </div>

        <Sub title="Text Input (NyamInput)" />
        <NyamInput placeholder="와인 이름 검색..." style={{ maxWidth: '340px' }} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', maxWidth: '340px' }}>
          <NyamInput placeholder="와인 이름 검색..." style={{ flex: 1 }} />
          <button type="button" className="btn-search-submit">찾기</button>
        </div>
      </Section>

      {/* ── 9. Bottom Sheet ── */}
      <Section title="9. Bottom Sheet">
        <button type="button" className="btn-primary" onClick={() => setSheetOpen(true)}>바텀 시트 열기</button>
        <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input type="text" className="nyam-input" placeholder="와인 이름 검색..." style={{ flex: 1 }} />
              <button type="button" className="btn-search-submit">찾기</button>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>검색 결과가 여기에 표시됩니다</div>
          </div>
        </BottomSheet>
      </Section>

      {/* ── 10. Intro Selection ── */}
      <Section title="10. Intro Selection">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <IntroCard
            selected
            variant="food"
            icon={<Utensils size={20} style={{ color: 'var(--accent-food)' }} />}
            title="맛집 기록"
            description="가본 식당에 점수를 매기고 찜하기"
          />
          <IntroCard
            variant="wine"
            icon={<Wine size={20} style={{ color: 'var(--accent-wine)' }} />}
            title="와인 기록"
            description="사진이나 검색으로 와인 등록"
          />
        </div>
      </Section>

      {/* ── 11. Tags & Badges ── */}
      <Section title="11. Tags & Badges">
        <Sub title="Tags" />
        <Row>
          <Tag>기본</Tag>
          <Tag variant="food">한식</Tag>
          <Tag variant="wine">레드</Tag>
        </Row>
        <Sub title="Badges — Restaurant" />
        <Row>
          <Badge type="michelin" />
          <Badge type="blue-ribbon" />
          <Badge type="tv" />
        </Row>
        <Sub title="Badges — Wine" />
        <Row>
          <Badge type="wine-class" />
          <Badge type="vivino" />
          <Badge type="wine-spectator" />
        </Row>
      </Section>

      {/* ── 12. States ── */}
      <Section title="12. States">
        <Sub title="Empty" />
        <NyamCard>
          <EmptyState icon={Wine} title="아직 등록한 와인이 없어요" description="위 버튼으로 와인을 추가해보세요" />
        </NyamCard>
        <Sub title="Loading" />
        <NyamCard>
          <LoadingState message="와인을 찾고 있어요..." />
        </NyamCard>
        <Sub title="Toast" />
        <button type="button" className="btn-primary" onClick={() => setToastVisible(true)}>토스트 보기</button>
        <Toast message="이미 등록한 와인이에요" visible={toastVisible} onHide={() => setToastVisible(false)} />
      </Section>

      {/* ── 13. Spacing & Radius ── */}
      <Section title="13. Spacing & Radius">
        <Sub title="Radius" />
        <Row>
          {[
            { val: '6px', token: '--r-xs' },
            { val: '8px', token: '--r-sm' },
            { val: '12px', token: '--r-md' },
            { val: '16px', token: '--r-lg' },
            { val: '20px', token: '--r-xl' },
            { val: '50px', token: '--r-full' },
          ].map(({ val, token }) => (
            <div key={token} style={{ textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', background: 'var(--accent-food-light)', border: '2px solid var(--accent-food-dim)', borderRadius: val }} />
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-sub)', marginTop: '4px' }}>{val}</div>
            </div>
          ))}
        </Row>
      </Section>

      {/* ── 14. Shadows ── */}
      <Section title="14. Shadows">
        <Row>
          {[
            { name: '--shadow-sm', desc: '거의 사용 안 함' },
            { name: '--shadow-md', desc: '필요시 카드' },
            { name: '--shadow-lg', desc: '토스트' },
            { name: '--shadow-sheet', desc: '바텀시트 (위로 그림자)' },
          ].map(({ name, desc }) => (
            <div key={name} style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '48px', background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', boxShadow: `var(${name})` }} />
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-sub)', marginTop: '6px' }}>{name}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-hint)' }}>{desc}</div>
            </div>
          ))}
        </Row>
        <Note>카드는 기본적으로 shadow 없이 border만 사용. 그림자는 절제 — 시트/토스트 전용.</Note>
      </Section>

      {/* ── 14-C. View Cycle Button ── */}
      <Section title="14-C. View Cycle Button">
        <Row>
          <ViewCycleButton icon={LayoutGrid} active />
          <ViewCycleButton icon={List} />
        </Row>
        <Note>탭 헤더 우측에 위치. 클릭 시 보기 모드 순환 (상세 → 컴팩트 → 캘린더)</Note>
      </Section>

      {/* ── 15. Form Controls ── */}
      <Section title="15. Form Controls">
        <Sub title="Toggle" />
        <Row>
          <NyamToggle on={toggleOn} onChange={setToggleOn} />
          <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{toggleOn ? 'ON' : 'OFF'}</span>
        </Row>
        <Sub title="Segment Control" />
        <div style={{ maxWidth: '300px' }}>
          <Segment
            options={[
              { value: 'public', label: '공개' },
              { value: 'bubble_only', label: '버블만' },
              { value: 'private', label: '비공개' },
            ]}
            value={segmentVal}
            onChange={setSegmentVal}
          />
        </div>
      </Section>

      {/* ── 16. Navigation Components ── */}
      <Section title="16. Global Navigation Components">
        <Sub title="App Header (모든 페이지 공통)" />
        <Note>상단 고정. glassmorphism 항상 적용. 아래 데모를 스크롤하여 확인.</Note>

        {/* 디바이스 프레임 — Main Header */}
        <div style={{
          width: '375px', height: '320px', borderRadius: '20px', overflow: 'hidden',
          border: '1px solid var(--border)', background: 'var(--bg)', position: 'relative', marginTop: '12px',
        }}>
          {/* Status bar */}
          <div style={{
            position: 'sticky', top: 0, zIndex: 91,
            padding: '8px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '14px', fontWeight: 600, color: 'var(--text)',
            background: 'rgba(248,246,243,0.55)', backdropFilter: 'blur(20px) saturate(1.5)',
          }}>
            <span>9:41</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <svg width="16" height="12" viewBox="0 0 16 12"><path d="M1 8h2v4H1zM5 5h2v7H5zM9 2h2v10H9zM13 0h2v12h-2z" fill="var(--text)" opacity="0.5" /></svg>
              <svg width="22" height="12" viewBox="0 0 22 12"><rect x="0" y="0" width="20" height="12" rx="2" stroke="var(--text)" strokeWidth="1" fill="none" opacity="0.4" /><rect x="1.5" y="1.5" width="14" height="9" rx="1" fill="var(--text)" opacity="0.4" /><rect x="21" y="3.5" width="2" height="5" rx="1" fill="var(--text)" opacity="0.3" /></svg>
            </div>
          </div>
          {/* App header */}
          <div className="top-fixed app-header" style={{ position: 'sticky', borderRadius: 0 }}>
            <h1 className="header-brand">nyam</h1>
            <div className="header-right">
              <button type="button" className="header-bubbles">bubbles</button>
              <div className="icon-btn"><Bell size={20} /><div className="notif-badge" /></div>
              <div className="header-avatar"><span>J</span></div>
            </div>
          </div>
          {/* 스크롤 콘텐츠 */}
          <div style={{ height: '240px', overflowY: 'auto', padding: '8px 16px' }}>
            <div style={{ padding: '14px', borderRadius: 'var(--r-md)', background: 'var(--accent-food-light)', marginBottom: '8px', fontSize: '13px', color: 'var(--text-sub)' }}>AI 인사말 영역</div>
            {['식당 카드 1', '식당 카드 2', '식당 카드 3', '식당 카드 4', '식당 카드 5', '와인 카드 1', '와인 카드 2'].map((label) => (
              <div key={label} style={{ padding: '14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', marginBottom: '8px', fontSize: '13px', color: 'var(--text-sub)' }}>{label}</div>
            ))}
          </div>
        </div>

        <Sub title="내부 페이지 헤더 (Sub-page Header)" />
        <Note>로고 자리에 쉐브론 + 이전 페이지명을 표시. 우측은 기본 헤더와 동일.</Note>

        {/* 디바이스 프레임 — Inner Header */}
        <div style={{
          width: '375px', height: '320px', borderRadius: '20px', overflow: 'hidden',
          border: '1px solid var(--border)', background: 'var(--bg)', position: 'relative', marginTop: '12px',
        }}>
          <div style={{
            position: 'sticky', top: 0, zIndex: 91,
            padding: '8px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '14px', fontWeight: 600, color: 'var(--text)',
            background: 'rgba(248,246,243,0.55)', backdropFilter: 'blur(20px) saturate(1.5)',
          }}>
            <span>9:41</span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <svg width="16" height="12" viewBox="0 0 16 12"><path d="M1 8h2v4H1zM5 5h2v7H5zM9 2h2v10H9zM13 0h2v12h-2z" fill="var(--text)" opacity="0.5" /></svg>
              <svg width="22" height="12" viewBox="0 0 22 12"><rect x="0" y="0" width="20" height="12" rx="2" stroke="var(--text)" strokeWidth="1" fill="none" opacity="0.4" /><rect x="1.5" y="1.5" width="14" height="9" rx="1" fill="var(--text)" opacity="0.4" /><rect x="21" y="3.5" width="2" height="5" rx="1" fill="var(--text)" opacity="0.3" /></svg>
            </div>
          </div>
          <div className="top-fixed app-header" style={{ position: 'sticky', borderRadius: 0 }}>
            <button type="button" className="inner-back-btn">
              <ChevronLeft />
              <span>버블</span>
            </button>
            <div className="header-right">
              <button type="button" className="header-bubbles">bubbles</button>
              <div className="icon-btn"><Bell size={20} /></div>
              <div className="header-avatar"><span>J</span></div>
            </div>
          </div>
          <div style={{ height: '240px', overflowY: 'auto', padding: '8px 16px' }}>
            {['버블 상세 콘텐츠', '피드 카드 1', '피드 카드 2', '피드 카드 3', '피드 카드 4'].map((label) => (
              <div key={label} style={{ padding: '14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', marginBottom: '8px', fontSize: '13px', color: 'var(--text-sub)' }}>{label}</div>
            ))}
          </div>
        </div>

        {/* 깊이별 예시 */}
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-hint)', margin: '24px 0 8px' }}>깊이별 예시</h4>
        <p style={{ fontSize: '11px', color: 'var(--text-hint)', marginBottom: '12px' }}>내부 페이지 헤더는 항상 직전 페이지명만 표시 (최상위 페이지명 아님)</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { back: '프로필', desc: '프로필 → 공유' },
            { back: '버블', desc: '버블 → 상세' },
            { back: '직장 맛집', desc: '상세 → 설정 (depth 2)' },
            { back: '홈', desc: '홈 → 식당 상세' },
            { back: '프로필', desc: '프로필 → 설정' },
          ].map(({ back, desc }) => (
            <div key={desc} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="top-fixed app-header" style={{
                position: 'relative', borderRadius: 'var(--r-sm)', flex: 1,
                padding: '6px 12px 6px',
              }}>
                <button type="button" className="inner-back-btn">
                  <ChevronLeft />
                  <span>{back}</span>
                </button>
                <div className="header-right">
                  <button type="button" className="header-bubbles">bubbles</button>
                  <div className="icon-btn" style={{ width: '24px', height: '24px' }}><Bell size={16} /></div>
                  <div className="header-avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}><span>J</span></div>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-hint)', whiteSpace: 'nowrap', minWidth: '120px' }}>{desc}</span>
            </div>
          ))}
        </div>

        <Sub title="Floating Back Button" />
        <div style={{ position: 'relative', height: '60px' }}>
          <button type="button" className="fab-back" style={{ position: 'relative', bottom: 'auto', left: 'auto' }}>
            <ChevronLeft size={22} />
          </button>
        </div>

        <Sub title="Floating Forward Button" />
        <Row>
          <button type="button" className="fab-forward" style={{ position: 'relative', bottom: 'auto', right: 'auto' }}>
            <ChevronRight size={22} />
          </button>
          <button type="button" className="fab-forward wine" style={{ position: 'relative', bottom: 'auto', right: 'auto' }}>
            <ChevronRight size={22} />
          </button>
        </Row>

        <Sub title="Floating Add Button" />
        <Row>
          <button type="button" className="fab-add" style={{ position: 'relative', bottom: 'auto', right: 'auto' }}>
            <Plus size={22} />
          </button>
        </Row>
      </Section>

      {/* ── 17. Compact List (CompactListItem) ── */}
      <Section title="17. Compact List">
        <CompactListItem rank={1} name="스시 오마카세" meta="일식 · 강남 · 혼밥" score={92} variant="food" />
        <CompactListItem rank={2} name="라 트라토리아" meta="이탈리안 · 이태원" score={88} variant="food" />
        <CompactListItem rank={3} name="차이나 팰리스" meta="중식 · 종로" score={85} variant="food" />
        <CompactListItem rank={4} name="미평가 식당" meta="한식 · 합정" score={null} variant="food" />
      </Section>

      {/* ── 18. Step Progress ── */}
      <Section title="18. Step Progress">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <StepProgress current={0} total={5} />
          <StepProgress current={2} total={5} />
          <StepProgress current={4} total={5} />
        </div>
      </Section>

      {/* ── 19. Avatar Menu ── */}
      <Section title="19. Avatar & Notification">
        <Sub title="Avatar + Dropdown" />
        <Row>
          <div style={{ position: 'relative' }}>
            <div className="header-avatar"><span>J</span></div>
            <div className="avatar-menu" style={{ position: 'relative', top: '8px' }}>
              <button type="button" className="avatar-menu-item"><User size={16} /> 프로필</button>
              <button type="button" className="avatar-menu-item"><Settings size={16} /> 설정</button>
            </div>
          </div>
        </Row>
        <Sub title="Notification Bell" />
        <Row>
          <div className="icon-btn"><Bell size={20} /><div className="notif-badge" /></div>
          <div className="icon-btn"><Bell size={20} /></div>
        </Row>
      </Section>

      {/* ── §20. Rating Input ── */}
      <Section title="20. Rating Input">
        <Sub title="Restaurant Rating — 사분면 + 바 게이지 + 가격대" />
        <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '16px', lineHeight: 1.6 }}>
          Nyam 핵심 평가 컴포넌트. X축(음식 퀄리티) + Y축(경험 가치) 사분면과<br />
          개별 바 게이지, 총점 표시, 가격대 3단계로 구성.<br />
          사분면 터치 또는 바 게이지 드래그로 점수 설정.
        </p>
        <RatingInput
          type="restaurant"
          value={ratingValue}
          onChange={setRatingValue}
          showHint={ratingHint}
        />
        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setRatingHint(!ratingHint)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
              backgroundColor: ratingHint ? 'var(--accent-food)' : 'var(--bg)',
              color: ratingHint ? '#FFFFFF' : 'var(--text-sub)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {ratingHint ? '힌트 끄기' : '힌트 말풍선 보기'}
          </button>
          <button
            type="button"
            onClick={() => setRatingValue({ x: 50, y: 50 })}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg)',
              color: 'var(--text-sub)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            초기화
          </button>
        </div>
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-hint)' }}>
          현재 값: 음식 퀄리티 {ratingValue.x} · 경험 가치 {ratingValue.y} · 총점 {Math.round((ratingValue.x + ratingValue.y) / 2)}
        </div>

        <div style={{ marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
          <Sub title="Wine Rating — 사분면 + 바 게이지" />
          <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '16px', lineHeight: 1.6 }}>
            X축: 구조 · 완성도 — "이 와인은 객관적으로 얼마나 잘 만들어졌나?"<br />
            Y축: 즐거움 · 감성 — "내가 실제로 마시면서 얼마나 만족했나 (가격 포함)"<br />
            가격대 없음 (와인은 별도 구매가격 입력).
          </p>
          <RatingInput
            type="wine"
            value={wineRatingValue}
            onChange={setWineRatingValue}
            showHint={wineRatingHint}
          />
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setWineRatingHint(!wineRatingHint)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)',
                backgroundColor: wineRatingHint ? 'var(--accent-wine)' : 'var(--bg)',
                color: wineRatingHint ? '#FFFFFF' : 'var(--text-sub)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {wineRatingHint ? '힌트 끄기' : '힌트 말풍선 보기'}
            </button>
            <button
              type="button"
              onClick={() => setWineRatingValue({ x: 50, y: 50 })}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text-sub)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              초기화
            </button>
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-hint)' }}>
            현재 값: 구조·완성도 {wineRatingValue.x} · 즐거움·감성 {wineRatingValue.y} · 총점 {Math.round((wineRatingValue.x + wineRatingValue.y) / 2)}
          </div>
        </div>
      </Section>

      {/* ── §21. Record Save Bar ── */}
      <Section title="21. Record Save Bar">
        <p style={{ fontSize: '13px', color: 'var(--text-sub)', marginBottom: '16px', lineHeight: 1.6 }}>
          기록 완료 버튼. sticky bottom으로 하단 고정, z-index: 20으로<br />
          사분면·바 게이지 등 다른 요소 위에 항상 표시.
        </p>
        <Sub title="Food — Active" />
        <div style={{ position: 'relative', height: '72px' }}>
          <RecordSaveBar variant="food" onSave={() => {}} isLoading={false} label="기록 완료" />
        </div>
        <Sub title="Food — Disabled" />
        <div style={{ position: 'relative', height: '72px' }}>
          <RecordSaveBar variant="food" onSave={() => {}} isLoading={false} disabled label="기록 완료" />
        </div>
        <Sub title="Wine — Active" />
        <div style={{ position: 'relative', height: '72px' }}>
          <RecordSaveBar variant="wine" onSave={() => {}} isLoading={false} label="기록 완료" />
        </div>
        <Sub title="Food — Loading" />
        <div style={{ position: 'relative', height: '72px' }}>
          <RecordSaveBar variant="food" onSave={() => {}} isLoading label="기록 완료" />
        </div>
        <Sub title="Food — With Delete (Edit Mode)" />
        <div style={{ position: 'relative', height: '72px' }}>
          <RecordSaveBar variant="food" onSave={() => {}} isLoading={false} label="수정 완료" onDelete={() => {}} />
        </div>
      </Section>

      {/* ── 22. Popup Window ── */}
      <PopupWindowDemo />
    </div>
  )
}

/* ── 22. PopupWindow 데모 ── */
function PopupWindowDemo() {
  const [photoOpen, setPhotoOpen] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const bellRef = useState<HTMLButtonElement | null>(null)

  const demoPhotos = [
    'https://gfshmpuuafjvwsgrxnie.supabase.co/storage/v1/object/public/record-photos/2ec28e73-c6b1-4652-a9c6-bf97ebb81493/9c8da8e1-b430-4cc2-935f-7dc4f980cfe6/aeba3471-3964-4c17-a5a3-5ed1608f5a40.webp',
    'https://gfshmpuuafjvwsgrxnie.supabase.co/storage/v1/object/public/record-photos/2ec28e73-c6b1-4652-a9c6-bf97ebb81493/7432d80b-192d-42c5-9492-8cd37b080af3/0554a615-854b-4857-9d46-84b60e296adc.webp',
  ]

  return (
    <>
      <Section title="22. Popup Window">
        <Note>
          공통 팝업 로직: 배경 어둡게(0.7) + blur(4px) + 외부 클릭 시 닫힘 + Escape 닫힘.
          Portal로 body에 렌더링되어 부모 stacking context에 영향 없음.
        </Note>

        <Sub title="22-A. Photo Popup" />
        <Note>
          중앙 정렬. 화면 대비 크게 표시 (max 90vw / 500px, 70vh).
          사진 클릭 시 다음 사진 순환. 배경 클릭 시 닫힘.
          사용처: hero-carousel, record-timeline 사진 썸네일.
        </Note>
        <button
          type="button"
          onClick={() => { setPhotoIndex(0); setPhotoOpen(true) }}
          className="rounded-lg px-4 py-2 text-[13px] font-medium"
          style={{ backgroundColor: `var(--accent-food)`, color: '#FFF' }}
        >
          사진 팝업 열기 (2장 순환)
        </button>

        <div style={{ height: '16px' }} />

        <Sub title="22-B. Notification Popup" />
        <Note>
          bell 아이콘 기준 상대 위치 (아이콘 하단 + 우측 정렬).
          팝업 자체는 fixed로 position 전달받음.
          사용처: app-header 알림 드롭다운.
        </Note>
        <div className="relative inline-block">
          <button
            type="button"
            ref={(el) => { bellRef[1](el) }}
            onClick={() => setNotifOpen(!notifOpen)}
            className="icon-btn"
          >
            <Bell size={22} />
          </button>
        </div>
      </Section>

      {/* 사진 팝업 */}
      <PopupWindow isOpen={photoOpen} onClose={() => setPhotoOpen(false)}>
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 200, pointerEvents: 'none' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={demoPhotos[photoIndex]}
            alt=""
            onClick={() => setPhotoIndex((prev) => (prev + 1) % demoPhotos.length)}
            className="rounded-2xl shadow-lg"
            style={{ maxWidth: 'min(90vw, 500px)', maxHeight: '70vh', objectFit: 'contain', cursor: 'pointer', pointerEvents: 'auto' }}
            draggable={false}
          />
        </div>
      </PopupWindow>

      {/* 노티 팝업 */}
      <PopupWindow isOpen={notifOpen} onClose={() => setNotifOpen(false)}>
        <div
          className="notif-dropdown"
          style={{
            position: 'fixed',
            top: bellRef[0] ? bellRef[0].getBoundingClientRect().bottom + 8 : 100,
            right: bellRef[0] ? window.innerWidth - bellRef[0].getBoundingClientRect().right : 16,
          }}
        >
          <div className="notif-header" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="notif-header-title">알림</span>
          </div>
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <Bell size={32} style={{ color: 'var(--text-hint)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-hint)' }}>데모 알림 팝업</p>
          </div>
          <div className="notif-footer" style={{ borderTop: '1px solid var(--border)' }}>
            <button type="button" onClick={() => setNotifOpen(false)} className="notif-footer">
              닫기
            </button>
          </div>
        </div>
      </PopupWindow>
    </>
  )
}
