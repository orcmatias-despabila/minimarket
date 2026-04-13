import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { RootNavigator } from './RootNavigator'
import { AuthScreen } from '../screens/AuthScreen'
import { useAuth } from '../hooks/useAuth'
import { BusinessOnboardingScreen } from '../screens/BusinessOnboardingScreen'
import { useWorkspace } from '../state/WorkspaceProvider'
import { InvitationAcceptanceScreen } from '../screens/InvitationAcceptanceScreen'

export type AppStackParamList = {
  Auth: undefined
  InvitationAcceptance: undefined
  BusinessOnboarding: undefined
  Main: undefined
}

const Stack = createNativeStackNavigator<AppStackParamList>()

export function AppNavigator() {
  const { isAuthenticated } = useAuth()
  const { business, isLoading, pendingInvitations } = useWorkspace()

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : isLoading ? (
        <Stack.Screen name="BusinessOnboarding" component={BusinessOnboardingScreen} />
      ) : pendingInvitations.length ? (
        <Stack.Screen
          name="InvitationAcceptance"
          component={InvitationAcceptanceScreen}
        />
      ) : business ? (
        <Stack.Screen name="Main" component={RootNavigator} />
      ) : (
        <Stack.Screen
          name="BusinessOnboarding"
          component={BusinessOnboardingScreen}
        />
      )}
    </Stack.Navigator>
  )
}
