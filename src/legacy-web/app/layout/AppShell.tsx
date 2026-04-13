import type { ReactNode } from 'react'
import type { AppModuleDefinition, AppModuleId } from '../navigation/modules'

interface AppShellProps {
  businessName: string
  modules: AppModuleDefinition[]
  activeModule: AppModuleId
  onNavigate: (moduleId: AppModuleId) => void
  children: ReactNode
}

export function AppShell({
  businessName,
  modules,
  activeModule,
  onNavigate,
  children,
}: AppShellProps) {
  const currentModule = modules.find((module) => module.id === activeModule)

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <p className="sidebar__eyebrow">Operacion diaria</p>
          <h1>{businessName}</h1>
          <span>Sistema rapido para atender, reponer y controlar el negocio.</span>
        </div>

        <nav className="sidebar__nav" aria-label="Navegacion principal">
          {modules.map((module) => (
            <button
              key={module.id}
              className={`sidebar__link ${module.id === activeModule ? 'sidebar__link--active' : ''}`}
              onClick={() => onNavigate(module.id)}
            >
              <strong>{module.label}</strong>
              <span>{module.description}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="content-area">
        <header className="topbar">
          <div>
            <p className="section-kicker">Modulo activo</p>
            <h2>{currentModule?.label}</h2>
            <p>{currentModule?.description}</p>
          </div>

          <div className="topbar__status">
            <span className="status-chip">Listo para atender</span>
          </div>
        </header>

        {children}
      </section>
    </main>
  )
}
