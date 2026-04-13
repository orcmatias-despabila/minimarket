# Minimarket Mobile

Proyecto migrado a enfoque **mobile-first** con **React Native + Expo**.

## Prioridad actual

La aplicacion principal ahora es movil, pensada para:

- Celular o tablet en mostrador
- Flujo de venta rapido
- Interfaz tactil simple
- Camara para escaneo de codigos
- Navegacion nativa por modulos

## Estructura actual

```text
App.tsx / index.ts         # entrada Expo
app.json                   # configuracion Expo
src/mobile/                # interfaz movil principal
  navigation/              # navegacion nativa
  screens/                 # pantallas moviles
  state/                   # contexto y store de la app movil
  ui/                      # componentes tactiles reutilizables
src/types/                 # dominio compartido
src/lib/                   # utilidades compartidas
src/modules/**/state       # reducers reutilizables
src/modules/**/data        # datos semilla reutilizables
src/core/                  # contratos para auth, export, sync, dispositivos
src/docs/mobileMigration.ts
```

## Reutilizado desde la version anterior

- Modelos de dominio
- Reducers de productos, ventas, inventario, caja y reportes
- Datos semilla
- Helpers de calculo y formateo
- Contratos de arquitectura para roles, nube, hardware y panel admin

## Fuera del foco actual

La UI web anterior no es la app principal. Se mantiene solo como referencia
arquitectonica y queda fuera del compilado movil mediante `tsconfig.json`.

## Etapas cubiertas en esta migracion

### Etapa 1

- Auditoria de partes reutilizables y partes excesivamente web
- Documento de migracion en `src/docs/mobileMigration.ts`

### Etapa 2

- Proyecto base convertido a Expo
- Navegacion movil principal por tabs
- Pantallas base adaptadas a experiencia movil

### Etapa 3

- Flujo de ventas movil
- Escaneo de codigos con camara Expo
- Productos manuales por unidad y por peso
- Total, pago y vuelto

### Etapa 4

- Base movil para inventario, caja y reportes conectadas al mismo estado

## Comandos

- `npm start`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run typecheck`
- `npm run lint`

## Siguiente paso recomendado

1. Persistencia local en dispositivo.
2. Pantallas moviles completas para inventario y reportes.
3. Permisos/usuarios reales.
4. Adaptadores de impresora, lector externo y sync en nube.
5. Superficie administrativa web usando la capa compartida.
