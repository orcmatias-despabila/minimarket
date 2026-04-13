export const architectureNotes = {
  goals: [
    'Separar dominio, UI e integraciones externas.',
    'Permitir reemplazar storage local por nube sin rehacer modulos.',
    'Soportar panel administrativo web y superficie POS con rutas distintas.',
  ],
  futureCapabilities: [
    'Multiusuario y roles con permisos granulares.',
    'Exportacion de reportes a PDF, Excel o CSV.',
    'Impresion de ticket con plantillas y adaptadores de hardware.',
    'Integracion con lectores externos y otros dispositivos.',
    'Sincronizacion en la nube por tenant o negocio.',
    'Panel web administrativo desacoplado del flujo POS.',
  ],
} as const
