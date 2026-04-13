import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { useWebAuth } from '../auth/AuthProvider'
import { isWebSupabaseConfigured } from '../lib/supabase'
import { getWebModulePathById } from '../navigation/modules'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const navigate = useNavigate()
  const dashboardPath = getWebModulePathById('dashboard') ?? '/dashboard'
  const {
    signIn,
    signUp,
    signInWithOAuth,
    isLoading,
    authCallbackError,
    authCallbackMessage,
    clearAuthCallbackState,
  } = useWebAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isRegister = mode === 'register'

  const resetMessages = () => {
    setErrorMessage(null)
    setInfoMessage(null)
    clearAuthCallbackState()
  }

  const handleSubmit = async () => {
    resetMessages()

    if (!isWebSupabaseConfigured) {
      setErrorMessage('Falta configurar Supabase para iniciar sesion.')
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !password.trim()) {
      setErrorMessage('Ingresa correo y contrasena.')
      return
    }

    if (isRegister && password !== confirmPassword) {
      setErrorMessage('Las contrasenas no coinciden.')
      return
    }

    setIsSubmitting(true)

    try {
      if (isRegister) {
        const result = await signUp({ email: normalizedEmail, password })
        setInfoMessage(
          result.requiresEmailConfirmation
            ? 'Cuenta creada. Revisa tu correo para confirmar el acceso.'
            : 'Cuenta creada correctamente. Ya puedes entrar.',
        )
        if (!result.requiresEmailConfirmation) {
          setMode('login')
          setPassword('')
          setConfirmPassword('')
        }
      } else {
        await signIn({ email: normalizedEmail, password })
        navigate(dashboardPath, { replace: true })
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No pudimos completar la autenticacion.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-hero">
        <p className="section-kicker">Version web</p>
        <h1>{isRegister ? 'Crea tu cuenta' : 'Inicia sesion'}</h1>
        <p>
          Accede a Vendeapp desde escritorio para revisar tu negocio, preparar la caja
          y continuar con el mismo backend de la app movil.
        </p>
        <div className="auth-hero__list">
          <span>Sesion persistente en navegador</span>
          <span>Acceso al mismo negocio y permisos</span>
          <span>Preparado para escritorio y caja POS</span>
        </div>
      </section>

      <section className="surface-card auth-card">
        <div className="auth-card__header">
          <p className="section-kicker">Autenticacion</p>
          <h2>{isRegister ? 'Registro' : 'Ingreso'}</h2>
          <p>
            {isLoading
              ? 'Cargando sesion actual...'
              : 'Usa el mismo correo y contrasena que en la app movil.'}
          </p>
        </div>

        <div className="auth-card__form">
          <Field
            label="Correo electronico"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nombre@correo.com"
            autoComplete="email"
          />
          <Field
            label="Contrasena"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ingresa tu contrasena"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />

          {isRegister ? (
            <Field
              label="Confirmar contrasena"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repite tu contrasena"
              autoComplete="new-password"
            />
          ) : null}

          {errorMessage || authCallbackError ? (
            <p className="form-error auth-message">{errorMessage ?? authCallbackError}</p>
          ) : null}
          {infoMessage || authCallbackMessage ? (
            <p className="auth-message auth-message--info">
              {infoMessage ?? authCallbackMessage}
            </p>
          ) : null}

          <Button onClick={handleSubmit} disabled={isSubmitting || isLoading} fullWidth>
            {isSubmitting
              ? isRegister
                ? 'Creando cuenta...'
                : 'Ingresando...'
              : isRegister
                ? 'Crear cuenta'
                : 'Entrar'}
          </Button>

          <div className="auth-oauth-grid">
            <Button
              variant="secondary"
              onClick={() => {
                void signInWithOAuth('google').catch((error) => {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : 'Google login aun no esta habilitado.',
                  )
                })
              }}
              disabled
            >
              Google pronto
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void signInWithOAuth('facebook').catch((error) => {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : 'Facebook login aun no esta habilitado.',
                  )
                })
              }}
              disabled
            >
              Facebook pronto
            </Button>
          </div>

          <div className="auth-switch">
            <span>{isRegister ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}</span>
            <Button
              variant="secondary"
              onClick={() => {
                resetMessages()
                setMode(isRegister ? 'login' : 'register')
              }}
            >
              {isRegister ? 'Ir a login' : 'Crear una cuenta'}
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
