import type { PropsWithChildren } from 'react'
import { StyleSheet, View } from 'react-native'
import { mobileTheme } from '../theme'

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: mobileTheme.colors.card,
    borderRadius: mobileTheme.radius.lg,
    padding: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.md,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...mobileTheme.shadows.card,
  },
})
