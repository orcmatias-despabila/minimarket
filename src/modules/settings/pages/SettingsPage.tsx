import { ModulePlaceholder } from '../../../shared/components/ModulePlaceholder'

export function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Configuracion"
      summary="Base para datos del negocio, impuestos, usuarios, permisos y preferencias operativas."
      goals={[
        'Centralizar configuracion general de la tienda.',
        'Preparar usuarios y roles owner, admin y cashier para futura expansion.',
        'Separar parametros tecnicos de parametros de negocio.',
      ]}
      entities={['StoreSettings', 'UserProfile', 'AuthSession', 'Permission']}
      nextSteps={[
        'Formulario de negocio y datos fiscales.',
        'Gestion de usuarios y permisos.',
        'Preferencias de tickets, moneda y layout.',
      ]}
    />
  )
}
