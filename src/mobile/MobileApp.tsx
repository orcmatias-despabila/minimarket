import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import { BusinessProvider } from './state/BusinessProvider'
import { AuditLogProvider } from './state/AuditLogProvider'
import { WorkspaceProvider } from './state/WorkspaceProvider'
import { AppNavigator } from './navigation/AppNavigator'
import { mobileTheme } from './theme'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { useWorkspace } from './state/WorkspaceProvider'

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: mobileTheme.colors.background,
    card: mobileTheme.colors.surface,
    text: mobileTheme.colors.text,
    border: mobileTheme.colors.border,
    primary: mobileTheme.colors.primary,
  },
}

export function MobileApp() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  if (!fontsLoaded) {
    return null
  }

  return (
    <AuthProvider>
      <WorkspaceProvider>
        <ScopedBusinessProvider />
      </WorkspaceProvider>
    </AuthProvider>
  )
}

function ScopedBusinessProvider() {
  const { user } = useAuth()
  const { business } = useWorkspace()
  const scopeKey = `${user?.id ?? 'guest'}:${business?.id ?? 'no-business'}`

  return (
    <BusinessProvider key={scopeKey}>
      <AuditLogProvider>
        <NavigationContainer theme={navigationTheme}>
          <AppNavigator />
        </NavigationContainer>
      </AuditLogProvider>
    </BusinessProvider>
  )
}
