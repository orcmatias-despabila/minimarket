import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { AdminBackHeader } from '../components/AdminBackHeader'
import { ClientDetailView } from '../components/ClientDetailView'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { adminCustomersService } from '../services/adminCustomers.service'
import type { AdminCustomer } from '../types/adminCustomer'

type LocationFeedbackState = {
  feedback?: string
} | null

export function ClientDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clientId } = useParams<{ clientId: string }>()
  const [searchParams] = useSearchParams()
  const [customer, setCustomer] = useState<AdminCustomer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const feedback = (location.state as LocationFeedbackState)?.feedback ?? null
  const returnTo = searchParams.get('returnTo') || '/clients'

  useEffect(() => {
    const loadCustomer = async () => {
      if (!clientId) {
        setError('No encontramos el cliente solicitado.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const detail = await adminCustomersService.getById(clientId)

        if (!detail) {
          setCustomer(null)
          setError('No encontramos el cliente solicitado.')
          return
        }

        setCustomer(detail)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No pudimos cargar la ficha del cliente.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadCustomer()
  }, [clientId])

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Clientes"
          title={customer?.legalName || 'Ficha del cliente'}
          description="Vista individual del cliente para revisar su informacion comercial sin mezclarla con el listado."
          onBack={() => navigate(returnTo)}
          actions={
            customer ? (
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(
                    `/clients/${customer.id}/edit?returnTo=${encodeURIComponent(returnTo)}`,
                  )
                }
              >
                Editar cliente
              </Button>
            ) : null
          }
        />

        {feedback ? <AdminNotice tone="success">{feedback}</AdminNotice> : null}
        {isLoading ? <AdminLoadingBlock label="Cargando ficha del cliente" /> : null}
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {!isLoading && !error ? <ClientDetailView customer={customer} /> : null}
      </div>
    </section>
  )
}
