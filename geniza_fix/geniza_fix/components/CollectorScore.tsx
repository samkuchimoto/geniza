'use client'

import { COLLECTOR_SCORE_LABEL } from '@/types'

interface CollectorScoreProps {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md'
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-vert'
  if (score >= 50) return 'text-ambre'
  if (score >= 20) return 'text-sable'
  return 'text-sable'
}

export default function CollectorScore({
  score,
  showLabel = true,
  size = 'md',
}: CollectorScoreProps) {
  const label = COLLECTOR_SCORE_LABEL(score)
  const color = scoreColor(score)

  if (size === 'sm') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`font-mono-custom font-medium text-[11px] ${color}`}>
          {score}
        </span>
        {showLabel && (
          <span className="text-[10px] text-sable uppercase tracking-wider font-mono-custom">
            {label}
          </span>
        )}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`font-mono-custom font-medium text-body-sm ${color}`}>
        {score}
      </span>
      {showLabel && (
        <span className="eyebrow text-[11px]">{label}</span>
      )}
    </span>
  )
}
