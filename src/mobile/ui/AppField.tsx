import { MaterialCommunityIcons } from '@expo/vector-icons'
import { forwardRef } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native'
import { appFonts, mobileTheme } from '../theme'

interface AppFieldProps {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: TextInputProps['keyboardType']
  error?: string
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
  returnKeyType?: TextInputProps['returnKeyType']
  onSubmitEditing?: TextInputProps['onSubmitEditing']
  blurOnSubmit?: boolean
  autoFocus?: boolean
  secureTextEntry?: boolean
  autoCapitalize?: TextInputProps['autoCapitalize']
}

export const AppField = forwardRef<TextInput, AppFieldProps>(function AppField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  error,
  icon,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
  autoFocus,
  secureTextEntry,
  autoCapitalize,
}, ref) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error ? styles.inputError : null]}>
        {icon ? (
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={mobileTheme.colors.muted}
          />
        ) : null}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          style={styles.input}
          placeholderTextColor={mobileTheme.colors.muted}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={blurOnSubmit}
          autoFocus={autoFocus}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  wrapper: {
    gap: mobileTheme.spacing.xs,
  },
  label: {
    fontSize: 14,
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  inputShell: {
    minHeight: 56,
    borderRadius: mobileTheme.radius.sm,
    backgroundColor: mobileTheme.colors.surface,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileTheme.spacing.xs,
  },
  input: {
    flex: 1,
    color: mobileTheme.colors.text,
    fontSize: 16,
    ...appFonts.regular,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  error: {
    color: mobileTheme.colors.danger,
    fontSize: 12,
    ...appFonts.regular,
  },
})
