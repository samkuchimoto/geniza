'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import imageCompression from 'browser-image-compression'

interface ImageUploaderProps {
  files: File[]
  onChange: (files: File[]) => void
  maxFiles?: number
}

const MAX_SIZE_MB = 0.8
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export default function ImageUploader({
  files,
  onChange,
  maxFiles = 8,
}: ImageUploaderProps) {
  const [dragging, setDragging] = useState(false)
  const [compressing, setCompressing] = useState(false)

  const previews = files.map((f) => URL.createObjectURL(f))

  const compress = useCallback(async (rawFiles: File[]): Promise<File[]> => {
    return Promise.all(
      rawFiles.map((f) =>
        imageCompression(f, {
          maxSizeMB: MAX_SIZE_MB,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })
      )
    )
  }, [])

  const addFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const valid = Array.from(incoming).filter((f) => ACCEPTED.includes(f.type))
      const remaining = maxFiles - files.length
      if (remaining <= 0 || valid.length === 0) return

      setCompressing(true)
      try {
        const compressed = await compress(valid.slice(0, remaining))
        onChange([...files, ...compressed])
      } finally {
        setCompressing(false)
      }
    },
    [files, maxFiles, compress, onChange]
  )

  const remove = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles]
  )

  return (
    <div className="space-y-3">
      <label className="label">
        Photos{' '}
        <span className="text-sable normal-case tracking-normal font-body font-normal">
          (min. 2, max. {maxFiles})
        </span>
      </label>

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {files.map((_, i) => (
            <div key={i} className="relative aspect-square bg-surface-raised overflow-hidden group">
              <Image
                src={previews[i]}
                alt={`Photo ${i + 1}`}
                fill
                className="object-cover"
              />
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-encre/80 text-parchemin text-[9px] font-mono-custom text-center py-0.5 uppercase tracking-wider">
                  Couverture
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-rouge text-parchemin flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Supprimer"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {files.length < maxFiles && (
        <label
          className={`
            flex flex-col items-center justify-center gap-2
            border-2 border-dashed cursor-pointer
            h-28 transition-colors duration-150
            ${dragging
              ? 'border-or bg-or/5'
              : 'border-ivoire hover:border-sable bg-surface'
            }
            ${compressing ? 'opacity-50 pointer-events-none' : ''}
          `}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={ACCEPTED.join(',')}
            multiple
            className="sr-only"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            disabled={compressing}
          />
          {compressing ? (
            <span className="text-body-sm text-sable">Compression en cours...</span>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-sable">
                <rect x="3" y="3" width="18" height="18" rx="0" stroke="currentColor" strokeWidth="1.25" />
                <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
              </svg>
              <span className="text-body-sm text-sable">
                Glisse ou clique pour ajouter des photos
              </span>
              <span className="text-[11px] text-sable font-mono-custom">
                JPG, PNG, WEBP — max {MAX_SIZE_MB * 1000}KB/photo
              </span>
            </>
          )}
        </label>
      )}

      {files.length < 2 && files.length > 0 && (
        <p className="text-[11px] text-rouge font-mono-custom">
          Minimum 2 photos requises pour publier.
        </p>
      )}
    </div>
  )
}
