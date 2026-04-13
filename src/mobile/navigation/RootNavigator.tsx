import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { CashScreen } from '../screens/CashScreen'
import { InventoryScreen } from '../screens/InventoryScreen'
import { ProductsScreen } from '../screens/ProductsScreen'
import { ReportsScreen } from '../screens/ReportsScreen'
import { SalesScreen } from '../screens/SalesScreen'
import { TeamScreen } from '../screens/TeamScreen'
import { useWorkspace } from '../state/WorkspaceProvider'
import { appFonts, mobileTheme } from '../theme'

export type RootTabParamList = {
  Sales: undefined
  Products: undefined
  Inventory: undefined
  Cash: undefined
  Reports: undefined
  Team: undefined
}

const Tab = createBottomTabNavigator<RootTabParamList>()

export function RootNavigator() {
  const { hasPermission } = useWorkspace()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: mobileTheme.colors.primary,
        tabBarInactiveTintColor: mobileTheme.colors.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          ...appFonts.semibold,
        },
        tabBarStyle: {
          height: 78,
          paddingBottom: 10,
          paddingTop: 10,
          backgroundColor: mobileTheme.colors.white,
          borderTopWidth: 0,
          ...mobileTheme.shadows.card,
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<keyof RootTabParamList, keyof typeof MaterialCommunityIcons.glyphMap> = {
            Sales: 'shopping-outline',
            Products: 'barcode-scan',
            Inventory: 'package-variant-closed',
            Cash: 'cash-multiple',
            Reports: 'chart-line',
            Team: 'account-group-outline',
          }

          return <MaterialCommunityIcons name={iconMap[route.name]} size={size} color={color} />
        },
      })}
    >
      {hasPermission('sales:create') ? (
        <Tab.Screen name="Sales" component={SalesScreen} options={{ title: 'Venta' }} />
      ) : null}
      {hasPermission('products:write') ? (
        <Tab.Screen
          name="Products"
          component={ProductsScreen}
          options={{ title: 'Ingresar' }}
        />
      ) : null}
      {hasPermission('inventory:read') ? (
        <Tab.Screen
          name="Inventory"
          component={InventoryScreen}
          options={{ title: 'Inventario' }}
        />
      ) : null}
      {hasPermission('cash:open') || hasPermission('cash:close') ? (
        <Tab.Screen name="Cash" component={CashScreen} options={{ title: 'Caja' }} />
      ) : null}
      {hasPermission('reports:read') ? (
        <Tab.Screen
          name="Reports"
          component={ReportsScreen}
          options={{ title: 'Reportes' }}
        />
      ) : null}
      {hasPermission('users:manage') ? (
        <Tab.Screen name="Team" component={TeamScreen} options={{ title: 'Equipo' }} />
      ) : null}
    </Tab.Navigator>
  )
}
