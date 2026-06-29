'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { ItemImage } from '@/types'

interface ImageGalleryProps {
  images: ItemImage[]
  title: string
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [active, setActive] = useState(0)

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-surface-raised flex items-center justify-center">
        <span className="text-body-sm text-sable">Aucune photo</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Main image */}
      <div className="relative aspect-square bg-surface-raised overflow-hidden">
        <Image
          src={images[active].url}
          alt={`${title} — photo ${active + 1}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain"
          priority={active === 0}
        />

        {/* Prev / Next arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActive((a) => (a - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-parchemin/90 border border-ivoire flex items-center justify-center hover:bg-parchemin transition-colors"
              aria-label="Photo précédente"
            >
              <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
                <path d="M6 1L1.5 5.5L6 10" stroke="#0D0C0A" strokeWidth="1.25" strokeLinecap="square" />
              </svg>
            </button>
            <button
              onClick={() => setActive((a) => (a + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-parchemin/90 border border-ivoire flex items-center justify-center hover:bg-parchemin transition-colors"
              aria-label="Photo suivante"
            >
              <svg width="7" height="11" viewBox="0 0 7 11" fill="none">
                <path d="M1 1L5.5 5.5L1 10" stroke="#0D0C0A" strokeWidth="1.25" strokeLinecap="square" />
              </svg>
            </button>
          </>
        )}

        {/* Counter */}
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 bg-encre/80 text-parchemin text-[10px] font-mono-custom px-2 py-0.5">
            {active + 1}/{images.length}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={`
                relative flex-shrink-0 w-14 h-14 overflow-hidden border transition-colors
                ${i === active ? 'border-encre' : 'border-ivoire hover:border-sable'}
              `}
              aria-label={`Photo ${i + 1}`}
            >
              <Image
                src={img.url}
                alt={`Miniature ${i + 1}`}
                fill
                sizes="56px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
