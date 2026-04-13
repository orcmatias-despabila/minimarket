import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { AdminBackHeader } from '../components/AdminBackHeader'
import { EmployeeDetailView } from '../components/EmployeeDetailView'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import type { EmployeeAccessFormValues } from '../components/EmployeeAccessPanel'
import { adminAuditService } from '../services/adminAudit.service'
import { adminEmployeeAccessService } from '../services/adminEmployeeAccess.service'
import { adminEmployeesService } from '../services/adminEmployees.service'
import { adminPermissionsService } from '../services/adminPermissions.service'
import { adminRolesService } from '../services/adminRoles.service'
import type { AdminEmployee } from '../types/adminEmployee'
import type { AdminEmployeeAccess } from '../types/adminEmployeeAccess'
import type { AdminPermission } from '../types/adminPermission'
import type { AdminRole } from '../types/adminRole'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

type EmployeeDetailTab = 'personal' | 'job' | 'education' | 'health' | 'documents' | 'access'

type LocationFeedbackState = {
  feedback?: string
} | null

const isEmployeeDetailTab = (value: string | null): value is EmployeeDetailTab =>
  value === 'personal' ||
  value === 'job' ||
  value === 'education' ||
  value === 'health' ||
  value === 'documents' ||
  value === 'access'

export function EmployeeDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { business } = useWebWorkspace()
  const { employeeId } = useParams<{ employeeId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [employee, setEmployee] = useState<AdminEmployee | null>(null)
  const [access, setAccess] = useState<AdminEmployeeAccess | null>(null)
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [accessFeedback, setAccessFeedback] = useState<string | null>(null)
  const [isSavingAccess, setIsSavingAccess] = useState(false)

  const feedback = (location.state as LocationFeedbackState)?.feedback ?? null
  const returnTo = searchParams.get('returnTo') || '/employees'
  const activeTab = isEmployeeDetailTab(searchParams.get('tab'))
    ? (searchParams.get('tab') as EmployeeDetailTab)
    : 'personal'

  useEffect(() => {
    const loadEmployee = async () => {
      if (!employeeId) {
        setError('No encontramos el trabajador solicitado.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      setAccessError(null)

      try {
        const [detail, accessDetail, rolesResult, permissionsResult] = await Promise.all([
          adminEmployeesService.getById(employeeId),
          adminEmployeeAccessService.getByEmployeeId(employeeId),
          business?.id
            ? adminRolesService.list({ businessId: business.id, status: 'all', page: 1, pageSize: 100 })
            : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100, hasMore: false }),
          business?.id
            ? adminPermissionsService.listByBusiness(business.id)
            : Promise.resolve([]),
        ])

        if (!detail) {
          setEmployee(null)
          setError('No encontramos el trabajador solicitado.')
          return
        }

        setEmployee(detail)
        setAccess(accessDetail)
        setRoles(rolesResult.items)
        setPermissions(permissionsResult)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No pudimos cargar la ficha del trabajador.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadEmployee()
  }, [business?.id, employeeId])

  const handleTabChange = (tab: EmployeeDetailTab) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }

  const handleAccessMutation = async (
    action: 'save' | 'activate' | 'suspend',
    values?: EmployeeAccessFormValues,
  ) => {
    if (!business?.id || !employeeId) {
      setAccessError('Necesitas un negocio activo y un trabajador valido para administrar accesos.')
      return
    }

    setIsSavingAccess(true)
    setAccessError(null)
    setAccessFeedback(null)

    try {
      const previousAccess = access
      let updatedAccess: AdminEmployeeAccess

      if (action === 'suspend') {
        updatedAccess = await adminEmployeeAccessService.deactivateAccess(employeeId)
      } else if (action === 'activate') {
        updatedAccess = await adminEmployeeAccessService.activateAccess(employeeId, {
          businessId: business.id,
          employeeId,
          roleId: values?.roleId,
          userId: values?.userId,
          email: values?.email,
          accessStatus: 'active',
          passwordlessOnly: values?.passwordlessOnly,
          mustRotateAccess: values?.mustRotateAccess,
          notes: values?.notes,
        })
      } else {
        updatedAccess = await adminEmployeeAccessService.linkToAuthUser({
          businessId: business.id,
          employeeId,
          roleId: values?.roleId,
          userId: values?.userId,
          email: values?.email,
          accessStatus: values?.accessStatus ?? 'suspended',
          passwordlessOnly: values?.passwordlessOnly,
          mustRotateAccess: values?.mustRotateAccess,
          notes: values?.notes,
        })
      }

      setAccess(updatedAccess)
      setAccessFeedback(
        action === 'activate'
          ? 'Acceso activado y vinculado correctamente.'
          : action === 'suspend'
            ? 'Acceso suspendido correctamente.'
            : 'Configuracion de acceso actualizada correctamente.',
      )

      await adminAuditService.recordEventSafely({
        businessId: business.id,
        entityType: 'other',
        entityId: updatedAccess.id,
        actionType: 'updated',
        previousData: previousAccess,
        newData: updatedAccess,
      })
    } catch (mutationError) {
      setAccessError(
        mutationError instanceof Error
          ? mutationError.message
          : 'No pudimos actualizar el acceso del trabajador.',
      )
    } finally {
      setIsSavingAccess(false)
    }
  }

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Personal"
          title={employee?.fullName || 'Ficha del trabajador'}
          description="Vista individual del trabajador para revisar datos personales, laborales y de acceso."
          onBack={() => navigate(returnTo)}
          actions={
            employee ? (
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(
                    `/employees/${employee.id}/edit?returnTo=${encodeURIComponent(returnTo)}`,
                  )
                }
              >
                Editar trabajador
              </Button>
            ) : null
          }
        />

        {feedback ? <AdminNotice tone="success">{feedback}</AdminNotice> : null}
        {isLoading ? <AdminLoadingBlock label="Cargando ficha del trabajador" /> : null}
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {!isLoading && !error ? (
          <EmployeeDetailView
            employee={employee}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            roles={roles}
            permissions={permissions}
            access={access}
            accessError={accessError}
            accessFeedback={accessFeedback}
            isSavingAccess={isSavingAccess}
            onSaveAccess={(values) => void handleAccessMutation('save', values)}
            onActivateAccess={(values) => void handleAccessMutation('activate', values)}
            onSuspendAccess={() => void handleAccessMutation('suspend')}
          />
        ) : null}
      </div>
    </section>
  )
}
