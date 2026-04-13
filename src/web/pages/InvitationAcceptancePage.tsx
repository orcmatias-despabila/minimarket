import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { useWebWorkspace } from '../workspace/WorkspaceProvider'

export function InvitationAcceptancePage() {
  const {
    pendingInvitations,
    acceptInvitation,
    rejectInvitation,
    createBusiness,
    isLoading,
  } = useWebWorkspace()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [legalName, setLegalName] = useState('')
  const [isCreatingBusiness, setIsCreatingBusiness] = useState(false)

  const handleAccept = async (invitationId: string) => {
    setErrorMessage(null)
    setProcessingId(invitationId)

    try {
      await acceptInvitation(invitationId)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No pudimos aceptar la invitacion.',
      )
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (invitationId: string) => {
    setErrorMessage(null)
    setProcessingId(`reject-${invitationId}`)

    try {
      await rejectInvitation(invitationId)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No pudimos rechazar la invitacion.',
      )
    } finally {
      setProcessingId(null)
    }
  }

  const handleCreateBusiness = async () => {
    setErrorMessage(null)

    if (!businessName.trim()) {
      setErrorMessage('Ingresa el nombre de tu negocio para continuar.')
      return
    }

    setIsCreatingBusiness(true)

    try {
      await createBusiness({
        name: businessName.trim(),
        legalName: legalName.trim(),
      })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No pudimos crear tu negocio.')
    } finally {
      setIsCreatingBusiness(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-hero">
        <p className="section-kicker">Invitaciones</p>
        <h1>Tienes una invitacion</h1>
        <p>Elige a que negocio quieres unirte o crea tu propio espacio si no quieres aceptar.</p>
      </section>

      <section className="surface-card auth-card">
        <div className="auth-card__header">
          <p className="section-kicker">Acceso pendiente</p>
          <h2>Negocios disponibles</h2>
          <p>{isLoading ? 'Revisando invitaciones...' : 'Selecciona una invitacion activa.'}</p>
        </div>

        <div className="auth-card__form">
          {pendingInvitations.map((invitation) => (
            <article key={invitation.id} className="auth-invitation-card">
              <div>
                <strong>{invitation.businessName || 'Negocio invitante'}</strong>
                {invitation.fullName ? <p>Invitacion para: {invitation.fullName}</p> : null}
                <p>{invitation.email}</p>
                <p>Rol inicial: {invitation.role}</p>
              </div>
              <div className="auth-invitation-card__actions">
                <Button
                  onClick={() => {
                    void handleAccept(invitation.id)
                  }}
                  disabled={Boolean(processingId)}
                >
                  {processingId === invitation.id ? 'Uniendome...' : 'Aceptar invitacion'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void handleReject(invitation.id)
                  }}
                  disabled={Boolean(processingId)}
                >
                  {processingId === `reject-${invitation.id}`
                    ? 'Rechazando...'
                    : 'Rechazar invitacion'}
                </Button>
              </div>
            </article>
          ))}

          <section className="surface-card auth-card__embedded">
            <div className="auth-card__header">
              <p className="section-kicker">Tu propio negocio</p>
              <h2>Crear empresa nueva</h2>
              <p>
                Si prefieres no unirte al negocio invitante, puedes seguir con una empresa propia.
              </p>
            </div>

            <div className="auth-card__form">
              <Field
                label="Nombre del negocio"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Ej: Minimarket Central"
              />
              <Field
                label="Razon social"
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
                placeholder="Opcional"
              />

              <Button
                onClick={() => {
                  void handleCreateBusiness()
                }}
                disabled={isCreatingBusiness || isLoading || Boolean(processingId)}
                fullWidth
              >
                {isCreatingBusiness ? 'Creando negocio...' : 'Crear mi negocio'}
              </Button>
            </div>
          </section>

          {errorMessage ? <p className="form-error auth-message">{errorMessage}</p> : null}
        </div>
      </section>
    </main>
  )
}
