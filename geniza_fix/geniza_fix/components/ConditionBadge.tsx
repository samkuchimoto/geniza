'use client'

import { CONDITION_LABELS, type ItemCondition } from '@/types'

interface ConditionBadgeProps {
  condition: ItemCondition
  size?: 'sm' | 'md'
}

const STAMP_CLASS: Record<ItemCondition, string> = {
  excellent: 'stamp-excellent',
  bon: 'stamp-bon',
  acceptable: 'stamp-acceptable',
  mauvais: 'stamp-mauvais',
}

export default function ConditionBadge({ condition, size = 'md' }: ConditionBadgeProps) {
  return (
    <span
      className={`
        ${STAMP_CLASS[condition]}
        ${size === 'sm' ? 'text-[10px] px-1.5 py-px' : 'text-label-sm px-2 py-0.5'}
      `}
    >
      {CONDITION_LABELS[condition]}
    </span>
  )
}
