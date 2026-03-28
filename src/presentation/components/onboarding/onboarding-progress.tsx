'use client'

interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  return (
    <div className="step-progress px-6 py-3">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isDone = i < currentStep
        const isActive = i === currentStep

        return (
          <div
            key={i}
            className={`step-bar${isDone ? ' complete' : isActive ? ' current' : ''}`}
          />
        )
      })}
    </div>
  )
}
