import { Button } from '../../components/ui/Button'
import {
  adminPermissionMatrixActions,
  buildAdminPermissionMatrix,
  getAdvancedPermissions,
  getAdminPermissionActionLabel,
} from '../lib/adminPermissionMatrix'
import type { AdminPermission } from '../types/adminPermission'

interface RolePermissionsMatrixProps {
  permissions: AdminPermission[]
  selectedPermissionIds: string[]
  isSaving: boolean
  onTogglePermission: (permissionId: string) => void
  onSelectAllModule: (modulePermissionIds: string[]) => void
  onClearAllModule: (modulePermissionIds: string[]) => void
  onSave: () => void
  onCancel?: () => void
}

export function RolePermissionsMatrix({
  permissions,
  selectedPermissionIds,
  isSaving,
  onTogglePermission,
  onSelectAllModule,
  onClearAllModule,
  onSave,
  onCancel,
}: RolePermissionsMatrixProps) {
  const matrixRows = buildAdminPermissionMatrix(permissions)
  const advancedPermissions = getAdvancedPermissions(permissions)
  const selectedSet = new Set(selectedPermissionIds)

  return (
    <div className="roles-permissions">
      <section className="roles-permissions__legend surface-card">
        <div>
          <p className="section-kicker">Asignacion</p>
          <h3>Matriz de permisos</h3>
          <p>
            Marca permisos por modulo y accion. El diseno esta preparado para crecer sin
            desordenar la lectura del rol.
          </p>
        </div>
      </section>

      <section className="roles-permissions__matrix surface-card">
        <div className="roles-permissions__matrix-scroll">
          <div className="roles-permissions__matrix-head">
            <span>Modulo</span>
            {adminPermissionMatrixActions.map((actionKey) => (
              <span key={actionKey}>{getAdminPermissionActionLabel(actionKey)}</span>
            ))}
            <span>Atajos</span>
          </div>

          {matrixRows.map((row) => {
            const modulePermissionIds = row.cells
              .map((cell) => cell.permission?.id)
              .filter((value): value is string => Boolean(value))

            return (
              <div key={row.moduleKey} className="roles-permissions__matrix-row">
                <strong className="roles-permissions__module">{row.moduleLabel}</strong>

                {row.cells.map((cell) => (
                  <label
                    key={`${row.moduleKey}-${cell.actionKey}`}
                    className={`roles-permissions__cell ${
                      cell.permission ? '' : 'roles-permissions__cell--missing'
                    }`.trim()}
                    title={
                      cell.permission?.description ||
                      `${row.moduleLabel}: ${cell.actionLabel}`
                    }
                  >
                    <input
                      type="checkbox"
                      checked={cell.permission ? selectedSet.has(cell.permission.id) : false}
                      disabled={!cell.permission || isSaving}
                      onChange={() => {
                        if (cell.permission) {
                          onTogglePermission(cell.permission.id)
                        }
                      }}
                    />
                    <span>{cell.permission ? cell.actionLabel : 'N/D'}</span>
                  </label>
                ))}

                <div className="roles-permissions__row-actions">
                  <Button
                    variant="secondary"
                    disabled={!modulePermissionIds.length || isSaving}
                    onClick={() => onSelectAllModule(modulePermissionIds)}
                  >
                    Todo
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!modulePermissionIds.length || isSaving}
                    onClick={() => onClearAllModule(modulePermissionIds)}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {advancedPermissions.length ? (
        <section className="roles-permissions__advanced surface-card">
          <div className="roles-permissions__advanced-header">
            <div>
              <p className="section-kicker">Avanzado</p>
              <h3>Permisos especializados</h3>
              <p>
                Estos permisos no entran en la matriz base, pero siguen siendo asignables al rol.
              </p>
            </div>
          </div>

          <div className="roles-permissions__advanced-list">
            {advancedPermissions.map((permission) => (
              <label key={permission.id} className="roles-permissions__advanced-item">
                <input
                  type="checkbox"
                  checked={selectedSet.has(permission.id)}
                  disabled={isSaving}
                  onChange={() => onTogglePermission(permission.id)}
                />
                <div>
                  <strong>{permission.name}</strong>
                  <span>{permission.description || permission.code}</span>
                </div>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <div className="admin-form-actions">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Guardando permisos...' : 'Guardar permisos'}
        </Button>
        {onCancel ? (
          <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
            Volver
          </Button>
        ) : null}
      </div>
    </div>
  )
}
