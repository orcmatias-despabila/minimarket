import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { appFonts, mobileTheme } from '../theme'

interface AppButtonProps {
  label: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon,
}: AppButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={variant === 'secondary' ? mobileTheme.colors.text : '#fff'}
          />
        ) : null}
        <Text style={[styles.label, variant === 'secondary' && styles.labelSecondary]}>
          {label}
        </Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: mobileTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: mobileTheme.spacing.md,
  },
  primary: {
    backgroundColor: mobileTheme.colors.primary,
    ...mobileTheme.shadows.button,
  },
  secondary: {
    backgroundColor: mobileTheme.colors.surface,
  },
  danger: {
    backgroundColor: mobileTheme.colors.danger,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileTheme.spacing.xs,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    ...appFonts.semibold,
  },
  labelSecondary: {
    color: mobileTheme.colors.text,
  },
})
