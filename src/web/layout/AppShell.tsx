import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import {
  canAccessWebModule,
  getWebModuleByPath,
  webModules,
  webNavigationAreas,
} from '../navigation/modules'
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

const SIDEBAR_EXPANDED_BREAKPOINT = 1280
const SIDEBAR_MOBILE_BREAKPOINT = 960
const MOBILE_PRIORITY_MODULES = ['sales', 'cash', 'products', 'inventory'] as const

export function WebAppShell() {
  const location = useLocation()
  const { signOut, user } = useWebAuth()
  const { business, currentRole, hasPermission } = useWebWorkspace()
  const [isSidebarCompact, setIsSidebarCompact] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [areaOpenState, setAreaOpenState] = useState<Record<string, boolean>>({})
  const [hasLoadedAreaState, setHasLoadedAreaState] = useState(false)

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

    const syncViewportState = () => {
      setIsMobileViewport(window.innerWidth < SIDEBAR_MOBILE_BREAKPOINT)
    }

    syncViewportState()
    window.addEventListener('resize', syncViewportState)

    return () => {
      window.removeEventListener('resize', syncViewportState)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem('web-shell-sidebar-compact', String(isSidebarCompact))
  }, [isSidebarCompact])

  useEffect(() => {
    if (!isMobileViewport && isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false)
    }
  }, [isMobileSidebarOpen, isMobileViewport])

  const canAccessModule = (module: (typeof webModules)[number]) =>
    canAccessWebModule(module, { currentRole, hasPermission })

  const visibleModules = webModules.filter(canAccessModule)
  const navigationAreas = useMemo(
    () =>
      webNavigationAreas
        .map((area) => ({
          ...area,
          modules: visibleModules.filter((module) => module.areaId === area.id),
        }))
        .filter((area) => area.modules.length),
    [visibleModules],
  )

  const activeModule = getWebModuleByPath(location.pathname) ?? visibleModules[0]
  const activeArea =
    navigationAreas.find((area) => area.id === activeModule?.areaId) ?? navigationAreas[0]
  const activeAreaModules = activeArea?.modules ?? []
  const activeSectionModules = useMemo(
    () => activeAreaModules.filter((module) => module.id !== activeModule?.id),
    [activeAreaModules, activeModule?.id],
  )
  const areaSectionSummary = useMemo(() => {
    const sections = Array.from(new Set(activeAreaModules.map((module) => module.sectionLabel)))

    return sections.join(' / ')
  }, [activeAreaModules])
  const mobilePriorityLinks = useMemo(
    () =>
      MOBILE_PRIORITY_MODULES.map((moduleId) => visibleModules.find((module) => module.id === moduleId)).filter(
        Boolean,
      ),
    [visibleModules],
  )

  const breadcrumbTrail = [
    { label: 'Minimarket', href: '/dashboard' },
    { label: activeArea?.label ?? 'Panel' },
    { label: activeModule?.sectionLabel ?? 'General' },
    { label: activeModule?.label ?? 'Panel' },
  ]
  const accountInitials = buildAccountInitials(user?.email)
  const sidebarAreaStorageKey = `web-shell-area-state:${(user?.email ?? 'anon').toLowerCase()}`

  useEffect(() => {
    if (typeof window === 'undefined' || !navigationAreas.length) {
      return
    }

    const isWideLayout = window.innerWidth >= SIDEBAR_EXPANDED_BREAKPOINT
    const defaultState = Object.fromEntries(
      navigationAreas.map((area) => [area.id, isWideLayout || area.id === activeArea?.id]),
    )
    const storedValue = window.localStorage.getItem(sidebarAreaStorageKey)

    if (!storedValue) {
      setAreaOpenState(defaultState)
      setHasLoadedAreaState(true)
      return
    }

    try {
      const parsedValue = JSON.parse(storedValue) as Record<string, boolean>
      setAreaOpenState({
        ...defaultState,
        ...parsedValue,
        ...(activeArea ? { [activeArea.id]: true } : {}),
      })
    } catch {
      setAreaOpenState(defaultState)
    }

    setHasLoadedAreaState(true)
  }, [activeArea?.id, navigationAreas, sidebarAreaStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined' || !hasLoadedAreaState) {
      return
    }

    window.localStorage.setItem(sidebarAreaStorageKey, JSON.stringify(areaOpenState))
  }, [areaOpenState, hasLoadedAreaState, sidebarAreaStorageKey])

  useEffect(() => {
    if (!activeArea || !hasLoadedAreaState) {
      return
    }

    setAreaOpenState((current) => {
      if (current[activeArea.id]) {
        return current
      }

      return {
        ...current,
        [activeArea.id]: true,
      }
    })
  }, [activeArea, hasLoadedAreaState])

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return
    }

    setIsMobileSidebarOpen(false)
  }, [location.pathname])

  const renderAreaGroup = (area: (typeof navigationAreas)[number]) => {
    const groupedSections = Array.from(new Set(area.modules.map((module) => module.sectionLabel))).map(
      (sectionLabel) => ({
        sectionLabel,
        items: area.modules.filter((module) => module.sectionLabel === sectionLabel),
      }),
    )
    const shouldShowSectionTitle =
      groupedSections.length > 1 ||
      groupedSections.some((section) => section.sectionLabel.toLowerCase() !== area.label.toLowerCase())
    const isAreaOpen = areaOpenState[area.id] ?? area.id === activeArea?.id
    const isAreaActive = area.id === activeArea?.id
    const primaryModule = area.modules[0]
    const shouldShowAreaToggle = area.modules.length > 1

    return (
      <section
        key={area.id}
        className={`sidebar__section ${isAreaOpen ? 'sidebar__section--open' : 'sidebar__section--closed'} ${isAreaActive ? 'sidebar__section--active' : ''}`.trim()}
      >
        <div className="sidebar__section-header">
          <NavLink
            to={primaryModule.path}
            className={({ isActive }) =>
              `sidebar__section-trigger ${isActive ? 'sidebar__section-trigger--active' : ''}`.trim()
            }
            title={area.label}
            aria-label={area.label}
            onClick={() => {
              if (isMobileViewport) {
                setIsMobileSidebarOpen(false)
              }
            }}
          >
            <span className="sidebar__section-heading">
              <span className="sidebar__section-title">{area.label}</span>
              <span className="sidebar__section-meta">{area.description}</span>
            </span>
          </NavLink>

          {shouldShowAreaToggle ? (
            <button
              type="button"
              className="sidebar__section-toggle"
              onClick={() => {
                setAreaOpenState((current) => ({
                  ...current,
                  [area.id]: !(current[area.id] ?? area.id === activeArea?.id),
                }))
              }}
              aria-expanded={isAreaOpen}
              aria-controls={`sidebar-area-${area.id}`}
              aria-label={isAreaOpen ? `Ocultar ${area.label}` : `Mostrar ${area.label}`}
            >
              <span
                className={`sidebar__section-chevron ${isAreaOpen ? 'sidebar__section-chevron--open' : ''}`.trim()}
                aria-hidden="true"
              />
            </button>
          ) : null}
        </div>

        <div
          id={`sidebar-area-${area.id}`}
          className={`sidebar__section-body ${shouldShowAreaToggle ? '' : 'sidebar__section-body--static'}`.trim()}
        >
          {groupedSections.map((section) => (
            <div key={section.sectionLabel} className="sidebar__cluster">
              {shouldShowSectionTitle ? (
                <p className="sidebar__cluster-title">{section.sectionLabel}</p>
              ) : null}
              {section.items.map((module) => (
                <NavLink
                  key={module.id}
                  to={module.path}
                  onClick={() => {
                    if (isMobileViewport) {
                      setIsMobileSidebarOpen(false)
                    }
                  }}
                  className={({ isActive }) =>
                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`.trim()
                  }
                  title={module.label}
                  aria-label={`${module.label}. ${module.description}`}
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
        </div>
      </section>
    )
  }

  return (
    <div className={`app-layout ${isSidebarCompact ? 'app-layout--compact' : ''}`.trim()}>
      {isMobileViewport && isMobileSidebarOpen ? (
        <button
          type="button"
          className="web-shell__sidebar-backdrop"
          onClick={() => {
            setIsMobileSidebarOpen(false)
          }}
          aria-label="Cerrar navegación lateral"
        />
      ) : null}

      <aside
        id="web-sidebar-navigation"
        className={`sidebar web-shell__sidebar ${
          isMobileSidebarOpen ? 'web-shell__sidebar--mobile-open' : ''
        }`.trim()}
        aria-hidden={isMobileViewport && !isMobileSidebarOpen}
      >
        <div className="sidebar__scroll">
          <div
            className={`sidebar__brand ${isSidebarCompact ? 'sidebar__brand--compact' : ''}`.trim()}
          >
            <div className="sidebar__brand-top">
              <div>
                <p className="sidebar__eyebrow">ERP web minimarket</p>
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
              <button
                type="button"
                className="web-shell__mobile-close"
                onClick={() => {
                  setIsMobileSidebarOpen(false)
                }}
                aria-label="Cerrar menú"
              >
                Cerrar
              </button>
            </div>
            <span>
              Navegación ordenada por flujos reales del negocio para vender, abastecer y gestionar.
            </span>
          </div>

          <nav className="sidebar__nav" aria-label="Navegación principal">
            {navigationAreas.map((area) => renderAreaGroup(area))}
          </nav>

          <section
            className={`surface-card web-shell__account ${isSidebarCompact ? 'web-shell__account--compact' : ''}`.trim()}
          >
            <div className="web-shell__account-header">
              <span className="web-shell__account-avatar" aria-hidden="true">
                {accountInitials}
              </span>
              <div className="web-shell__account-copy">
                <p className="section-kicker">Sesión</p>
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
              title="Cerrar sesión"
            >
              {isSidebarCompact ? 'Salir' : 'Cerrar sesión'}
            </Button>
          </section>
        </div>
      </aside>

      <main className="content-area">
        <header className="topbar">
          <div className="topbar__mobile-bar">
            <button
              type="button"
              className="topbar__menu-button"
              onClick={() => {
                setIsMobileSidebarOpen(true)
              }}
              aria-expanded={isMobileSidebarOpen}
              aria-controls="web-sidebar-navigation"
            >
              Menú
            </button>

            {mobilePriorityLinks.length ? (
              <div className="topbar__mobile-shortcuts" aria-label="Accesos rapidos principales">
                {mobilePriorityLinks.map((module) => (
                  <NavLink key={module.id} to={module.path} className="topbar__mobile-shortcut">
                    <span aria-hidden="true">{module.navBadge}</span>
                    {module.shortLabel}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>

          <div className="topbar__context">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              {breadcrumbTrail.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`} className="breadcrumbs__item">
                  {crumb.href ? <NavLink to={crumb.href}>{crumb.label}</NavLink> : crumb.label}
                </span>
              ))}
            </nav>

            <p className="section-kicker">{activeModule?.accent ?? 'Panel'}</p>
            <h2>{activeModule?.label ?? 'Panel'}</h2>
            <p>{activeModule?.description ?? 'Vista general del negocio.'}</p>

            <div className="topbar__meta-grid">
              <div className="topbar__meta-card">
                <span>Area</span>
                <strong>{activeArea?.label ?? 'Panel'}</strong>
                <p>{activeArea?.description ?? 'Panel principal del negocio.'}</p>
              </div>
              <div className="topbar__meta-card">
                <span>Sección</span>
                <strong>{activeModule?.sectionLabel ?? 'General'}</strong>
                <p>{areaSectionSummary || 'Módulo actual listo para el trabajo diario.'}</p>
              </div>
            </div>
          </div>

          <div className="topbar__side">
            <div className="topbar__status">
              <span className="status-chip">ERP web activo</span>
              <span className="status-chip status-chip--muted">
                {business?.legalName ?? 'Sin razón social'}
              </span>
              <span className="status-chip status-chip--outline">
                {activeArea?.label ?? 'Panel'}
              </span>
            </div>

            {activeSectionModules.length ? (
              <div className="topbar__quick-links" aria-label="Accesos rápidos del área">
                <span className="topbar__quick-links-title">Más en esta área</span>
                <div className="topbar__quick-links-list">
                  {activeSectionModules.slice(0, 4).map((module) => (
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
