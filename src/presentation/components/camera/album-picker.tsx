'use client'

import { useRef, useCallback } from 'react'
import { ImagePlus } from 'lucide-react'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'

interface AlbumPickerProps {
  onSelect: (imageBase64: string) => void
  variant: 'food' | 'wine'
}

export function AlbumPicker({ onSelect, variant }: AlbumPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        onSelect(base64)
      }
      reader.readAsDataURL(file)
      e.target.value = ''
    },
    [onSelect],
  )

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_CONSTANTS.ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-[14px] text-[var(--text)]"
      >
        <ImagePlus size={18} style={{ color: variant === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)' }} />
        앨범에서 선택
      </button>
    </>
  )
}
