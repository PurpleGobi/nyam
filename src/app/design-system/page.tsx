'use client'

import { useState } from 'react'
import {
  Bell, Search, SlidersHorizontal, ArrowUpDown, Heart,
  Utensils, Wine, MapPin, Camera, Share2, Plus, Settings,
  Trophy, ChevronLeft, ChevronRight, X, Check, Star,
} from 'lucide-react'

/* ── 기본 UI 컴포넌트 (새로 생성) ── */
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

/* ── 복합 컴포넌트 (기존) ── */
import { FabBack } from '@/presentation/components/layout/fab-back'
import { FabAdd } from '@/presentation/components/layout/fab-add'
import { FabForward } from '@/presentation/components/layout/fab-forward'

/* ── 섹션 래퍼 ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-6" style={{ borderBottom: '1px solid var(--border)' }}>
      <h2 className="mb-4 px-4" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
      <div className="px-4">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1.5" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-hint)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
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

  return (
    <div style={{ maxWidth: '420px', margin: '0 auto', backgroundColor: 'var(--bg)', minHeight: '100dvh' }}>
      {/* 헤더 */}
      <div className="top-fixed app-header">
        <h1 className="header-brand">nyam</h1>
        <div className="header-right">
          <button type="button" className="header-bubbles">bubbles</button>
          <button type="button" className="icon-btn"><Bell size={20} /></button>
          <div className="header-avatar"><span>D</span></div>
        </div>
      </div>

      <div style={{ paddingTop: '8px', paddingBottom: '200px' }}>
        {/* ── 0. 브랜드 & 컬러 ── */}
        <Section title="0. Brand & Colors">
          <Row label="Logo">
            <span className="header-brand" style={{ fontSize: '42px' }}>nyam</span>
            <span className="header-brand" style={{ fontSize: '22px' }}>nyam</span>
          </Row>
          <Row label="Surface">
            {[
              { label: '--bg', var: 'var(--bg)' },
              { label: '--bg-card', var: 'var(--bg-card)' },
              { label: '--bg-elevated', var: 'var(--bg-elevated)' },
              { label: '--bg-page', var: 'var(--bg-page)' },
            ].map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-1">
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: c.var, border: '1px solid var(--border)' }} />
                <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>{c.label}</span>
              </div>
            ))}
          </Row>
          <Row label="Accent">
            {[
              { label: 'food', var: 'var(--accent-food)' },
              { label: 'wine', var: 'var(--accent-wine)' },
              { label: 'social', var: 'var(--accent-social)' },
              { label: 'brand', var: 'var(--brand)' },
            ].map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-1">
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: c.var }} />
                <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>{c.label}</span>
              </div>
            ))}
          </Row>
          <Row label="Semantic">
            {[
              { label: 'positive', var: 'var(--positive)' },
              { label: 'caution', var: 'var(--caution)' },
              { label: 'negative', var: 'var(--negative)' },
            ].map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-1">
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: c.var }} />
                <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>{c.label}</span>
              </div>
            ))}
          </Row>
          <Row label="Gauge (5-level)">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex flex-col items-center gap-1">
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: `var(--gauge-${n})` }} />
                <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>gauge-{n}</span>
              </div>
            ))}
          </Row>
        </Section>

        {/* ── 1. 타이포그래피 ── */}
        <Section title="1. Typography">
          <div className="flex flex-col gap-2">
            <p className="text-display">Display 36px 800</p>
            <p className="text-h1">H1 22px 700</p>
            <p className="text-h2">H2 17px 600</p>
            <p className="text-body">Body 15px 400 — 본문 텍스트</p>
            <p className="text-sub" style={{ color: 'var(--text-sub)' }}>Sub 13px 400 — 보조 텍스트</p>
            <p className="text-caption" style={{ color: 'var(--text-hint)' }}>Caption 11px 400 — 힌트, 날짜</p>
          </div>
        </Section>

        {/* ── 2. 아이콘 ── */}
        <Section title="2. Icons (Lucide)">
          <div className="flex flex-wrap gap-3">
            {[
              { icon: Utensils, label: 'utensils', color: 'var(--accent-food)' },
              { icon: Wine, label: 'wine', color: 'var(--accent-wine)' },
              { icon: Camera, label: 'camera', color: 'var(--text-sub)' },
              { icon: Search, label: 'search', color: 'var(--text-sub)' },
              { icon: Heart, label: 'heart', color: 'var(--caution)' },
              { icon: Star, label: 'star', color: 'var(--caution)' },
              { icon: ChevronLeft, label: 'back', color: 'var(--text)' },
              { icon: ChevronRight, label: 'forward', color: 'var(--text)' },
              { icon: X, label: 'close', color: 'var(--text-hint)' },
              { icon: Plus, label: 'add', color: 'var(--text)' },
              { icon: Check, label: 'check', color: 'var(--positive)' },
              { icon: MapPin, label: 'map-pin', color: 'var(--accent-food)' },
              { icon: Share2, label: 'share', color: 'var(--text-sub)' },
              { icon: Bell, label: 'bell', color: 'var(--text-sub)' },
              { icon: Settings, label: 'settings', color: 'var(--text-sub)' },
              { icon: Trophy, label: 'trophy', color: 'var(--caution)' },
            ].map(({ icon: Ic, label, color }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <Ic size={24} style={{ color }} />
                <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 3. 버튼 ── */}
        <Section title="3. Buttons">
          <Row label="Primary CTA">
            <button type="button" className="btn-primary">다음</button>
            <button type="button" className="btn-primary wine">다음 (와인)</button>
            <button type="button" className="btn-primary" disabled>비활성</button>
          </Row>
          <Row label="Ghost / Skip">
            <button type="button" className="btn-ghost"><ChevronLeft size={16} /> 돌아가기</button>
            <button type="button" className="btn-skip">건너뛰기</button>
          </Row>
          <Row label="Card Action">
            <button type="button" className="btn-card-action">가봤어요</button>
            <button type="button" className="btn-card-action active-food">가봤어요</button>
            <button type="button" className="btn-card-action active-wine">매칭</button>
            <button type="button" className="btn-card-action active-wish">찜</button>
          </Row>
          <Row label="Social Login">
            <div className="flex w-full flex-col gap-2">
              <button type="button" className="btn-social kakao">카카오로 시작</button>
              <button type="button" className="btn-social google">Google로 시작</button>
              <button type="button" className="btn-social naver">네이버로 시작</button>
              <button type="button" className="btn-social apple">Apple로 시작</button>
            </div>
          </Row>
        </Section>

        {/* ── 4. 태그 / 뱃지 / 칩 ── */}
        <Section title="4. Tags / Badges / Chips">
          <Row label="Tag">
            <Tag>기본 태그</Tag>
            <Tag variant="food">한식</Tag>
            <Tag variant="wine">레드와인</Tag>
          </Row>
          <Row label="Scene Tag">
            <SceneTag scene="solo" />
            <SceneTag scene="romantic" />
            <SceneTag scene="friends" />
            <SceneTag scene="family" />
            <SceneTag scene="business" />
            <SceneTag scene="drinks" />
          </Row>
          <Row label="Scene Tag — Chip variant">
            <SceneTag scene="solo" chip />
            <SceneTag scene="romantic" chip />
            <SceneTag scene="friends" chip />
          </Row>
          <Row label="Wine Chip">
            <WineChip type="red" />
            <WineChip type="white" />
            <WineChip type="rose" />
            <WineChip type="orange" />
            <WineChip type="sparkling" />
            <WineChip type="fortified" />
            <WineChip type="dessert" />
          </Row>
          <Row label="Badge — Restaurant">
            <Badge type="michelin" />
            <Badge type="blue-ribbon" />
            <Badge type="tv" />
          </Row>
          <Row label="Badge — Wine">
            <Badge type="wine-class" />
            <Badge type="vivino" />
            <Badge type="wine-spectator" />
          </Row>
        </Section>

        {/* ── 5. 카드 ── */}
        <Section title="5. Card">
          <div className="flex flex-col gap-3">
            <NyamCard>
              <div className="p-4">
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>기본 카드</p>
                <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>--bg-card + --border</p>
              </div>
            </NyamCard>
            <NyamCard state="visited">
              <div className="p-4">
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>방문한 식당</p>
                <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>--accent-food-light</p>
              </div>
            </NyamCard>
            <NyamCard state="confirmed">
              <div className="p-4">
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>확인된 와인</p>
                <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>--accent-wine-light</p>
              </div>
            </NyamCard>
            <NyamCard state="wishlisted">
              <div className="p-4">
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>찜한 곳</p>
                <p style={{ fontSize: '13px', color: 'var(--text-sub)' }}>--caution border</p>
              </div>
            </NyamCard>
          </div>
        </Section>

        {/* ── 6. 만족도 게이지 ── */}
        <Section title="6. Satisfaction Gauge">
          <div className="flex flex-col gap-3">
            {[15, 35, 55, 75, 95].map((score) => {
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
                  <div className="satisfaction-gauge">
                    <div className="satisfaction-gauge-fill" style={{ width: `${score}%`, backgroundColor: color }} />
                    <div className="satisfaction-gauge-label">{score}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* ── 7. 필터 시스템 ── */}
        <Section title="7. Filter System">
          <Row label="Filter Tab">
            <FilterTab active={activeTab === 'food'} variant="food" onClick={() => setActiveTab('food')}>식당</FilterTab>
            <FilterTab active={activeTab === 'wine'} variant="wine" onClick={() => setActiveTab('wine')}>와인</FilterTab>
          </Row>
          <Row label="Icon Buttons">
            <IconButton icon={SlidersHorizontal} active={filterActive} onClick={() => setFilterActive(!filterActive)} />
            <IconButton icon={ArrowUpDown} active={sortActive} onClick={() => setSortActive(!sortActive)} />
            <IconButton icon={Search} />
          </Row>
          <Row label="Filter Chip">
            <div className="flex gap-2 overflow-x-auto">
              {['전체', '한식', '일식', '양식', '중식'].map((label) => (
                <FilterChip key={label} active={activeChip === label} onClick={() => setActiveChip(label)}>{label}</FilterChip>
              ))}
            </div>
          </Row>
        </Section>

        {/* ── 8. 드롭다운 셀렉트 ── */}
        <Section title="8. Dropdown Select">
          <Row label="NyamSelect">
            <div style={{ width: '200px' }}>
              <NyamSelect
                options={[
                  { value: 'latest', label: '최신순' },
                  { value: 'score_high', label: '점수 높은순' },
                  { value: 'score_low', label: '점수 낮은순' },
                  { value: 'name', label: '이름순' },
                ]}
                value={selectVal}
                onChange={setSelectVal}
              />
            </div>
          </Row>
        </Section>

        {/* ── 9. 컴팩트 리스트 ── */}
        <Section title="9. Compact List">
          <div>
            {[
              { rank: 1, name: '스시 오마카세', meta: '일식 · 강남 · 혼밥', score: 92, type: 'food' as const },
              { rank: 2, name: '라 트라토리아', meta: '이탈리안 · 이태원', score: 88, type: 'food' as const },
              { rank: 3, name: '차이나 팰리스', meta: '중식 · 종로', score: 85, type: 'food' as const },
              { rank: 4, name: '미평가 식당', meta: '한식 · 합정', score: null, type: 'food' as const },
            ].map((item) => (
              <div key={item.rank} className="compact-item">
                <span className={`compact-rank ${item.rank <= 3 ? 'top' : ''}`}>{item.rank}</span>
                <div className="compact-thumb" style={{ background: 'linear-gradient(135deg, var(--accent-food-light), var(--accent-food-dim))' }} />
                <div className="min-w-0 flex-1">
                  <p className="compact-name">{item.name}</p>
                  <p className="compact-meta">{item.meta}</p>
                </div>
                <span className={`compact-score ${item.score ? item.type : 'unrated'}`}>
                  {item.score ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 10. 폼 컨트롤 ── */}
        <Section title="10. Form Controls">
          <Row label="Toggle">
            <NyamToggle on={toggleOn} onChange={setToggleOn} />
            <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{toggleOn ? 'ON' : 'OFF'}</span>
          </Row>
          <Row label="Segment">
            <Segment
              options={[
                { value: 'public', label: '공개' },
                { value: 'bubble_only', label: '버블만' },
                { value: 'private', label: '비공개' },
              ]}
              value={segmentVal}
              onChange={setSegmentVal}
            />
          </Row>
          <Row label="Input">
            <input type="text" className="nyam-input" placeholder="텍스트 입력..." />
          </Row>
        </Section>

        {/* ── 11. 스텝 프로그레스 ── */}
        <Section title="11. Step Progress">
          <div className="flex flex-col gap-3">
            <StepProgress current={0} total={5} />
            <StepProgress current={2} total={5} />
            <StepProgress current={4} total={5} />
          </div>
        </Section>

        {/* ── 12. FAB ── */}
        <Section title="12. FAB (Floating Action Buttons)">
          <Row label="Static preview (실제는 fixed)">
            <div className="relative flex gap-4" style={{ height: '60px' }}>
              <button type="button" className="fab-back" style={{ position: 'relative', bottom: 'auto', left: 'auto' }}>
                <ChevronLeft size={22} />
              </button>
              <button type="button" className="fab-add" style={{ position: 'relative', bottom: 'auto', right: 'auto' }}>
                <Plus size={22} />
              </button>
              <button type="button" className="fab-forward" style={{ position: 'relative', bottom: 'auto', right: 'auto' }}>
                <ChevronRight size={22} />
              </button>
              <button type="button" className="fab-forward wine" style={{ position: 'relative', bottom: 'auto', right: 'auto' }}>
                <ChevronRight size={22} />
              </button>
            </div>
          </Row>
        </Section>

        {/* ── 13. 헤더 변형 ── */}
        <Section title="13. Header Variants">
          <Row label="Main header">
            <div className="top-fixed app-header w-full" style={{ position: 'relative' }}>
              <h1 className="header-brand">nyam</h1>
              <div className="header-right">
                <button type="button" className="header-bubbles">bubbles</button>
                <div className="icon-btn"><Bell size={20} /><div className="notif-badge" /></div>
                <div className="header-avatar"><span>J</span></div>
              </div>
            </div>
          </Row>
          <Row label="Inner header">
            <div className="top-fixed app-header w-full" style={{ position: 'relative' }}>
              <button type="button" className="inner-back-btn">
                <ChevronLeft />
                <span>식당 상세</span>
              </button>
              <div className="header-right">
                <button type="button" className="header-bubbles">bubbles</button>
                <div className="icon-btn"><Bell size={20} /></div>
                <div className="header-avatar"><span>J</span></div>
              </div>
            </div>
          </Row>
        </Section>

        {/* ── 14. 넛지 ── */}
        <Section title="14. Nudge">
          <div className="nudge-card" style={{ margin: 0 }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--accent-food-light), var(--accent-food-dim))', flexShrink: 0 }} />
            <div className="flex-1">
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>첫 기록을 남겨보세요</p>
              <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>최근 방문한 식당을 기록하면 XP를 받아요</p>
            </div>
          </div>
          <div className="nudge-strip mt-3" style={{ borderRadius: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--accent-food)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={14} color="#fff" />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', flex: 1 }}>레벨 3까지 50XP 남았어요</span>
          </div>
        </Section>

        {/* ── 15. 빈 상태 ── */}
        <Section title="15. Empty State">
          <NyamCard>
            <EmptyState
              icon={Search}
              title="검색 결과가 없어요"
              description="다른 키워드로 검색해 보세요"
            />
          </NyamCard>
        </Section>

        {/* ── 16. 토스트 ── */}
        <Section title="16. Toast">
          <button type="button" className="btn-primary" onClick={() => setToastVisible(true)}>
            토스트 보기
          </button>
          <Toast message="저장되었습니다" visible={toastVisible} onHide={() => setToastVisible(false)} />
        </Section>

        {/* ── 17. 바텀 시트 ── */}
        <Section title="17. Bottom Sheet">
          <button type="button" className="btn-primary" onClick={() => setSheetOpen(true)}>
            바텀 시트 열기
          </button>
          <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)}>
            <div className="p-4">
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>바텀 시트 예시</h3>
              <p className="mt-2" style={{ fontSize: '14px', color: 'var(--text-sub)' }}>
                여기에 내용이 들어갑니다. 드래그 핸들, 오버레이, 애니메이션이 포함됩니다.
              </p>
              <button type="button" className="btn-primary mt-4 w-full" onClick={() => setSheetOpen(false)}>
                확인
              </button>
            </div>
          </BottomSheet>
        </Section>

        {/* ── 18. 아바타 메뉴 ── */}
        <Section title="18. Avatar Menu">
          <Row label="Avatar + Dropdown (static preview)">
            <div className="relative">
              <div className="header-avatar"><span>J</span></div>
              <div className="avatar-menu" style={{ position: 'relative', top: '8px' }}>
                <button type="button" className="avatar-menu-item"><Settings size={16} /> 프로필</button>
                <button type="button" className="avatar-menu-item"><Settings size={16} /> 설정</button>
              </div>
            </div>
          </Row>
        </Section>

        {/* ── 19. 알림 뱃지 ── */}
        <Section title="19. Notification Badge">
          <Row label="Bell with badge">
            <div className="icon-btn">
              <Bell size={20} />
              <div className="notif-badge" />
            </div>
            <div className="icon-btn">
              <Bell size={20} />
            </div>
          </Row>
        </Section>
      </div>
    </div>
  )
}
