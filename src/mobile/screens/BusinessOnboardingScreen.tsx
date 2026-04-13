import { useState } from 'react'
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { AppButton } from '../ui/AppButton'
import { AppField } from '../ui/AppField'
import { Logo } from '../ui/Logo'
import { appFonts, mobileTheme } from '../theme'
import { useWorkspace } from '../state/WorkspaceProvider'

export function BusinessOnboardingScreen() {
  const { createBusiness, isLoading } = useWorkspace()
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={mobileTheme.colors.primary} />
          <Text style={styles.loadingText}>Preparando tu negocio...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Logo size="md" />
          <Text style={styles.title}>Crea tu negocio</Text>
          <Text style={styles.subtitle}>
            Tu negocio sera el contenedor principal de productos, ventas, stock y usuarios.
          </Text>
        </View>

        <View style={styles.card}>
          <AppField
            label="Nombre del negocio"
            value={name}
            onChangeText={setName}
            placeholder="Ej: Minimarket Central"
            icon="storefront-outline"
          />
          <AppField
            label="Razon social"
            value={legalName}
            onChangeText={setLegalName}
            placeholder="Opcional"
            icon="file-document-outline"
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <AppButton
            label={isSubmitting ? 'Creando negocio...' : 'Crear negocio'}
            onPress={handleCreateBusiness}
            disabled={isSubmitting}
            icon="check-bold"
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
  errorText: {
    color: mobileTheme.colors.danger,
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
