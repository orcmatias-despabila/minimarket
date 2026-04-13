import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { canAccessWebModule, getWebModuleByPath, webModules } from '../navigation/modules'
import { useWebAuth } from '../auth/AuthProvider'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

const buildAccountInitials = (value?: string | null) =>
  (value ?? '')
    .trim()
    .split(/[.@\s_-]+/)
    .map((chunk) => chunk[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

export function WebAppShell() {
  const location = useLocation()
  const { signOut, user } = useWebAuth()
  const { business, currentRole, hasPermission } = useWebWorkspace()
  const [isSidebarCompact, setIsSidebarCompact] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const storedValue = window.localStorage.getItem('web-shell-sidebar-compact')
    setIsSidebarCompact(storedValue === 'true')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem('web-shell-sidebar-compact', String(isSidebarCompact))
  }, [isSidebarCompact])

  const canAccessModule = (module: (typeof webModules)[number]) =>
    canAccessWebModule(module, { currentRole, hasPermission })

  const visibleModules = webModules.filter(canAccessModule)
  const backofficeModules = visibleModules.filter((module) => module.group === 'backoffice')
  const operationsModules = visibleModules.filter((module) => module.group === 'operations')

  const activeModule = getWebModuleByPath(location.pathname) ?? visibleModules[0]
  const activeSectionModules = useMemo(
    () =>
      visibleModules.filter(
        (module) =>
          module.group === activeModule?.group &&
          module.sectionLabel === activeModule?.sectionLabel &&
          module.id !== activeModule?.id,
      ),
    [activeModule?.group, activeModule?.id, activeModule?.sectionLabel, visibleModules],
  )
  const sectionOverview = useMemo(() => {
    const moduleSet = activeModule?.group === 'operations' ? operationsModules : backofficeModules
    const sections = Array.from(new Set(moduleSet.map((module) => module.sectionLabel)))

    return sections.join(' / ')
  }, [activeModule?.group, backofficeModules, operationsModules])

  const breadcrumbTrail = [
    { label: 'Backoffice', href: '/dashboard' },
    { label: activeModule?.group === 'operations' ? 'Operacion' : 'Administracion' },
    { label: activeModule?.sectionLabel ?? 'General' },
    { label: activeModule?.label ?? 'Dashboard' },
  ]
  const accountInitials = buildAccountInitials(user?.email)

  const renderModuleGroup = (
    title: string,
    modules: typeof visibleModules,
    sectionSummary: string,
  ) => {
    const groupedSections = Array.from(new Set(modules.map((module) => module.sectionLabel))).map(
      (sectionLabel) => ({
        sectionLabel,
        items: modules.filter((module) => module.sectionLabel === sectionLabel),
      }),
    )

    return (
      <section className="sidebar__section">
        <div className="sidebar__section-header">
          <p className="sidebar__section-title">{title}</p>
          <span className="sidebar__section-meta">{sectionSummary}</span>
        </div>

        {groupedSections.map((section) => (
          <div key={section.sectionLabel} className="sidebar__cluster">
            <p className="sidebar__cluster-title">{section.sectionLabel}</p>
            {section.items.map((module) => (
              <NavLink
                key={module.id}
                to={module.path}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`.trim()
                }
                title={module.label}
              >
                <span className="sidebar__link-badge" aria-hidden="true">
                  {module.navBadge}
                </span>
                <span className="sidebar__link-copy">
                  <strong>{module.label}</strong>
                  <span>{module.description}</span>
                </span>
              </NavLink>
            ))}
          </div>
        ))}
      </section>
    )
  }

  return (
    <div className={`app-layout ${isSidebarCompact ? 'app-layout--compact' : ''}`.trim()}>
      <aside className="sidebar web-shell__sidebar">
        <div className="sidebar__scroll">
          <div
            className={`sidebar__brand ${isSidebarCompact ? 'sidebar__brand--compact' : ''}`.trim()}
          >
            <div className="sidebar__brand-top">
              <div>
                <p className="sidebar__eyebrow">Backoffice minimarket</p>
                <h1>{business?.name ?? 'Negocio activo'}</h1>
              </div>
              <button
                type="button"
                className="sidebar__toggle"
                onClick={() => {
                  setIsSidebarCompact((current) => !current)
                }}
                aria-label={isSidebarCompact ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
                title={isSidebarCompact ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
              >
                <span
                  className={`sidebar__toggle-icon ${
                    isSidebarCompact
                      ? 'sidebar__toggle-icon--expand'
                      : 'sidebar__toggle-icon--collapse'
                  }`.trim()}
                  aria-hidden="true"
                />
              </button>
            </div>
            <span>
              Panel administrativo y documental de escritorio, separado de la operacion movil.
            </span>
          </div>

          <nav className="sidebar__nav" aria-label="Navegacion principal">
            {renderModuleGroup(
              'Administracion',
              backofficeModules,
              `${backofficeModules.length} modulos`,
            )}

            {operationsModules.length
              ? renderModuleGroup('Operacion', operationsModules, `${operationsModules.length} modulos`)
              : null}
          </nav>

          <section
            className={`surface-card web-shell__account ${isSidebarCompact ? 'web-shell__account--compact' : ''}`.trim()}
          >
            <div className="web-shell__account-header">
              <span className="web-shell__account-avatar" aria-hidden="true">
                {accountInitials}
              </span>
              <div className="web-shell__account-copy">
                <p className="section-kicker">Sesion</p>
                <h3>{user?.email ?? 'Usuario autenticado'}</h3>
                <p>Rol actual: {currentRole ?? 'sin rol'}</p>
              </div>
            </div>
            <Button
              className="web-shell__account-button"
              variant="secondary"
              onClick={() => {
                void signOut()
              }}
              fullWidth
              title="Cerrar sesion"
            >
              {isSidebarCompact ? 'Salir' : 'Cerrar sesion'}
            </Button>
          </section>
        </div>
      </aside>

      <main className="content-area">
        <header className="topbar">
          <div className="topbar__context">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              {breadcrumbTrail.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} className="breadcrumbs__item">
                  {crumb.href ? <NavLink to={crumb.href}>{crumb.label}</NavLink> : crumb.label}
                </span>
              ))}
            </nav>

            <p className="section-kicker">{activeModule?.accent ?? 'Panel'}</p>
            <h2>{activeModule?.label ?? 'Dashboard'}</h2>
            <p>{activeModule?.description ?? 'Vista general administrativa del negocio.'}</p>

            <div className="topbar__meta-grid">
              <div className="topbar__meta-card">
                <span>Area</span>
                <strong>{activeModule?.group === 'operations' ? 'Operacion' : 'Administracion'}</strong>
                <p>{sectionOverview || 'Panel principal del negocio.'}</p>
              </div>
              <div className="topbar__meta-card">
                <span>Seccion</span>
                <strong>{activeModule?.sectionLabel ?? 'General'}</strong>
                <p>Modulo actual listo para trabajo de escritorio y consulta rapida.</p>
              </div>
            </div>
          </div>

          <div className="topbar__side">
            <div className="topbar__status">
              <span className="status-chip">Backoffice protegido</span>
              <span className="status-chip status-chip--muted">
                {business?.legalName ?? 'Sin razon social'}
              </span>
              <span className="status-chip status-chip--outline">
                {activeModule?.group === 'operations' ? 'Operacion' : 'Administracion'}
              </span>
            </div>

            {activeSectionModules.length ? (
              <div className="topbar__quick-links" aria-label="Accesos rapidos de la seccion">
                <span className="topbar__quick-links-title">Accesos rapidos</span>
                <div className="topbar__quick-links-list">
                  {activeSectionModules.slice(0, 3).map((module) => (
                    <NavLink key={module.id} to={module.path} className="topbar__quick-link">
                      <span className="topbar__quick-link-badge" aria-hidden="true">
                        {module.navBadge}
                      </span>
                      {module.shortLabel}
                    </NavLink>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <div className="content-area__inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
