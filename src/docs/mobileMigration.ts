export const mobileMigrationAudit = {
  reusableNow: [
    'Modelos del dominio en src/types/domain.ts',
    'Reducers y datos semilla por modulo en src/modules/**/state y src/modules/**/data',
    'Capacidades e integraciones futuras en src/core/contracts y src/core/services',
    'Formateadores y reglas de negocio simples en src/lib',
  ],
  tooWebOriented: [
    'src/app, src/components y src/modules/**/pages|components escritos con div/button/input',
    'Layout lateral fijo y patrones de escritorio',
    'Uso de react-dom, CSS global y estructura Vite',
  ],
  migrationDirection: [
    'La UI principal pasa a src/mobile',
    'Los modulos web quedan fuera del compilado mobile actual',
    'El dominio y estado compartido se mantienen como base para app movil y futuro panel admin',
  ],
} as const
