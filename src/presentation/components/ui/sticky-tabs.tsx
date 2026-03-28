'use client'

type Variant = 'food' | 'wine' | 'social'

interface Tab<T extends string> {
  key: T
  label: string
  variant?: Variant
}

interface StickyTabsProps<T extends string> {
  tabs: Tab<T>[]
  activeTab: T
  variant?: Variant
  onTabChange: (tab: T) => void
  rightSlot?: React.ReactNode
}

/**
 * StickyTabs — 헤더 아래에 고정되는 필터 탭 바.
 * position: sticky + top으로 .top-fixed 헤더 바로 아래에 붙음.
 * 어디서 사용하든 sticky 동작 보장.
 */
export function StickyTabs<T extends string>({
  tabs,
  activeTab,
  variant = 'food',
  onTabChange,
  rightSlot,
}: StickyTabsProps<T>) {
  return (
    <div
      className="content-tabs flex items-center px-4 pb-1"
      style={{
        position: 'sticky',
        top: '46px', /* .top-fixed 헤더 높이 (padding 5+5 + content ~36) */
        zIndex: 80,
        backgroundColor: 'var(--bg)',
      }}
    >
      <div className="flex gap-2">
        {tabs.map((tab) => {
          const v = tab.variant ?? variant
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`filter-tab ${activeTab === tab.key ? `active ${v}` : ''}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {rightSlot && (
        <>
          <div className="flex-1" />
          {rightSlot}
        </>
      )}
    </div>
  )
}
