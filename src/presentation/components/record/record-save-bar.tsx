'use client'

import { Check, Trash2 } from 'lucide-react'
import { FabActions } from '@/presentation/components/layout/fab-actions'
import type { FabActionButton } from '@/presentation/components/layout/fab-actions'

interface RecordSaveBarProps {
  variant: 'food' | 'wine'
  onSave: () => void
  isLoading: boolean
  disabled?: boolean
  label?: string
  onDelete?: () => void
  isDeleting?: boolean
}

export function RecordSaveBar({ variant, onSave, isLoading, disabled = false, label = '저장', onDelete, isDeleting = false }: RecordSaveBarProps) {
  const buttons: FabActionButton[] = []

  buttons.push({
    label,
    icon: Check,
    onClick: onSave,
    tone: 'accent',
    disabled: disabled || isLoading,
    loading: isLoading,
  })

  if (onDelete) {
    buttons.push({
      label: '삭제',
      icon: Trash2,
      onClick: onDelete,
      tone: 'danger',
      disabled: isDeleting || isLoading,
      loading: isDeleting,
    })
  }

  return (
    <FabActions
      variant={variant === 'food' ? 'food' : 'wine'}
      buttons={buttons}
    />
  )
}
