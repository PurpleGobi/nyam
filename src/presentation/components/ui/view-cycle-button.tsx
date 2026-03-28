'use client'

interface ViewCycleButtonProps {
  icon: React.ElementType
  active?: boolean
  onClick?: () => void
}

export function ViewCycleButton({ icon: Icon, active, onClick }: ViewCycleButtonProps) {
  return (
    <button
      type="button"
      className={`view-cycle-btn${active ? ' active' : ''}`}
      onClick={onClick}
    >
      <Icon size={18} />
    </button>
  )
}
