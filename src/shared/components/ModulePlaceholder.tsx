import type { ReactNode } from 'react'

interface ModulePlaceholderProps {
  title: string
  summary: string
  goals: string[]
  entities: string[]
  nextSteps: string[]
  aside?: ReactNode
}

export function ModulePlaceholder({
  title,
  summary,
  goals,
  entities,
  nextSteps,
  aside,
}: ModulePlaceholderProps) {
  return (
    <section className="module-page">
      <header className="module-page__header">
        <div>
          <p className="section-kicker">Modulo base</p>
          <h2>{title}</h2>
          <p>{summary}</p>
        </div>
        {aside}
      </header>

      <div className="module-page__grid">
        <article className="surface-card">
          <h3>Objetivo inicial</h3>
          <ul className="feature-list">
            {goals.map((goal) => (
              <li key={goal}>{goal}</li>
            ))}
          </ul>
        </article>

        <article className="surface-card">
          <h3>Entidades principales</h3>
          <ul className="feature-list">
            {entities.map((entity) => (
              <li key={entity}>{entity}</li>
            ))}
          </ul>
        </article>

        <article className="surface-card">
          <h3>Siguiente construccion</h3>
          <ul className="feature-list">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
