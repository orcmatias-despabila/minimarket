import { useState } from 'react'
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { Logo } from '../ui/Logo'
import { AppField } from '../ui/AppField'
import { AppButton } from '../ui/AppButton'
import { appFonts, mobileTheme } from '../theme'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../services/supabaseClient'

type AuthMode = 'login' | 'register'

export function AuthScreen() {
  const { signIn, signUp, signInWithOAuth, isLoading } = useAuth()
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
  }

  const handleSubmit = async () => {
    resetMessages()

    if (!isSupabaseConfigured) {
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
        }
      } else {
        await signIn({ email: normalizedEmail, password })
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No pudimos completar la autenticacion.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={mobileTheme.colors.primary} />
          <Text style={styles.loadingText}>Cargando sesion...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Logo size="md" />
          <Text style={styles.title}>
            {isRegister ? 'Crea tu cuenta' : 'Inicia sesion'}
          </Text>
          <Text style={styles.subtitle}>
            Accede a Vendeapp para seguir vendiendo, cargando productos y revisando tu negocio.
          </Text>
        </View>

        <View style={styles.card}>
          <AppField
            label="Correo electronico"
            value={email}
            onChangeText={setEmail}
            placeholder="nombre@correo.com"
            icon="email-outline"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AppField
            label="Contrasena"
            value={password}
            onChangeText={setPassword}
            placeholder="Ingresa tu contrasena"
            icon="lock-outline"
            secureTextEntry
            autoCapitalize="none"
          />

          {isRegister ? (
            <AppField
              label="Confirmar contrasena"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repite tu contrasena"
              icon="lock-check-outline"
              secureTextEntry
              autoCapitalize="none"
            />
          ) : null}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {infoMessage ? <Text style={styles.infoText}>{infoMessage}</Text> : null}

          <AppButton
            label={
              isSubmitting
                ? isRegister
                  ? 'Creando cuenta...'
                  : 'Ingresando...'
                : isRegister
                  ? 'Crear cuenta'
                  : 'Entrar'
            }
            onPress={handleSubmit}
            disabled={isSubmitting}
            icon={isRegister ? 'account-plus-outline' : 'login'}
          />

          <View style={styles.providersWrap}>
            <AppButton
              label="Google pronto"
              onPress={() => {
                void signInWithOAuth('google').catch((error) => {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : 'Google login aun no esta habilitado.',
                  )
                })
              }}
              disabled
              variant="secondary"
              icon="google"
            />
            <AppButton
              label="Facebook pronto"
              onPress={() => {
                void signInWithOAuth('facebook').catch((error) => {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : 'Facebook login aun no esta habilitado.',
                  )
                })
              }}
              disabled
              variant="secondary"
              icon="facebook"
            />
          </View>

          <Text style={styles.switchText}>
            {isRegister ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}
          </Text>
          <AppButton
            label={isRegister ? 'Ir a login' : 'Crear una cuenta'}
            onPress={() => {
              resetMessages()
              setMode(isRegister ? 'login' : 'register')
            }}
            variant="secondary"
            icon={isRegister ? 'arrow-left' : 'account-plus-outline'}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: mobileTheme.spacing.lg,
    gap: mobileTheme.spacing.xl,
  },
  hero: {
    gap: mobileTheme.spacing.md,
    alignItems: 'center',
  },
  title: {
    fontSize: mobileTheme.fontSizes.xxl,
    color: mobileTheme.colors.text,
    textAlign: 'center',
    ...appFonts.bold,
  },
  subtitle: {
    color: mobileTheme.colors.muted,
    lineHeight: 22,
    textAlign: 'center',
    ...appFonts.regular,
  },
  card: {
    gap: mobileTheme.spacing.md,
    backgroundColor: mobileTheme.colors.card,
    borderRadius: mobileTheme.radius.xl,
    padding: mobileTheme.spacing.lg,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    ...mobileTheme.shadows.card,
  },
  providersWrap: {
    gap: mobileTheme.spacing.sm,
  },
  switchText: {
    color: mobileTheme.colors.muted,
    textAlign: 'center',
    ...appFonts.regular,
  },
  errorText: {
    color: mobileTheme.colors.danger,
    ...appFonts.semibold,
  },
  infoText: {
    color: mobileTheme.colors.primaryDark,
    ...appFonts.semibold,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: mobileTheme.spacing.md,
  },
  loadingText: {
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
})
