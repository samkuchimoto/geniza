'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

// ============================================================
// Simple event bus for showing toasts from anywhere
// ============================================================
type ToastListener = (toast: Toast) => void
const listeners: ToastListener[] = []

export function showToast(message: string, type: ToastType = 'info') {
  const toast: Toast = { id: crypto.randomUUID(), message, type }
  listeners.forEach((fn) => fn(toast))
}

// ============================================================
// ToastContainer — mount once in layout
// ============================================================
export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const handler: ToastListener = (toast) => {
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 4000)
    }
    listeners.push(handler)
    return () => {
      const idx = listeners.indexOf(handler)
      if (idx > -1) listeners.splice(idx, 1)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            px-4 py-3 border shadow-card-hover animate-slide-up text-body-sm
            ${toast.type === 'success' ? 'bg-surface border-vert text-vert' : ''}
            ${toast.type === 'error' ? 'bg-surface border-rouge text-rouge' : ''}
            ${toast.type === 'info' ? 'bg-encre border-encre text-parchemin' : ''}
          `}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
