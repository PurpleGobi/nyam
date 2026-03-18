"use client"

import { useState } from "react"
import { useTheme } from "@/presentation/providers/theme-provider"
import { Button } from "@/presentation/components/ui/button"
import { Badge } from "@/presentation/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/presentation/components/ui/card"
import { Input } from "@/presentation/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/presentation/components/ui/tabs"
import { Separator } from "@/presentation/components/ui/separator"
import { Skeleton, CardSkeleton, ListSkeleton } from "@/presentation/components/ui/skeleton"
import { SearchBar } from "@/presentation/components/ui/search-bar"
import { SectionHeader } from "@/presentation/components/ui/section-header"
import { EmptyState } from "@/presentation/components/ui/empty-state"
import { Inbox, ChevronRight, Sun, Moon, Monitor } from "lucide-react"

/* ── Color Token Data ── */

const LIGHT_COLORS = {
  Primary: [
    { name: "primary-50", value: "#FFF5F2" },
    { name: "primary-500", value: "#FF6038" },
    { name: "primary-600", value: "#E5452A" },
  ],
  Neutral: [
    { name: "neutral-50", value: "#F7F9FC" },
    { name: "neutral-100", value: "#EDF2F7" },
    { name: "neutral-200", value: "#E2E8F0" },
    { name: "neutral-300", value: "#CBD5E0" },
    { name: "neutral-400", value: "#A0AEC0" },
    { name: "neutral-500", value: "#718096" },
    { name: "neutral-600", value: "#4A5568" },
    { name: "neutral-700", value: "#2D3748" },
    { name: "neutral-800", value: "#1A202C" },
  ],
  Brand: [
    { name: "wine", value: "#6B4C8A" },
    { name: "wine-light", value: "#F8F5FA" },
    { name: "wine-tag", value: "#EDE6F5" },
    { name: "accent", value: "#E9B949" },
    { name: "secondary", value: "#334E68" },
  ],
  Semantic: [
    { name: "success", value: "#10B981" },
    { name: "warning", value: "#F59E0B" },
    { name: "error", value: "#EF4444" },
    { name: "info", value: "#3B82F6" },
  ],
  Surface: [
    { name: "background", value: "#FFFFFF" },
    { name: "foreground", value: "#1A202C" },
    { name: "card", value: "#FFFFFF" },
  ],
}

const DARK_COLORS = {
  Primary: [
    { name: "primary-50", value: "#2A1510" },
    { name: "primary-500", value: "#FF6038" },
    { name: "primary-600", value: "#E5452A" },
  ],
  Neutral: [
    { name: "neutral-50", value: "#1A1F2E" },
    { name: "neutral-100", value: "#1E2433" },
    { name: "neutral-200", value: "#2A3040" },
    { name: "neutral-300", value: "#3A4050" },
    { name: "neutral-400", value: "#6B7280" },
    { name: "neutral-500", value: "#9CA3AF" },
    { name: "neutral-600", value: "#D1D5DB" },
    { name: "neutral-700", value: "#E5E7EB" },
    { name: "neutral-800", value: "#F9FAFB" },
  ],
  Brand: [
    { name: "wine", value: "#6B4C8A" },
    { name: "wine-light", value: "#F8F5FA" },
    { name: "wine-tag", value: "#EDE6F5" },
    { name: "accent", value: "#E9B949" },
    { name: "secondary", value: "#334E68" },
  ],
  Semantic: [
    { name: "success", value: "#10B981" },
    { name: "warning", value: "#F59E0B" },
    { name: "error", value: "#EF4444" },
    { name: "info", value: "#3B82F6" },
  ],
  Surface: [
    { name: "background", value: "#111318" },
    { name: "foreground", value: "#F9FAFB" },
    { name: "card", value: "#1A1F2E" },
  ],
}

const ELEVATION_LEVELS = [
  {
    level: 0,
    name: "Surface",
    usage: "페이지 배경, 기본 콘텐츠 영역",
    light: { bg: "bg-background", shadow: "없음" },
    dark: { bg: "bg-background", note: "배경색으로 구분" },
  },
  {
    level: 1,
    name: "Raised",
    usage: "카드, 섹션, 리스트 아이템",
    light: { bg: "bg-card", shadow: "ring-1 ring-foreground/10" },
    dark: { bg: "bg-card", note: "밝은 surface + 미세 border" },
  },
  {
    level: 2,
    name: "Overlay",
    usage: "드롭다운, 팝오버, 툴팁",
    light: { bg: "bg-card", shadow: "shadow-md + ring-1 ring-foreground/5" },
    dark: { bg: "bg-neutral-100", note: "더 밝은 surface + shadow" },
  },
  {
    level: 3,
    name: "Floating",
    usage: "모달, 다이얼로그, 시트",
    light: { bg: "bg-card", shadow: "shadow-lg + ring-1 ring-foreground/5" },
    dark: { bg: "bg-neutral-100", note: "최상위 surface + 강한 shadow" },
  },
]

/* ── Shared Components ── */

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="group flex flex-col gap-2">
      <div
        className="aspect-[4/3] w-full rounded-lg ring-1 ring-foreground/[0.06] transition-transform group-hover:scale-105"
        style={{ backgroundColor: value }}
      />
      <div>
        <p className="text-xs font-medium text-foreground">{name}</p>
        <p className="font-mono text-[10px] text-neutral-400">{value}</p>
      </div>
    </div>
  )
}

function Section({ id, title, description, children }: { id?: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{title}</h3>
      {children}
    </div>
  )
}

function DemoBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-neutral-200 dark:border-neutral-200 bg-neutral-50 dark:bg-neutral-50 p-6 ${className}`}>
      {children}
    </div>
  )
}

/* ── Page ── */

export default function DesignSystemPage() {
  const [searchValue, setSearchValue] = useState("")
  const { theme, resolvedTheme, setTheme } = useTheme()
  const colors = resolvedTheme === "dark" ? DARK_COLORS : LIGHT_COLORS

  const NAV_ITEMS = [
    { id: "colors", label: "Colors" },
    { id: "elevation", label: "Elevation" },
    { id: "typography", label: "Typography" },
    { id: "buttons", label: "Buttons" },
    { id: "badges", label: "Badges" },
    { id: "inputs", label: "Inputs" },
    { id: "cards", label: "Cards" },
    { id: "tabs", label: "Tabs" },
    { id: "feedback", label: "Feedback" },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-200 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <p className="font-logo text-base font-bold text-primary-500">nyam</p>
            <span className="text-xs text-neutral-400">/</span>
            <span className="text-sm font-medium text-foreground">Design System</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-neutral-200 dark:border-neutral-200 p-0.5">
            {[
              { value: "light" as const, icon: Sun },
              { value: "dark" as const, icon: Moon },
              { value: "system" as const, icon: Monitor },
            ].map(({ value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`rounded-md p-1.5 transition-colors ${
                  theme === value
                    ? "bg-neutral-100 dark:bg-neutral-200 text-foreground"
                    : "text-neutral-400 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
        {/* Section Nav */}
        <div className="mx-auto max-w-5xl overflow-x-auto px-6 scrollbar-hide">
          <div className="flex gap-1 pb-2">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-foreground dark:hover:bg-neutral-100"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col gap-20">

          {/* ── Colors ── */}
          <Section id="colors" title="Color Palette" description={`현재 모드: ${resolvedTheme === "dark" ? "Dark" : "Light"} — 테마 토큰은 CSS 변수로 정의됩니다.`}>
            {Object.entries(colors).map(([group, groupColors]) => (
              <SubSection key={group} title={group}>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
                  {groupColors.map((c) => (
                    <ColorSwatch key={c.name} {...c} />
                  ))}
                </div>
              </SubSection>
            ))}

            {/* Light vs Dark side-by-side */}
            <SubSection title="Light / Dark Comparison">
              <div className="grid gap-3 sm:grid-cols-2">
                {(["Primary", "Neutral", "Surface"] as const).map((group) => {
                  const light = LIGHT_COLORS[group]
                  const dark = DARK_COLORS[group]
                  return (
                    <div key={group} className="rounded-xl border border-neutral-200 dark:border-neutral-200 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">{group}</p>
                      <div className="flex flex-col gap-2">
                        {light.map((lc, i) => {
                          const dc = dark[i]
                          const changed = lc.value !== dc.value
                          if (!changed) return null
                          return (
                            <div key={lc.name} className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <div className="h-6 w-6 rounded-md ring-1 ring-black/10" style={{ backgroundColor: lc.value }} />
                                <span className="text-[10px] text-neutral-400 w-3">L</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="h-6 w-6 rounded-md ring-1 ring-white/10" style={{ backgroundColor: dc.value }} />
                                <span className="text-[10px] text-neutral-400 w-3">D</span>
                              </div>
                              <div className="flex flex-col">
                                <p className="text-xs font-medium text-foreground">{lc.name}</p>
                                <p className="font-mono text-[10px] text-neutral-400">{lc.value} → {dc.value}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </SubSection>
          </Section>

          {/* ── Elevation ── */}
          <Section id="elevation" title="Elevation" description="깊이(depth)를 표현하는 4단계 엘리베이션. Light 모드는 그림자, Dark 모드는 surface 색상으로 구분합니다.">
            <div className="grid gap-4 sm:grid-cols-2">
              {ELEVATION_LEVELS.map((el) => (
                <div key={el.level} className="flex flex-col gap-3 rounded-xl border border-neutral-200 dark:border-neutral-200 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neutral-100 dark:bg-neutral-200 text-xs font-bold text-foreground">{el.level}</span>
                      <span className="text-sm font-semibold text-foreground">{el.name}</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500">{el.usage}</p>
                  {/* Visual demo */}
                  <div className="flex items-center justify-center rounded-lg bg-background p-4">
                    <div className={`h-16 w-full rounded-xl transition-shadow ${
                      el.level === 0 ? "bg-background ring-1 ring-foreground/[0.06]" :
                      el.level === 1 ? "bg-card ring-1 ring-foreground/10" :
                      el.level === 2 ? "bg-card shadow-md ring-1 ring-foreground/5" :
                      "bg-card shadow-lg ring-1 ring-foreground/5"
                    }`} />
                  </div>
                  <div className="flex gap-4 text-[10px] font-mono text-neutral-400">
                    <span>light: {el.light.shadow}</span>
                  </div>
                </div>
              ))}
            </div>

            <SubSection title="Border Radius">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { name: "lg", value: "8px", class: "rounded-lg" },
                  { name: "xl", value: "12px", class: "rounded-xl" },
                  { name: "2xl", value: "16px", class: "rounded-2xl" },
                ].map((r) => (
                  <div key={r.name} className="flex flex-col items-center gap-2">
                    <div className={`h-16 w-full bg-neutral-100 dark:bg-neutral-200 ${r.class}`} />
                    <p className="text-xs text-neutral-500">radius-{r.name} ({r.value})</p>
                  </div>
                ))}
              </div>
            </SubSection>
          </Section>

          {/* ── Typography ── */}
          <Section id="typography" title="Typography" description="Pretendard(본문) + Inter(영문/숫자) + Comfortaa(로고)">
            <DemoBox>
              <div className="flex flex-col gap-1">
                <p className="font-logo text-xl text-foreground">Comfortaa — Logo font</p>
                <p className="font-sans text-xl text-foreground">Pretendard — 본문 텍스트</p>
                <p className="font-inter text-xl text-foreground">Inter — English & numbers</p>
              </div>
            </DemoBox>
            <DemoBox>
              <div className="flex flex-col gap-3">
                {[
                  { label: "H1", class: "text-3xl font-bold", size: "30px" },
                  { label: "H2", class: "text-2xl font-bold", size: "24px" },
                  { label: "H3", class: "text-xl font-bold", size: "20px" },
                  { label: "H4", class: "text-lg font-semibold", size: "18px" },
                  { label: "Body", class: "text-base", size: "16px" },
                  { label: "Small", class: "text-sm text-neutral-600", size: "14px" },
                  { label: "Caption", class: "text-xs text-neutral-500", size: "12px" },
                ].map((t) => (
                  <div key={t.label} className="flex items-baseline gap-4">
                    <span className="w-16 shrink-0 text-[10px] font-mono text-neutral-400">{t.label} / {t.size}</span>
                    <p className={`${t.class} text-foreground`}>맛있는 발견의 시작</p>
                  </div>
                ))}
              </div>
            </DemoBox>
          </Section>

          {/* ── Buttons ── */}
          <Section id="buttons" title="Button" description="6가지 variant, 8가지 size. CVA(class-variance-authority) 기반.">
            <SubSection title="Variants">
              <DemoBox>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
              </DemoBox>
            </SubSection>
            <SubSection title="Sizes">
              <DemoBox>
                <div className="flex flex-wrap items-end gap-3">
                  <Button size="xs">XS</Button>
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                </div>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <Button size="icon-xs"><ChevronRight /></Button>
                  <Button size="icon-sm"><ChevronRight /></Button>
                  <Button size="icon"><ChevronRight /></Button>
                  <Button size="icon-lg"><ChevronRight /></Button>
                </div>
              </DemoBox>
            </SubSection>
            <SubSection title="States">
              <DemoBox>
                <div className="flex flex-wrap items-center gap-3">
                  <Button>Enabled</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </DemoBox>
            </SubSection>
          </Section>

          {/* ── Badges ── */}
          <Section id="badges" title="Badge">
            <DemoBox>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="ghost">Ghost</Badge>
                <Badge variant="link">Link</Badge>
              </div>
            </DemoBox>
          </Section>

          {/* ── Inputs ── */}
          <Section id="inputs" title="Input & Search">
            <div className="grid gap-4 sm:grid-cols-2">
              <DemoBox>
                <div className="flex flex-col gap-4">
                  <SubSection title="Input">
                    <Input placeholder="이름을 입력하세요" />
                  </SubSection>
                  <SubSection title="Disabled">
                    <Input placeholder="비활성화됨" disabled />
                  </SubSection>
                </div>
              </DemoBox>
              <DemoBox>
                <SubSection title="SearchBar">
                  <SearchBar
                    value={searchValue}
                    onChange={setSearchValue}
                    placeholder="맛집 검색..."
                  />
                </SubSection>
              </DemoBox>
            </div>
          </Section>

          {/* ── Cards ── */}
          <Section id="cards" title="Card" description="Elevation Level 1 기반. ring-1 border로 구분, 다크모드에서는 surface 색상으로 깊이 표현.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Default Card</CardTitle>
                  <CardDescription>Elevation 1 — ring border</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-500">카드 본문 내용이 여기에 들어갑니다. 기본 카드는 얇은 border로 배경과 구분됩니다.</p>
                </CardContent>
                <CardFooter>
                  <Button size="sm" variant="ghost">더보기</Button>
                </CardFooter>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Small Card</CardTitle>
                  <CardDescription>size=&quot;sm&quot; — 더 좁은 패딩</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-500">작은 카드 버전입니다.</p>
                </CardContent>
              </Card>
            </div>
            <DemoBox>
              <SectionHeader
                title="인기 맛집"
                subtitle="이번 주 가장 많이 저장된 맛집"
                action={<Button size="sm" variant="ghost">전체보기 <ChevronRight /></Button>}
              />
            </DemoBox>
          </Section>

          {/* ── Tabs ── */}
          <Section id="tabs" title="Tabs">
            <div className="grid gap-4 sm:grid-cols-2">
              <DemoBox>
                <SubSection title="Default">
                  <Tabs defaultValue="tab1">
                    <TabsList>
                      <TabsTrigger value="tab1">전체</TabsTrigger>
                      <TabsTrigger value="tab2">한식</TabsTrigger>
                      <TabsTrigger value="tab3">일식</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tab1">
                      <p className="pt-3 text-sm text-neutral-500">전체 탭 내용</p>
                    </TabsContent>
                    <TabsContent value="tab2">
                      <p className="pt-3 text-sm text-neutral-500">한식 탭 내용</p>
                    </TabsContent>
                    <TabsContent value="tab3">
                      <p className="pt-3 text-sm text-neutral-500">일식 탭 내용</p>
                    </TabsContent>
                  </Tabs>
                </SubSection>
              </DemoBox>
              <DemoBox>
                <SubSection title="Line Variant">
                  <Tabs defaultValue="tab1">
                    <TabsList variant="line">
                      <TabsTrigger value="tab1">전체</TabsTrigger>
                      <TabsTrigger value="tab2">한식</TabsTrigger>
                      <TabsTrigger value="tab3">일식</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tab1">
                      <p className="pt-3 text-sm text-neutral-500">전체 탭 내용</p>
                    </TabsContent>
                  </Tabs>
                </SubSection>
              </DemoBox>
            </div>
          </Section>

          {/* ── Feedback & Loading ── */}
          <Section id="feedback" title="Feedback & Loading States">
            <div className="grid gap-4 sm:grid-cols-2">
              <DemoBox>
                <SubSection title="CardSkeleton">
                  <CardSkeleton />
                </SubSection>
              </DemoBox>
              <DemoBox>
                <SubSection title="ListSkeleton">
                  <ListSkeleton count={3} />
                </SubSection>
              </DemoBox>
            </div>
            <DemoBox>
              <SubSection title="EmptyState">
                <EmptyState
                  icon={Inbox}
                  title="아직 기록이 없어요"
                  description="첫 번째 맛집 기록을 남겨보세요"
                  actionLabel="기록하기"
                  actionHref="#"
                />
              </SubSection>
            </DemoBox>
            <DemoBox>
              <SubSection title="Separator">
                <div className="flex flex-col gap-4">
                  <Separator />
                  <div className="flex h-8 items-center gap-4">
                    <span className="text-sm text-foreground">항목 1</span>
                    <Separator orientation="vertical" />
                    <span className="text-sm text-foreground">항목 2</span>
                    <Separator orientation="vertical" />
                    <span className="text-sm text-foreground">항목 3</span>
                  </div>
                </div>
              </SubSection>
            </DemoBox>
          </Section>
        </div>

        <footer className="mt-20 border-t border-neutral-200 dark:border-neutral-200 pt-6 pb-12 text-center text-xs text-neutral-400">
          nyam Design System
        </footer>
      </main>
    </div>
  )
}
