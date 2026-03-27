'use client'

import { useState, useCallback } from 'react'
import type { AddFlowStep, AddFlowTarget } from '@/domain/entities/add-flow'
import type { RecordTargetType } from '@/domain/entities/record'

interface UseAddFlowReturn {
  step: AddFlowStep
  target: AddFlowTarget | null
  stepHistory: AddFlowStep[]
  setTarget: (target: AddFlowTarget) => void
  pushStep: (next: AddFlowStep) => void
  goBack: () => AddFlowStep | null
  reset: () => void
}

export function useAddFlow(
  initialStep: AddFlowStep,
  targetType: RecordTargetType,
): UseAddFlowReturn {
  const [step, setStep] = useState<AddFlowStep>(initialStep)
  const [target, setTarget] = useState<AddFlowTarget | null>(null)
  const [stepHistory, setStepHistory] = useState<AddFlowStep[]>([])

  const pushStep = useCallback((next: AddFlowStep) => {
    setStepHistory((prev) => [...prev, step])
    setStep(next)
  }, [step])

  const goBack = useCallback((): AddFlowStep | null => {
    if (stepHistory.length === 0) return null
    const prev = stepHistory[stepHistory.length - 1]
    setStepHistory((h) => h.slice(0, -1))
    setStep(prev)
    return prev
  }, [stepHistory])

  const reset = useCallback(() => {
    setStep(initialStep)
    setTarget(null)
    setStepHistory([])
  }, [initialStep])

  return { step, target, stepHistory, setTarget, pushStep, goBack, reset }
}
