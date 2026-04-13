interface AdminLoadingBlockProps {
  label: string
  lines?: number
  compact?: boolean
}

export function AdminLoadingBlock({
  label,
  lines = 3,
  compact = false,
}: AdminLoadingBlockProps) {
  return (
    <section
      className={`admin-loading-block ${compact ? 'admin-loading-block--compact' : ''}`.trim()}
      aria-label={label}
      aria-busy="true"
    >
      <div className="admin-loading-block__header">
        <span className="admin-loading-block__dot" />
        <strong>{label}</strong>
      </div>
      <div className="admin-loading-block__skeletons">
        {Array.from({ length: lines }).map((_, index) => (
          <span
            key={`${label}-${index}`}
            className="admin-loading-block__skeleton"
            style={{ width: `${92 - index * 11}%` }}
          />
        ))}
      </div>
    </section>
  )
}
