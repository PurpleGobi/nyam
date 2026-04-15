'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/presentation/components/ui/alert-dialog'

interface DeleteConfirmModalProps {
  isOpen: boolean
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({ isOpen, isDeleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onCancel() }}>
      <AlertDialogContent
        className="mx-6 max-w-[320px] rounded-2xl"
        style={{ transition: 'all 200ms ease-in-out' }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>
            기록을 삭제하시겠습니까?
          </AlertDialogTitle>
          <AlertDialogDescription style={{ fontSize: '14px', color: 'var(--text-sub)' }}>
            이 기록을 삭제하면 경험치가 차감됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3">
          <AlertDialogCancel
            className="flex-1 rounded-xl py-3 text-[14px] font-semibold"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isDeleting}
            className="flex-1 rounded-xl py-3 text-[14px] font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--negative)', color: 'var(--text-inverse)' }}
          >
            {isDeleting ? '삭제 중...' : '삭제하기'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
