import type { ComponentType, ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useWebAuth } from './auth/AuthProvider'
import { WebAppShell } from './layout/AppShell'
import {
  canAccessWebModule,
  type WebModuleId,
  webModules,
} from './navigation/modules'
import { AuthPage } from './pages/AuthPage'
import { BusinessOnboardingPage } from './pages/BusinessOnboardingPage'
import { CashPage } from './pages/CashPage'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { ClientUpsertPage } from './pages/ClientUpsertPage'
import { CreditNoteDetailPage } from './pages/CreditNoteDetailPage'
import { CreditNoteUpsertPage } from './pages/CreditNoteUpsertPage'
import { ClientsPage } from './pages/ClientsPage'
import { CreditNotesPage } from './pages/CreditNotesPage'
import { DashboardPage } from './pages/DashboardPage'
import { EmployeeDetailPage } from './pages/EmployeeDetailPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { EmployeeUpsertPage } from './pages/EmployeeUpsertPage'
import { InventoryPage } from './pages/InventoryPage'
import { InvitationAcceptancePage } from './pages/InvitationAcceptancePage'
import { IssuedDocumentDetailPage } from './pages/IssuedDocumentDetailPage'
import { IssuedDocumentUpsertPage } from './pages/IssuedDocumentUpsertPage'
import { IssuedDocumentsPage } from './pages/IssuedDocumentsPage'
import { LoadingPage } from './pages/LoadingPage'
import { ProductsPage } from './pages/ProductsPage'
import { ReceivedDocumentDetailPage } from './pages/ReceivedDocumentDetailPage'
import { ReceivedDocumentUpsertPage } from './pages/ReceivedDocumentUpsertPage'
import { ReceivedDocumentsPage } from './pages/ReceivedDocumentsPage'
import { ReportsPage } from './pages/ReportsPage'
import { RolePermissionsPage } from './pages/RolePermissionsPage'
import { RolesPage } from './pages/RolesPage'
import { RoleUpsertPage } from './pages/RoleUpsertPage'
import { SalesPage } from './pages/SalesPage'
import { SettingsPage } from './pages/SettingsPage'
import { SupplierDetailPage } from './pages/SupplierDetailPage'
import { SupplierUpsertPage } from './pages/SupplierUpsertPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { TeamPage } from './pages/TeamPage'
import { useWebWorkspace } from './workspace/WorkspaceProvider'

const modulePages: Record<WebModuleId, ComponentType> = {
  dashboard: DashboardPage,
  clients: ClientsPage,
  suppliers: SuppliersPage,
  employees: EmployeesPage,
  roles: RolesPage,
  'received-documents': ReceivedDocumentsPage,
  'issued-documents': IssuedDocumentsPage,
  'credit-notes': CreditNotesPage,
  reports: ReportsPage,
  settings: SettingsPage,
  team: TeamPage,
  sales: SalesPage,
  products: ProductsPage,
  inventory: InventoryPage,
  cash: CashPage,
}

const toChildPath = (path: string) => path.replace(/^\//, '')

export function WebAppRouter() {
  const { isAuthenticated, isLoading: isAuthLoading } = useWebAuth()
  const {
    business,
    pendingInvitations,
    isLoading: isWorkspaceLoading,
    hasPermission,
    currentRole,
  } = useWebWorkspace()

  const canAccess = (moduleId: WebModuleId) => {
    const module = webModules.find((item) => item.id === moduleId)
    if (!module) {
      return false
    }

    return canAccessWebModule(module, { currentRole, hasPermission })
  }

  const visibleModules = webModules.filter((module) =>
    canAccessWebModule(module, { currentRole, hasPermission }),
  )
  const defaultRoute = visibleModules.find((module) => module.id === 'dashboard') ?? visibleModules[0]
  const shouldBlockForWorkspace =
    isWorkspaceLoading && !business && pendingInvitations.length === 0

  return (
    <BrowserRouter>
      {!isAuthenticated ? (
        isAuthLoading ? (
          <LoadingPage message="Cargando sesion..." />
        ) : (
          <Routes>
            <Route path="*" element={<AuthPage />} />
          </Routes>
        )
      ) : shouldBlockForWorkspace ? (
        <LoadingPage message="Preparando tu negocio..." />
      ) : pendingInvitations.length ? (
        <Routes>
          <Route path="*" element={<InvitationAcceptancePage />} />
        </Routes>
      ) : !business ? (
        <Routes>
          <Route path="*" element={<BusinessOnboardingPage />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/" element={<WebAppShell />}>
            <Route
              index
              element={<Navigate to={defaultRoute?.path ?? '/dashboard'} replace />}
            />
            {webModules.map((module) => (
              <Route
                key={module.id}
                path={toChildPath(module.path)}
                element={
                  canAccess(module.id) ? (
                    (() => {
                      const ModulePage = modulePages[module.id]
                      return <ModulePage />
                    })()
                  ) : (
                    <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                  )
                }
              />
            ))}
            <Route
              path="credit-notes/new"
              element={
                canAccess('credit-notes') ? (
                  <CreditNoteUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="credit-notes/:noteId"
              element={
                canAccess('credit-notes') ? (
                  <CreditNoteDetailPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="credit-notes/:noteId/edit"
              element={
                canAccess('credit-notes') ? (
                  <CreditNoteUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="issued-documents/new"
              element={
                canAccess('issued-documents') ? (
                  <IssuedDocumentUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="issued-documents/:documentId"
              element={
                canAccess('issued-documents') ? (
                  <IssuedDocumentDetailPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="issued-documents/:documentId/edit"
              element={
                canAccess('issued-documents') ? (
                  <IssuedDocumentUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="employees/new"
              element={
                canAccess('employees') ? (
                  <EmployeeUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="employees/:employeeId"
              element={
                canAccess('employees') ? (
                  <EmployeeDetailPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="employees/:employeeId/edit"
              element={
                canAccess('employees') ? (
                  <EmployeeUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="roles/new"
              element={
                canAccess('roles') ? (
                  <RoleUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="roles/:roleId/edit"
              element={
                canAccess('roles') ? (
                  <RoleUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="roles/:roleId/permissions"
              element={
                canAccess('roles') ? (
                  <RolePermissionsPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="received-documents/new"
              element={
                canAccess('received-documents') ? (
                  <ReceivedDocumentUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="received-documents/:documentId"
              element={
                canAccess('received-documents') ? (
                  <ReceivedDocumentDetailPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="received-documents/:documentId/edit"
              element={
                canAccess('received-documents') ? (
                  <ReceivedDocumentUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="clients/new"
              element={
                canAccess('clients') ? (
                  <ClientUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="clients/:clientId"
              element={
                canAccess('clients') ? (
                  <ClientDetailPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="clients/:clientId/edit"
              element={
                canAccess('clients') ? (
                  <ClientUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="suppliers/new"
              element={
                canAccess('suppliers') ? (
                  <SupplierUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="suppliers/:supplierId"
              element={
                canAccess('suppliers') ? (
                  <SupplierDetailPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="suppliers/:supplierId/edit"
              element={
                canAccess('suppliers') ? (
                  <SupplierUpsertPage />
                ) : (
                  <Navigate to={defaultRoute?.path ?? '/dashboard'} replace />
                )
              }
            />
            <Route
              path="*"
              element={<Navigate to={defaultRoute?.path ?? '/dashboard'} replace />}
            />
          </Route>
        </Routes>
      )}
    </BrowserRouter>
  )
}
