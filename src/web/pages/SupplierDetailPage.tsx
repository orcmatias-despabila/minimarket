import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { AdminBackHeader } from '../components/AdminBackHeader'
import { AdminLoadingBlock } from '../components/AdminLoadingBlock'
import { AdminNotice } from '../components/AdminNotice'
import { SupplierDetailView } from '../components/SupplierDetailView'
import { adminSuppliersService } from '../services/adminSuppliers.service'
import type { AdminSupplier } from '../types/adminSupplier'

type LocationFeedbackState = {
  feedback?: string
} | null

export function SupplierDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { supplierId } = useParams<{ supplierId: string }>()
  const [searchParams] = useSearchParams()
  const [supplier, setSupplier] = useState<AdminSupplier | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const feedback = (location.state as LocationFeedbackState)?.feedback ?? null
  const returnTo = searchParams.get('returnTo') || '/suppliers'

  useEffect(() => {
    const loadSupplier = async () => {
      if (!supplierId) {
        setError('No encontramos el proveedor solicitado.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const detail = await adminSuppliersService.getById(supplierId)

        if (!detail) {
          setSupplier(null)
          setError('No encontramos el proveedor solicitado.')
          return
        }

        setSupplier(detail)
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No pudimos cargar la ficha del proveedor.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadSupplier()
  }, [supplierId])

  return (
    <section className="admin-record-page">
      <div className="surface-card admin-record-page__surface">
        <AdminBackHeader
          kicker="Proveedores"
          title={supplier?.legalName || 'Ficha del proveedor'}
          description="Vista individual del proveedor para revisar sus datos sin abrir formularios en el listado."
          onBack={() => navigate(returnTo)}
          actions={
            supplier ? (
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(
                    `/suppliers/${supplier.id}/edit?returnTo=${encodeURIComponent(returnTo)}`,
                  )
                }
              >
                Editar proveedor
              </Button>
            ) : null
          }
        />

        {feedback ? <AdminNotice tone="success">{feedback}</AdminNotice> : null}
        {isLoading ? <AdminLoadingBlock label="Cargando ficha del proveedor" /> : null}
        {error ? <AdminNotice tone="error">{error}</AdminNotice> : null}
        {!isLoading && !error ? <SupplierDetailView supplier={supplier} /> : null}
      </div>
    </section>
  )
}
