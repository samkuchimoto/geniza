export default function ItemCardSkeleton() {
  return (
    <article className="card overflow-hidden">
      {/* Image placeholder */}
      <div className="aspect-[4/5] skeleton" />

      {/* Info placeholder */}
      <div className="p-3.5 space-y-2.5">
        {/* Eyebrow */}
        <div className="skeleton h-2.5 w-16 rounded-none" />

        {/* Title */}
        <div className="space-y-1.5">
          <div className="skeleton h-4 w-full rounded-none" />
          <div className="skeleton h-4 w-3/4 rounded-none" />
        </div>

        {/* Condition + Price */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="skeleton h-4 w-16 rounded-none" />
          <div className="skeleton h-4 w-12 rounded-none" />
        </div>

        {/* Seller row */}
        <div className="flex items-center gap-2 pt-2.5 border-t border-ivoire">
          <div className="skeleton w-4 h-4 rounded-full" />
          <div className="skeleton h-2.5 w-24 rounded-none" />
        </div>
      </div>
    </article>
  )
}
