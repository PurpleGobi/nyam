'use client'

interface NyamToggleProps {
  on: boolean
  onChange: (value: boolean) => void
}

export function NyamToggle({ on, onChange }: NyamToggleProps) {
  return (
    <button
      type="button"
      className={`toggle ${on ? 'on' : ''}`}
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
    />
  )
}
