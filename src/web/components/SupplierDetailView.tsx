import { AdminEmptyState } from './AdminEmptyState'
import type { AdminSupplier } from '../types/adminSupplier'

const buildInitials = (name: string) =>
  name
    .split(' ')
    .map((item) => item.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

interface SupplierDetailViewProps {
  supplier: AdminSupplier | null
}

export function SupplierDetailView({ supplier }: SupplierDetailViewProps) {
  if (!supplier) {
    return (
      <AdminEmptyState
        compact
        title="No encontramos este proveedor."
        description="La ficha puede haber sido eliminada o no estar disponible para tu negocio."
      />
    )
  }

  return (
    <div className="supplier-detail">
      <div className="supplier-detail__hero">
        <div className="supplier-detail__avatar">{buildInitials(supplier.legalName)}</div>
        <div>
          <strong>{supplier.legalName}</strong>
          <p>{supplier.taxId}</p>
        </div>
      </div>

      <div className="settings-summary">
        <div>
          <span>Giro</span>
          <strong>{supplier.businessLine || 'No informado'}</strong>
        </div>
        <div>
          <span>Estado</span>
          <strong>{supplier.status === 'active' ? 'Activo' : 'Inactivo'}</strong>
        </div>
        <div>
          <span>Contacto</span>
          <strong>{supplier.contactName || supplier.email || 'Sin contacto'}</strong>
        </div>
        <div>
          <span>Telefono</span>
          <strong>{supplier.phone || 'Sin telefono'}</strong>
        </div>
        <div>
          <span>Correo</span>
          <strong>{supplier.email || 'Sin correo'}</strong>
        </div>
        <div>
          <span>Comuna / ciudad</span>
          <strong>
            {[supplier.district, supplier.city].filter(Boolean).join(', ') || 'No informada'}
          </strong>
        </div>
        <div>
          <span>Direccion</span>
          <strong>{supplier.addressLine1 || 'No informada'}</strong>
        </div>
      </div>

      <div className="supplier-detail__notes">
        <span>Observaciones</span>
        <p>{supplier.notes || 'Sin observaciones registradas.'}</p>
      </div>

      <div className="supplier-detail__doc-placeholder">
        <span>Base documental preparada</span>
        <p>
          Este proveedor queda listo para relacionarse con documentos recibidos
          y reportes administrativos en las siguientes fases.
        </p>
      </div>
    </div>
  )
}
