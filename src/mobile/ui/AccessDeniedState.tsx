import { StyleSheet, Text, View } from 'react-native'
import { Card } from './Card'
import { appFonts, mobileTheme } from '../theme'

interface AccessDeniedStateProps {
  title?: string
  message: string
}

export function AccessDeniedState({
  title = 'Acceso restringido',
  message,
}: AccessDeniedStateProps) {
  return (
    <Card>
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: mobileTheme.spacing.xs,
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.fontSizes.lg,
    ...appFonts.bold,
  },
  message: {
    color: mobileTheme.colors.muted,
    lineHeight: 21,
    ...appFonts.regular,
  },
})
