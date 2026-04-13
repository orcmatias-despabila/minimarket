import type { PropsWithChildren } from 'react'
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { appFonts, mobileTheme } from '../theme'
import { AppHeader } from './AppHeader'

interface ScreenProps {
  title: string
  subtitle?: string
  headerTitle?: string
  headerSubtitle?: string
}

export function Screen({
  title,
  subtitle,
  children,
}: PropsWithChildren<ScreenProps>) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader />
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background,
  },
  content: {
    padding: mobileTheme.spacing.lg,
    paddingTop: mobileTheme.spacing.md,
    gap: mobileTheme.spacing.lg,
  },
  header: {
    gap: mobileTheme.spacing.xs,
  },
  title: {
    fontSize: 28,
    color: mobileTheme.colors.text,
    ...appFonts.bold,
  },
  subtitle: {
    color: mobileTheme.colors.muted,
    fontSize: 15,
    lineHeight: 21,
    ...appFonts.regular,
  },
})
