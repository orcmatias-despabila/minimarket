import { Pressable, StyleSheet, Text, View } from 'react-native'
import { appFonts, mobileTheme } from '../theme'

interface Option {
  label: string
  value: string
}

interface AppSelectProps {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}

export function AppSelect({
  label,
  value,
  options,
  onChange,
}: AppSelectProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              value === option.value ? styles.optionActive : null,
            ]}
          >
            <Text
              style={[
                styles.optionLabel,
                value === option.value ? styles.optionLabelActive : null,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: mobileTheme.spacing.xs,
  },
  label: {
    fontSize: 14,
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing.sm,
  },
  option: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: mobileTheme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: mobileTheme.colors.primarySoft,
  },
  optionLabel: {
    color: mobileTheme.colors.text,
    ...appFonts.semibold,
  },
  optionLabelActive: {
    color: mobileTheme.colors.primary,
  },
})
