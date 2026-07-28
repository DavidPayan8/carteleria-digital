# Backend — Cartelería Digital

Node + Express + TypeScript + Prisma, sobre SQL Server. Media en Azure Blob Storage.

## Setup

```bash
npm install
cp .env.example .env   # completar DATABASE_URL, JWT secrets y AZURE_STORAGE_CONNECTION_STRING
```

## Base de datos

```bash
npm run prisma:migrate   # crea las tablas en tu SQL Server según prisma/schema.prisma
npm run prisma:seed      # inserta los roles base (SuperAdmin, OrgAdmin, LocationAdmin, Viewer)
```

`prisma/schema.prisma` es la fuente de verdad para migraciones. `db/schema.sql` (en la raíz del repo) queda como documento de diseño/referencia — no se ejecuta directamente.

> **Nota**: la restricción "un Schedule apunta a exactamente uno de screenId/screenGroupId/locationId" está documentada en el schema y se aplica en la capa de aplicación (`assertSingleTarget` en `schedules.controller.ts`). Si se quiere reforzar también a nivel de base de datos, añade un `CHECK` constraint editando a mano el archivo de migración SQL que genera `prisma migrate dev` (Prisma no soporta CHECK constraints multi-columna de forma declarativa).

## Desarrollo

```bash
npm run dev
```

Sirve en `http://localhost:4000`. Healthcheck: `GET /health`.

## Estructura

```
src/
  config/       env, cliente Prisma
  middleware/   auth de usuarios (JWT), auth de pantallas, manejo de errores
  modules/      un folder por dominio: auth, organizations, locations, screens, media, playlists, schedules, player
  utils/        jwt, hashing, Azure Blob, audit log, resolución de programación
```

## Flujos clave

- **Emparejar una pantalla**: crear el `Screen` desde el panel (`POST /api/screens`) genera un `pairingCode` de 6 dígitos válido 10 min. El player llama a `POST /api/screens/pair { pairingCode }` (sin auth) y recibe un token de larga duración para autenticar el polling.
- **Polling del player**: `GET /api/player/current-playlist` con `Authorization: Bearer <token de pantalla>`. Resuelve la `Schedule` activa según hora/día en la timezone del restaurante y devuelve la playlist con URLs firmadas (SAS) de cada media.
- **Revocar una pantalla**: `POST /api/screens/:id/pairing-code` invalida el token anterior (borra el hash) y genera un nuevo código para re-emparejar.
- **Borrado**: todos los `DELETE` son físicos; antes de borrar se inserta un snapshot JSON en `AuditLogs` dentro de la misma transacción.

## Pendiente (próximas fases)

- Middleware de scoping multi-tenant real (que OrgAdmin solo vea/edite su propia organización, LocationAdmin solo su restaurante).
- Registro/gestión de usuarios (`POST /api/users`) — de momento hay que insertarlos manualmente o vía script.
- Miniaturas de video (generación server-side o en el cliente antes de subir).
- Rate limiting / lockout en `/api/auth/login`.
