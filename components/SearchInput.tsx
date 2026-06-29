'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher un objet, un artiste, une référence...',
  debounceMs = 350,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync if parent resets value (e.g. clear filters)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setLocalValue(v)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onChange(v)
      }, debounceMs)
    },
    [onChange, debounceMs]
  )

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
  }, [onChange])

  return (
    <div className="relative">
      {/* Search icon */}
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="text-sable"
        >
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.25" />
          <path
            d="M9.5 9.5L12.5 12.5"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="square"
          />
        </svg>
      </span>

      <input
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="input pl-9 pr-8 text-body-sm"
        autoComplete="off"
        spellCheck={false}
      />

      {/* Clear button */}
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sable hover:text-encre transition-colors"
          aria-label="Effacer la recherche"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
