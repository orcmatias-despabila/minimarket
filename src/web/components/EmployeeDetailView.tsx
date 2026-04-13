import { AdminEmptyState } from './AdminEmptyState'
import { EmployeeAccessPanel, type EmployeeAccessFormValues } from './EmployeeAccessPanel'
import type { AdminEmployee } from '../types/adminEmployee'
import type { AdminRole } from '../types/adminRole'
import type { AdminPermission } from '../types/adminPermission'
import type { AdminEmployeeAccess } from '../types/adminEmployeeAccess'

const buildInitials = (name: string) =>
  name
    .split(' ')
    .map((item) => item.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

type EmployeeDetailTab = 'personal' | 'job' | 'education' | 'health' | 'documents' | 'access'

interface EmployeeDetailViewProps {
  employee: AdminEmployee | null
  activeTab: EmployeeDetailTab
  onTabChange: (tab: EmployeeDetailTab) => void
  roles: AdminRole[]
  permissions: AdminPermission[]
  access?: AdminEmployeeAccess | null
  accessError?: string | null
  accessFeedback?: string | null
  isSavingAccess?: boolean
  onSaveAccess: (values: EmployeeAccessFormValues) => void
  onActivateAccess: (values: EmployeeAccessFormValues) => void
  onSuspendAccess: () => void
}

const tabOptions: Array<{ id: EmployeeDetailTab; label: string }> = [
  { id: 'personal', label: 'Personal' },
  { id: 'job', label: 'Laboral' },
  { id: 'education', label: 'Formacion' },
  { id: 'health', label: 'Salud' },
  { id: 'documents', label: 'Documentos' },
  { id: 'access', label: 'Acceso' },
]

const renderEmptyTab = (title: string, description: string) => (
  <AdminEmptyState compact title={title} description={description} />
)

export function EmployeeDetailView({
  employee,
  activeTab,
  onTabChange,
  roles,
  permissions,
  access,
  accessError,
  accessFeedback,
  isSavingAccess = false,
  onSaveAccess,
  onActivateAccess,
  onSuspendAccess,
}: EmployeeDetailViewProps) {
  if (!employee) {
    return (
      <AdminEmptyState
        compact
        title="No encontramos este trabajador."
        description="La ficha puede haber sido eliminada, archivada o no pertenecer a tu negocio activo."
      />
    )
  }

  const currentAccess = access ?? employee.currentAccess ?? null
  const currentRole = roles.find((role) => role.id === currentAccess?.roleId)
  const assignedPermissionCount = currentRole?.permissionCount ?? 0

  return (
    <div className="employee-detail">
      <div className="employee-detail__hero">
        <div className="employee-detail__avatar">{buildInitials(employee.fullName)}</div>
        <div className="employee-detail__hero-copy">
          <strong>{employee.fullName}</strong>
          <p>{employee.taxId}</p>
          <div className="employee-detail__chips">
            <span className="status-chip">{employee.status === 'active' ? 'Activo' : employee.status}</span>
            <span className="status-chip status-chip--muted">
              {employee.currentJob?.jobTitle || 'Sin cargo'}
            </span>
            <span className="status-chip status-chip--outline">
              {currentAccess?.accessStatus === 'active'
                ? 'Acceso activo'
                : currentAccess?.accessStatus === 'pending'
                  ? 'Acceso pendiente'
                  : currentAccess?.accessStatus === 'suspended'
                    ? 'Acceso suspendido'
                    : currentAccess?.accessStatus === 'revoked'
                      ? 'Acceso revocado'
                      : 'Sin acceso'}
            </span>
          </div>
        </div>
      </div>

      <div className="employee-detail__tabs" role="tablist" aria-label="Secciones del trabajador">
        {tabOptions.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            className={`employee-detail__tab ${tab.id === activeTab ? 'employee-detail__tab--active' : ''}`.trim()}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'personal' ? (
        <div className="settings-summary employee-detail__summary">
          <div>
            <span>Nombre preferido</span>
            <strong>{employee.preferredName || 'No informado'}</strong>
          </div>
          <div>
            <span>Correo</span>
            <strong>{employee.personalEmail || 'Sin correo'}</strong>
          </div>
          <div>
            <span>Telefono</span>
            <strong>{employee.phone || 'Sin telefono'}</strong>
          </div>
          <div>
            <span>Fecha nacimiento</span>
            <strong>{employee.birthDate || 'No informada'}</strong>
          </div>
          <div>
            <span>Emergencia</span>
            <strong>{employee.emergencyContactName || 'No informado'}</strong>
          </div>
          <div>
            <span>Telefono emergencia</span>
            <strong>{employee.emergencyContactPhone || 'No informado'}</strong>
          </div>
          <div>
            <span>Comuna / ciudad</span>
            <strong>
              {[employee.commune, employee.city].filter(Boolean).join(', ') || 'No informado'}
            </strong>
          </div>
          <div>
            <span>Direccion</span>
            <strong>{employee.addressLine1 || 'No informada'}</strong>
          </div>
        </div>
      ) : null}

      {activeTab === 'job' ? (
        <div className="settings-summary employee-detail__summary">
          <div>
            <span>Cargo</span>
            <strong>{employee.currentJob?.jobTitle || 'No informado'}</strong>
          </div>
          <div>
            <span>Area</span>
            <strong>{employee.currentJob?.department || 'No informada'}</strong>
          </div>
          <div>
            <span>Tipo</span>
            <strong>{employee.currentJob?.employmentType || 'No informado'}</strong>
          </div>
          <div>
            <span>Sucursal</span>
            <strong>{employee.currentJob?.branchName || 'No informada'}</strong>
          </div>
          <div>
            <span>Ingreso</span>
            <strong>{employee.currentJob?.hireDate || 'No informado'}</strong>
          </div>
          <div>
            <span>Turno</span>
            <strong>{employee.currentJob?.shiftName || 'No informado'}</strong>
          </div>
          <div>
            <span>Horas semanales</span>
            <strong>{employee.currentJob?.weeklyHours ?? 'No informado'}</strong>
          </div>
          <div>
            <span>Moneda</span>
            <strong>{employee.currentJob?.salaryCurrency || 'CLP'}</strong>
          </div>
          <div>
            <span>Sueldo base</span>
            <strong>{employee.currentJob?.baseSalary ?? 'No informado'}</strong>
          </div>
          <div>
            <span>Variable</span>
            <strong>{employee.currentJob?.variableSalary ?? 'No informado'}</strong>
          </div>
        </div>
      ) : null}

      {activeTab === 'education'
        ? renderEmptyTab(
            'Sin registros de formacion',
            'La base ya esta preparada para estudios, capacitaciones y habilidades del trabajador.',
          )
        : null}

      {activeTab === 'health'
        ? renderEmptyTab(
            'Sin registros de salud',
            'Esta seccion permitira gestionar antecedentes de salud ocupacional cuando habilitemos esa ficha.',
          )
        : null}

      {activeTab === 'documents'
        ? renderEmptyTab(
            'Sin documentos cargados',
            'Aqui apareceran contratos, anexos y archivos relacionados al trabajador.',
          )
        : null}

      {activeTab === 'access' ? (
        <EmployeeAccessPanel
          access={
            currentAccess
              ? {
                  ...currentAccess,
                  roleName: currentRole?.name || currentAccess.roleName,
                }
              : null
          }
          roles={roles}
          permissionsCount={Math.max(assignedPermissionCount, permissions.length)}
          isSubmitting={isSavingAccess}
          error={accessError}
          feedback={accessFeedback}
          onSave={onSaveAccess}
          onActivate={onActivateAccess}
          onSuspend={onSuspendAccess}
        />
      ) : null}

      <div className="employee-detail__notes">
        <span>Observaciones</span>
        <p>{employee.notes || 'Sin observaciones registradas.'}</p>
      </div>
    </div>
  )
}
