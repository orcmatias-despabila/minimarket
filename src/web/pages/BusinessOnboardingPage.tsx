import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

export function BusinessOnboardingPage() {
  const { createBusiness, isLoading } = useWebWorkspace()
  const [name, setName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateBusiness = async () => {
    setErrorMessage(null)

    if (!name.trim()) {
      setErrorMessage('Ingresa el nombre de tu negocio.')
      return
    }

    setIsSubmitting(true)

    try {
      await createBusiness({ name: name.trim(), legalName: legalName.trim() })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No pudimos crear el negocio.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-hero">
        <p className="section-kicker">Primer acceso</p>
        <h1>Crea tu negocio</h1>
        <p>
          Tu negocio sera el contenedor principal de productos, ventas, stock y
          usuarios, igual que en la app movil.
        </p>
      </section>

      <section className="surface-card auth-card">
        <div className="auth-card__header">
          <p className="section-kicker">Onboarding</p>
          <h2>Negocio principal</h2>
          <p>{isLoading ? 'Preparando tu espacio...' : 'Completa los datos basicos.'}</p>
        </div>

        <div className="auth-card__form">
          <Field
            label="Nombre del negocio"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: Minimarket Central"
          />
          <Field
            label="Razon social"
            value={legalName}
            onChange={(event) => setLegalName(event.target.value)}
            placeholder="Opcional"
          />

          {errorMessage ? <p className="form-error auth-message">{errorMessage}</p> : null}

          <Button onClick={handleCreateBusiness} disabled={isSubmitting || isLoading} fullWidth>
            {isSubmitting ? 'Creando negocio...' : 'Crear negocio'}
          </Button>
        </div>
      </section>
    </main>
  )
}
