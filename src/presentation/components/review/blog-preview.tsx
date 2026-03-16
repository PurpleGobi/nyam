'use client'

import Image from 'next/image'

interface BlogSection {
  type: 'text' | 'photo'
  content: string
  photoIndex?: number
  caption?: string
}

interface BlogPreviewProps {
  title: string
  sections: BlogSection[]
  summary: string
  recommendFor: string[]
  photoUrls: string[]
}

export function BlogPreview({ title, sections, summary, recommendFor, photoUrls }: BlogPreviewProps) {
  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-2xl border border-[var(--color-neutral-200)] bg-white">
      {/* Title */}
      <div className="px-5 pt-6 pb-4">
        <h2 className="text-xl font-bold leading-snug text-[var(--color-neutral-800)]">
          {title}
        </h2>
      </div>

      {/* Sections */}
      {sections.map((section, index) => {
        if (section.type === 'photo') {
          const url = section.photoIndex != null ? photoUrls[section.photoIndex] : undefined
          if (!url) return null
          return (
            <div key={index} className="flex flex-col gap-1.5">
              <div className="relative aspect-[4/3] w-full bg-[var(--color-neutral-100)]">
                <Image
                  src={url}
                  alt={section.caption ?? ''}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 500px"
                />
              </div>
              {section.caption && (
                <p className="px-5 pb-2 text-xs text-[var(--color-neutral-400)] italic">
                  {section.caption}
                </p>
              )}
            </div>
          )
        }

        return (
          <div key={index} className="px-5 py-2">
            <p className="text-sm leading-relaxed text-[var(--color-neutral-700)]">
              {section.content}
            </p>
          </div>
        )
      })}

      {/* Summary */}
      <div className="mx-5 mt-3 mb-4 rounded-xl bg-[#FF6038]/5 px-4 py-3">
        <p className="text-sm font-medium text-[#FF6038]">
          {summary}
        </p>
      </div>

      {/* Recommend For */}
      {recommendFor.length > 0 && (
        <div className="flex flex-col gap-2 px-5 pb-5">
          <span className="text-xs font-medium text-[var(--color-neutral-500)]">
            추천 대상
          </span>
          <div className="flex flex-wrap gap-1.5">
            {recommendFor.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--color-neutral-100)] px-3 py-1 text-xs font-medium text-[var(--color-neutral-600)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
