# Backend — Cartelería Digital

Node + Express + TypeScript + Prisma, sobre SQL Server. Media en Azure Blob Storage. ESM puro (`"type": "module"` en `package.json`) — ver la sección "ESM y Prisma 7" más abajo.

## Setup

```bash
npm install
cp .env.example .env   # completar DATABASE_URL, JWT secrets, AZURE_STORAGE_CONNECTION_STRING y CORS_ORIGIN
```

## Base de datos

Prisma Migrate no crea la base de datos en SQL Server (a diferencia de Postgres/MySQL): hay que crearla a mano una vez por entorno, conectado a `master`, con [`db/create-database.sql`](../db/create-database.sql). El nombre debe coincidir con el de `DATABASE_URL` en `.env`.

```bash
npm run prisma:migrate   # crea las tablas en tu SQL Server según prisma/schema.prisma
npm run prisma:seed      # inserta los roles base + organización/restaurante/usuario de prueba
```

`prisma/schema.prisma` es la fuente de verdad para migraciones. `db/schema.sql` (en la raíz del repo) queda como documento de diseño/referencia — no se ejecuta directamente.

El seed deja dos usuarios de prueba para hacer login contra `POST /api/auth/login`:

| Rol        | Email                  | Password          |
|------------|------------------------|-------------------|
| OrgAdmin   | admin@demo.local       | Demo1234!          |
| SuperAdmin | superadmin@demo.local  | SuperAdmin1234!    |

> Cambia o borra estos usuarios antes de desplegar a producción.

> **Nota**: la restricción "un Schedule apunta a exactamente uno de screenId/screenGroupId/locationId/screenZoneId" se valida en la app (`assertSingleTarget` en `schedules.controller.ts`) **y** a nivel de base de datos (`CK_Schedules_OneTarget`, añadido a mano en la migración correspondiente — Prisma no soporta CHECK constraints multi-columna de forma declarativa).

## Desarrollo

```bash
npm run dev
```

Sirve en `http://localhost:4000`. Healthcheck: `GET /health`.

## Estructura

```
src/
  config/       env, cliente Prisma, constantes de rol (ROLE)
  middleware/   auth de usuarios (JWT), auth de pantallas, manejo de errores
  modules/      un folder por dominio: auth, organizations, locations, screens, screenZones,
                media, playlists, schedules, player, audit
  utils/        jwt, hashing, Azure Blob, audit log, resolución de programación
```

## Flujos clave

- **Emparejar una pantalla**: crear el `Screen` desde el panel (`POST /api/screens`) genera un `pairingCode` de 6 dígitos válido 10 min. El player llama a `POST /api/screens/pair { pairingCode }` (sin auth) y recibe un token de larga duración para autenticar el polling.
- **Polling del player**: `GET /api/player/current-playlist` con `Authorization: Bearer <token de pantalla>`. Resuelve la `Schedule` activa según hora/día en la timezone del restaurante y devuelve la playlist con URLs firmadas (SAS) de cada media.
- **Revocar una pantalla**: `POST /api/screens/:id/pairing-code` invalida el token anterior y genera un nuevo código para re-emparejar (equivalente a desemparejar + emitir código en un paso). `POST /api/screens/:id/unpair` solo revoca, sin generar código nuevo todavía.
- **Layout multi-zona**: `GET/POST/PATCH/DELETE /api/screen-zones` gestiona las zonas de una pantalla (posición/tamaño en % + `zIndex`). Una `Schedule` puede apuntar a `screenZoneId` en vez de `screenId`/`screenGroupId`/`locationId`. El polling del player (`resolveActiveSchedule`) devuelve `layout: "zones"` con una playlist resuelta por zona si la pantalla tiene alguna configurada, o `layout: "single"` (comportamiento de siempre) si no.
- **Borrado**: todos los `DELETE` son físicos; antes de borrar se inserta un snapshot JSON en `AuditLogs` dentro de la misma transacción.

## Scoping multi-tenant

`src/middleware/scope.ts` deriva el alcance de datos (`Scope`) del JWT del usuario: SuperAdmin no tiene restricción; OrgAdmin queda restringido a su `organizationId`; LocationAdmin/Viewer con `locationId` en su(s) `UserRole` quedan restringidos a esas locations concretas. Cada controller (`organizations`, `locations`, `screens`, `screenZones`, `media`, `playlists`, `schedules`, `audit`) aplica ese scope tanto en los listados (filtrando el `where` de Prisma) como en get/create/update/delete de un recurso concreto (comprobando pertenencia antes de actuar, con un 403 si no coincide). Esto evita que un usuario autenticado pueda leer o modificar datos de otra organización/restaurante simplemente cambiando el `id` en la URL o el query string.

## CORS y rate limiting

`CORS_ORIGIN` (en `.env`, separado por comas) restringe qué orígenes pueden llamar a la API — debe incluir tanto el panel admin como el player, ya que este último corre en su propio origen (`http://localhost:5500` por defecto) y llama a la API directamente desde el navegador/Electron del dispositivo. En producción, apunta a las URLs reales desplegadas.

`POST /api/auth/login` está limitado a 10 intentos cada 15 minutos por IP (`src/middleware/rateLimit.ts`, vía `express-rate-limit`) para dificultar la fuerza bruta de contraseñas. Es un límite por IP, no bloqueo por cuenta — no requiere cambios en el modelo `User`.

## ESM y Prisma 7

Prisma 7 exige ESM puro y un driver adapter explícito (ya no genera un motor de query embebido ni acepta `datasource.url` directamente en el schema). Esto obligó a convertir todo el backend de CommonJS a ESM, no fue solo un bump de versión:

- `package.json` tiene `"type": "module"`; `tsconfig.json` usa `module`/`moduleResolution: "NodeNext"`. Todos los imports relativos llevan extensión `.js` explícita (`from "../../config/prisma.js"`) — es la convención de TypeScript en ESM: el código fuente es `.ts`, pero el import apunta al nombre del archivo *compilado*, porque la resolución de módulos de Node en ESM (a diferencia de CommonJS) no completa extensiones por su cuenta.
- El cliente de Prisma ya no se genera en `node_modules/.prisma/client` ni se importa desde `@prisma/client`. El generador `prisma-client` (`prisma/schema.prisma`, bloque `generator client`) emite código TypeScript fuente en `src/generated/prisma/` (gitignored, se regenera con `npm run prisma:generate` — ejecutar tras cada `npm install`). Como es código fuente, no un paquete precompilado, tiene que vivir dentro de `src/` para que `tsc` lo compile junto al resto en `npm run build`.
- La conexión a SQL Server se instancia explícitamente en `src/config/prisma.ts` vía `@prisma/adapter-mssql`, usando el mismo `DATABASE_URL` de siempre (el adapter acepta la connection string JDBC tal cual, sin parsearla en campos sueltos).
- `prisma.config.ts` (en la raíz del proyecto) sustituye la configuración que antes vivía en el propio `schema.prisma` / en el bloque `"prisma"` de `package.json`: ahí se declaran la ruta del schema, las migraciones y el script de seed.
- `Prisma`/`PrismaClient`/`Prisma.TransactionClient` se importan siempre desde `src/generated/prisma/client.js` (nunca desde el paquete `@prisma/client` a secas, que sigue instalado porque el cliente generado lo usa internamente como runtime, pero ya no expone los tipos de *este* schema).

## Dependencias

Actualizadas a su última major: `prisma`/`@prisma/client` 7 (ver arriba), `express` 5, `zod` 4, `bcryptjs` 3, `dotenv` 17, `helmet` 8 (y `@types/multer` a 2.x, que ya no coincidía con el `multer` 2.x instalado). Notas de la migración:

- `zod` 4 deprecó `ZodError.prototype.flatten()` en favor de `z.treeifyError()` (usado en `errorHandler.ts`); el resto de la API (`.uuid()`, `.email()`, `.default()`, `.coerce`, etc.) sigue funcionando igual que en v3.
- El `@types/express` de Express 5 tipa los route params como `string | string[]` en vez de `string` (para soportar wildcards tipo `*splat`, que esta app no usa). `src/utils/asyncHandler.ts` los tipa de vuelta a `string` en un único punto para no tener que castear `req.params.id` en cada controller.

**Deliberadamente sin actualizar**: `typescript` y `@types/node` — se dejaron para no mezclar más cambios en la misma pasada (y `@types/node` en concreto no debería subir a v26 mientras el runtime siga en Node 20).

## Miniaturas de video

Se generan en el cliente al subir: el frontend (`frontend/src/app/pages/media/media.ts`) monta un `<video>` oculto, salta a la mitad del clip (o a 1s) para evitar capturar un frame negro, dibuja ese frame en un `<canvas>` y sube el JPEG resultante junto al archivo original, en el mismo `multipart/form-data` (campo `thumbnail`). El backend (`POST /api/media`, con `multer.fields()`) lo sube a Azure Blob junto al vídeo y guarda su ruta en `Media.thumbnailBlobPath`; `withSasUrl` genera su URL firmada (`thumbnailUrl`) igual que para el archivo principal. Si la captura falla o tarda más de 4s (el evento `seeked` no es 100% fiable entre navegadores/formatos), la subida sigue adelante sin miniatura en vez de quedarse colgada.

## Gestión de usuarios

`POST/GET /api/users` y `DELETE /api/users/:id` (`src/modules/users/`) — solo SuperAdmin y OrgAdmin pueden acceder (bloqueado a nivel de ruta para LocationAdmin/Viewer). Dentro del controller:

- **SuperAdmin**: sin restricción — puede crear un usuario con cualquier rol (incluido otro SuperAdmin, que no lleva `organizationId`) en cualquier organización.
- **OrgAdmin**: solo puede crear/listar/borrar usuarios de su propia organización (`req.user.organizationId`), y nunca puede asignar el rol SuperAdmin.
- Crear un `LocationAdmin` exige `locationId`, y se valida que esa location pertenezca a la organización indicada.
- El snapshot que se guarda en el audit log al borrar un usuario excluye deliberadamente `passwordHash`.

El frontend (`frontend/src/app/pages/users/`) adapta el formulario de alta según el rol de quien lo usa: un OrgAdmin no ve el selector de organización (implícita, la suya) ni la opción SuperAdmin en el selector de rol; un SuperAdmin sí ve ambos, y el selector de restaurante para `LocationAdmin` se recarga dinámicamente según la organización elegida en el propio formulario (no la del selector de cabecera).

