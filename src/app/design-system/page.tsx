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
import { FilterChip } from '@/presentation/components/ui/filter-chip'
import { FilterTab } from '@/presentation/components/ui/filter-tab'
import { Toast } from '@/presentation/components/ui/toast'
import { EmptyState } from '@/presentation/components/ui/empty-state'
import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'
import { IconButton } from '@/presentation/components/ui/icon-button'
import { StepProgress } from '@/presentation/components/ui/step-progress'
import { NyamToggle } from '@/presentation/components/ui/nyam-toggle'
import { Segment } from '@/presentation/components/ui/segment'
import { NyamSelect } from '@/presentation/components/ui/nyam-select'

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
  const [activeTab, setActiveTab] = useState<'food' | 'wine'>('food')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [filterActive, setFilterActive] = useState(false)
  const [sortActive, setSortActive] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

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
        <Sub title="Satisfaction Gauge" />
        <Row>
          <Swatch color="var(--gauge-1)" name="0~20" hex="#C4B5A8" />
          <Swatch color="var(--gauge-2)" name="21~40" hex="#B0ADA4" />
          <Swatch color="var(--gauge-3)" name="41~60" hex="#9FA5A3" />
          <Swatch color="var(--gauge-4)" name="61~80" hex="#889DAB" />
          <Swatch color="var(--gauge-5)" name="81~100" hex="#7A9BAE" />
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
        <Row>
          <button type="button" className="btn-card-action" style={{ flex: 1, padding: '10px 0' }}>가봤음</button>
          <button type="button" className="btn-card-action" style={{ flex: 1, padding: '10px 0' }}>가보고싶음</button>
        </Row>
        <Row>
          <button type="button" className="btn-card-action active-food" style={{ flex: 1, padding: '10px 0' }}>가봤음</button>
          <button type="button" className="btn-card-action" style={{ flex: 1, padding: '10px 0' }}>가보고싶음</button>
        </Row>
        <Row>
          <button type="button" className="btn-card-action active-wine" style={{ flex: 1, padding: '10px 0' }}>맞아요</button>
          <button type="button" className="btn-card-action" style={{ flex: 1, padding: '10px 0' }}>다른 와인이에요</button>
        </Row>

        <Sub title="Search Actions" />
        <Row>
          <button type="button" className="btn-ghost">사진으로 찾기</button>
          <button type="button" className="btn-ghost">이름으로 검색</button>
          <button type="button" className="btn-search-submit">찾기</button>
        </Row>

        <Sub title="Social Login" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '340px' }}>
          <button type="button" className="btn-social kakao">카카오로 시작</button>
          <button type="button" className="btn-social google">Google로 시작</button>
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
            <button type="button" className="btn-card-action" style={{ flex: 1, padding: '10px 0' }}>가봤음</button>
            <button type="button" className="btn-card-action" style={{ flex: 1, padding: '10px 0' }}>가보고싶음</button>
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
              <div className="satisfaction-gauge-fill" style={{ width: '78%', backgroundColor: 'var(--gauge-4)' }} />
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
              <div className="satisfaction-gauge-fill" style={{ width: '75%', backgroundColor: 'var(--gauge-4)' }} />
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
              { max: 20, color: 'var(--gauge-1)' },
              { max: 40, color: 'var(--gauge-2)' },
              { max: 60, color: 'var(--gauge-3)' },
              { max: 80, color: 'var(--gauge-4)' },
              { max: 100, color: 'var(--gauge-5)' },
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

      {/* ── 7. Filter Tabs ── */}
      <Section title="7. Filter Tabs">
        <Sub title="Restaurant Context" />
        <Row>
          <FilterTab active variant="food">전체</FilterTab>
          <FilterTab variant="food">광화문</FilterTab>
          <FilterTab variant="food">을지로</FilterTab>
          <FilterTab variant="food">강남</FilterTab>
        </Row>
        <Sub title="Wine Context" />
        <Row>
          <FilterTab active variant="wine">전체</FilterTab>
          <FilterTab variant="wine">레드</FilterTab>
          <FilterTab variant="wine">화이트</FilterTab>
          <FilterTab variant="wine">스파클링</FilterTab>
        </Row>
      </Section>

      {/* ── 7-B. Filter / Sort System ── */}
      <Section title="7-B. Filter / Sort System">
        <Row>
          <IconButton icon={SlidersHorizontal} active={filterActive} onClick={() => setFilterActive(!filterActive)} />
          <IconButton icon={ArrowUpDown} active={sortActive} onClick={() => setSortActive(!sortActive)} />
          <IconButton icon={Search} />
        </Row>
        <div style={{ display: 'flex', gap: '6px', marginTop: '12px', overflow: 'auto' }}>
          <FilterChip active={activeChip === 'all'} onClick={() => setActiveChip('all')}>광화문 맛집</FilterChip>
          <FilterChip active={activeChip === 'solo'} onClick={() => setActiveChip('solo')}>혼밥 85+</FilterChip>
        </div>
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

        <Sub title="Text Input" />
        <input type="text" className="nyam-input" placeholder="와인 이름 검색..." style={{ maxWidth: '340px' }} />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', maxWidth: '340px' }}>
          <input type="text" className="nyam-input" placeholder="와인 이름 검색..." style={{ flex: 1 }} />
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
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="intro-card selected" style={{ flex: 1, padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--r-md)', background: 'var(--accent-food-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Utensils size={20} style={{ color: 'var(--accent-food)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>맛집 기록</div>
              <div style={{ fontSize: '11px', color: 'var(--text-hint)' }}>가본 식당에 점수를 매기고 찜하기</div>
            </div>
            <div className="intro-card-check" style={{ background: 'var(--accent-food)', color: '#fff' }}>
              <Check size={14} />
            </div>
          </div>
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
        <div className="top-fixed app-header" style={{ position: 'relative', borderRadius: 'var(--r-md)' }}>
          <h1 className="header-brand">nyam</h1>
          <div className="header-right">
            <button type="button" className="header-bubbles">bubbles</button>
            <div className="icon-btn"><Bell size={20} /><div className="notif-badge" /></div>
            <div className="header-avatar"><span>J</span></div>
          </div>
        </div>

        <Sub title="Inner Page Header" />
        <div className="top-fixed app-header" style={{ position: 'relative', borderRadius: 'var(--r-md)', marginTop: '12px' }}>
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

      {/* ── 17. Compact List ── */}
      <Section title="17. Compact List">
        {[
          { rank: 1, name: '스시 오마카세', meta: '일식 · 강남 · 혼밥', score: 92 },
          { rank: 2, name: '라 트라토리아', meta: '이탈리안 · 이태원', score: 88 },
          { rank: 3, name: '차이나 팰리스', meta: '중식 · 종로', score: 85 },
          { rank: 4, name: '미평가 식당', meta: '한식 · 합정', score: null },
        ].map((item) => (
          <div key={item.rank} className="compact-item">
            <span className={`compact-rank ${item.rank <= 3 ? 'top' : ''}`}>{item.rank}</span>
            <div className="compact-thumb" style={{ background: 'linear-gradient(135deg, var(--accent-food-light), var(--accent-food-dim))' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="compact-name">{item.name}</p>
              <p className="compact-meta">{item.meta}</p>
            </div>
            <span className={`compact-score ${item.score ? 'food' : 'unrated'}`}>
              {item.score ?? '—'}
            </span>
          </div>
        ))}
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
    </div>
  )
}
