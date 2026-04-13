import type { PropsWithChildren, ReactNode } from 'react'

interface SectionCardProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
}: PropsWithChildren<SectionCardProps>) {
  return (
    <section className="section-card">
      <header className="section-card__header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
