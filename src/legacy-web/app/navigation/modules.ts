export type AppModuleId =
  | 'products'
  | 'inventory'
  | 'sales'
  | 'cash'
  | 'reports'
  | 'settings'

export interface AppModuleDefinition {
  id: AppModuleId
  label: string
  description: string
}

export const appModules: AppModuleDefinition[] = [
  {
    id: 'products',
    label: 'Productos',
    description: 'Catalogo, categorias, codigos de barras y precios.',
  },
  {
    id: 'inventory',
    label: 'Inventario',
    description: 'Stock, movimientos, ajustes y control operativo.',
  },
  {
    id: 'sales',
    label: 'Ventas',
    description: 'Punto de venta, caja y comprobantes.',
  },
  {
    id: 'cash',
    label: 'Caja diaria',
    description: 'Apertura, cierre y diferencias de caja.',
  },
  {
    id: 'reports',
    label: 'Reportes',
    description: 'Indicadores, cierres y analitica del negocio.',
  },
  {
    id: 'settings',
    label: 'Configuracion',
    description: 'Negocio, usuarios, impuestos y preferencias.',
  },
]
