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

export function StickyTabs<T extends string>({
  tabs,
  activeTab,
  variant = 'food',
  onTabChange,
  rightSlot,
}: StickyTabsProps<T>) {
  return (
    <div className="content-tabs flex items-center px-4 pt-3">
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
