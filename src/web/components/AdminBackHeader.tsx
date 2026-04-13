import type { ReactNode } from 'react'
import { Button } from '../../components/ui/Button'

interface AdminBackHeaderProps {
  title: string
  kicker?: string
  description?: string
  onBack: () => void
  backLabel?: string
  actions?: ReactNode
}

export function AdminBackHeader({
  title,
  kicker,
  description,
  onBack,
  backLabel = 'Volver',
  actions,
}: AdminBackHeaderProps) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header__content">
        <Button
          type="button"
          variant="secondary"
          className="admin-back-button"
          onClick={onBack}
        >
          <span aria-hidden="true">&lt;</span>
          <span>{backLabel}</span>
        </Button>
        {kicker ? <p className="section-kicker">{kicker}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-header__actions">{actions}</div> : null}
    </header>
  )
}
