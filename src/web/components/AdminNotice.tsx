interface AdminNoticeProps {
  tone?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: string
  compact?: boolean
}

export function AdminNotice({
  tone = 'info',
  title,
  children,
  compact = false,
}: AdminNoticeProps) {
  return (
    <div
      className={`admin-notice admin-notice--${tone} ${
        compact ? 'admin-notice--compact' : ''
      }`.trim()}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {title ? <strong>{title}</strong> : null}
      <p>{children}</p>
    </div>
  )
}
