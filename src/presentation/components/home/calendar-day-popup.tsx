"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { X } from "lucide-react"

interface CalendarDayRecord {
  id: string
  title: string
  thumbnailUrl: string | null
  recordType: string
}

interface CalendarDayPopupProps {
  records: CalendarDayRecord[]
  date: string
  onClose: () => void
  onRecordClick: (id: string) => void
}

export function CalendarDayPopup({
  records,
  date,
  onClose,
  onRecordClick,
}: CalendarDayPopupProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] px-6"
    >
      <div className="w-full max-w-md rounded-2xl bg-card p-4 shadow-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-neutral-800">{date}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          {records.map((record) => (
            <button
              key={record.id}
              type="button"
              onClick={() => onRecordClick(record.id)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-neutral-50 active:scale-[0.98]"
            >
              {record.thumbnailUrl ? (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={record.thumbnailUrl}
                    alt={record.title}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
                  <span className="text-[10px] text-neutral-400">
                    {record.recordType === "wine" ? "W" : record.recordType === "cooking" ? "C" : "R"}
                  </span>
                </div>
              )}
              <span className="truncate text-sm text-neutral-700">
                {record.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
