'use client'

interface DeleteConfirmModalProps {
  isOpen: boolean
  isDeleting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmModal({ isOpen, isDeleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="mx-6 w-full max-w-[320px] rounded-2xl bg-[var(--bg-card)] p-6">
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>
          이 기록을 삭제하시겠습니까?
        </h3>
        <p className="mt-2" style={{ fontSize: '14px', color: 'var(--text-sub)' }}>
          경험치가 차감됩니다. 삭제된 기록은 복구할 수 없습니다.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl py-3 text-[14px] font-semibold"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-xl py-3 text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--negative)' }}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </div>
  )
}
