"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface CreateGroupModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { name: string; description: string; accessType: "private" | "public" }) => void
  isLoading: boolean
}

export function CreateGroupModal({ open, onClose, onSubmit, isLoading }: CreateGroupModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [accessType, setAccessType] = useState<"private" | "public">("private")

  if (!open) return null

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit({ name: name.trim(), description: description.trim(), accessType })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] px-6">
      <div className="w-full max-w-md rounded-2xl bg-card p-4 shadow-lg animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-800">새 버블 만들기</h3>
          <button type="button" onClick={onClose} className="text-neutral-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="버블 이름"
            className="h-11 w-full rounded-xl border border-neutral-200 bg-card dark:bg-neutral-100 px-3.5 text-sm outline-none focus:border-primary-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="설명 (선택)"
            className="h-20 w-full resize-none rounded-xl border border-neutral-200 bg-card dark:bg-neutral-100 px-3.5 py-3 text-sm outline-none focus:border-primary-500"
          />
          <div className="flex gap-2">
            {(["private", "public"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAccessType(type)}
                className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                  accessType === type
                    ? "bg-primary-500 text-white"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {type === "private" ? "비공개" : "공개"}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!name.trim() || isLoading}
          onClick={handleSubmit}
          className="mt-4 h-12 w-full rounded-xl bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-all"
        >
          {isLoading ? "만드는 중..." : "만들기"}
        </button>
      </div>
    </div>
  )
}
