import { MaterialCommunityIcons } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'
import { mobileTheme } from '../theme'
import { Logo } from './Logo'

export function AppHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.logoWrap}>
          <Logo size="md" />
        </View>
        <View style={styles.actions}>
          <View style={styles.iconButton}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={18}
              color={mobileTheme.colors.text}
            />
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: mobileTheme.colors.white,
    paddingHorizontal: mobileTheme.spacing.lg,
    paddingTop: mobileTheme.spacing.sm,
    paddingBottom: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border,
  },
  topRow: {
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -18,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: mobileTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
