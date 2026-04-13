import type { PropsWithChildren, ReactNode } from 'react'

interface AdminFormSectionProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function AdminFormSection({
  title,
  description,
  action,
  className = '',
  children,
}: PropsWithChildren<AdminFormSectionProps>) {
  return (
    <section className={`admin-form-section ${className}`.trim()}>
      <header className="admin-form-section__header">
        <div>
          <h4>{title}</h4>
          {description ? <p>{description}</p> : null}
        </div>
        {action}
      </header>
      <div className="admin-form-section__body">{children}</div>
    </section>
  )
}
