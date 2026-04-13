import { AdminEmptyState } from './AdminEmptyState'
import type { AdminCustomer } from '../types/adminCustomer'

const buildInitials = (name: string) =>
  name
    .split(' ')
    .map((item) => item.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

interface ClientDetailViewProps {
  customer: AdminCustomer | null
}

export function ClientDetailView({ customer }: ClientDetailViewProps) {
  if (!customer) {
    return (
      <AdminEmptyState
        compact
        title="No encontramos este cliente."
        description="La ficha puede haber sido eliminada o no estar disponible para tu negocio."
      />
    )
  }

  return (
    <div className="customer-detail">
      <div className="customer-detail__hero">
        <div className="customer-detail__avatar">{buildInitials(customer.legalName)}</div>
        <div>
          <strong>{customer.legalName}</strong>
          <p>{customer.taxId}</p>
        </div>
      </div>

      <div className="settings-summary">
        <div>
          <span>Giro</span>
          <strong>{customer.businessLine || 'No informado'}</strong>
        </div>
        <div>
          <span>Estado</span>
          <strong>{customer.status === 'active' ? 'Activo' : 'Inactivo'}</strong>
        </div>
        <div>
          <span>Contacto</span>
          <strong>{customer.phone || 'Sin telefono'}</strong>
        </div>
        <div>
          <span>Correo</span>
          <strong>{customer.email || 'Sin correo'}</strong>
        </div>
        <div>
          <span>Comuna / ciudad</span>
          <strong>
            {[customer.district, customer.city].filter(Boolean).join(', ') || 'No informada'}
          </strong>
        </div>
        <div>
          <span>Direccion</span>
          <strong>{customer.addressLine1 || 'No informada'}</strong>
        </div>
      </div>

      <div className="customer-detail__notes">
        <span>Observaciones</span>
        <p>{customer.notes || 'Sin observaciones registradas.'}</p>
      </div>

      <div className="customer-detail__doc-placeholder">
        <span>Base documental preparada</span>
        <p>
          Este cliente queda listo para asociar documentos emitidos y reportes
          administrativos en las siguientes fases.
        </p>
      </div>
    </div>
  )
}
