'use client'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <div className="flex gap-2 px-6 py-3">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isDone = i < currentStep
        const isActive = i === currentStep

        return (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: isDone
                ? 'var(--accent-food)'
                : isActive
                  ? 'var(--accent-food)'
                  : 'var(--border)',
              opacity: isActive ? 0.6 : 1,
            }}
          />
        )
      })}
    </div>
  )
}
