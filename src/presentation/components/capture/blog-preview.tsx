"use client"

import Image from "next/image"

interface BlogSection {
  heading: string
  content: string
  photoIndex?: number
}

interface BlogReview {
  title: string
  summary: string
  sections: BlogSection[]
  tags: string[]
  overallImpression: string
}

interface BlogPreviewProps {
  review: BlogReview
  photos: string[]
  onEdit?: (sectionIndex: number, content: string) => void
}

export function BlogPreview({ review, photos, onEdit }: BlogPreviewProps) {
  return (
    <article className="flex flex-col gap-6 p-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-foreground">{review.title}</h1>
        <p className="text-sm text-neutral-500">{review.summary}</p>
      </header>

      {review.sections.map((section, index) => (
        <section key={index} className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">{section.heading}</h2>

          {section.photoIndex !== undefined && photos[section.photoIndex] && (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
              <Image
                src={photos[section.photoIndex]}
                alt={section.heading}
                fill
                className="object-cover"
              />
            </div>
          )}

          <p
            className="text-sm leading-relaxed text-neutral-600"
            onClick={() => onEdit?.(index, section.content)}
          >
            {section.content}
          </p>
        </section>
      ))}

      <footer className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
        <p className="text-sm leading-relaxed text-neutral-600">{review.overallImpression}</p>

        {review.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {review.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-orange-50 px-2.5 py-1 text-xs text-orange-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </footer>
    </article>
  )
}
