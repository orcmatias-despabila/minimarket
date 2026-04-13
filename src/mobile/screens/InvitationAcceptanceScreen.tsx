import { useState } from 'react'
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { useWorkspace } from '../state/WorkspaceProvider'
import { AppButton } from '../ui/AppButton'
import { Logo } from '../ui/Logo'
import { appFonts, mobileTheme } from '../theme'

export function InvitationAcceptanceScreen() {
  const { pendingInvitations, acceptInvitation, isLoading } = useWorkspace()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={mobileTheme.colors.primary} />
          <Text style={styles.loadingText}>Revisando invitaciones...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Logo size="md" />
          <Text style={styles.title}>Tienes una invitacion</Text>
          <Text style={styles.subtitle}>
            Elige a que negocio quieres unirte con esta cuenta.
          </Text>
        </View>

        <View style={styles.card}>
          {pendingInvitations.map((invitation) => (
            <View key={invitation.id} style={styles.invitationCard}>
              <Text style={styles.businessName}>
                {invitation.businessName || 'Negocio invitante'}
              </Text>
              {invitation.fullName ? (
                <Text style={styles.metaText}>Invitacion para: {invitation.fullName}</Text>
              ) : null}
              <Text style={styles.metaText}>{invitation.email}</Text>
              <Text style={styles.metaText}>Rol inicial: {invitation.role}</Text>
              <AppButton
                label={
                  processingId === invitation.id ? 'Uniendome...' : 'Aceptar invitacion'
                }
                onPress={() => handleAccept(invitation.id)}
                disabled={Boolean(processingId)}
                icon="check-bold"
              />
            </View>
          ))}

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
  invitationCard: {
    gap: mobileTheme.spacing.sm,
    paddingBottom: mobileTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border,
  },
  businessName: {
    color: mobileTheme.colors.text,
    ...appFonts.bold,
  },
  metaText: {
    color: mobileTheme.colors.muted,
    ...appFonts.regular,
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
