# Frontend — Panel Admin (SignageFlow)

Angular 20 (standalone components) + Tailwind CSS. Diseño inspirado en el mockup Stitch subido en
`stitch_signage_os_enterprise/` (rama `main`) — paleta "Slate & Navy", Inter + JetBrains Mono, radios de 6px
(ver `stitch_signage_os_enterprise/stitch_signage_os_enterprise/signageflow_precision_system/DESIGN.md`).

No es una réplica pixel-perfect del mockup, pero sigue el mismo lenguaje visual y estructura de navegación
(sidebar fijo 240px, Dashboard / Pantallas / Media Library / Playlists / Programaciones / Auditoría).

## Setup

```bash
npm install
```

Por defecto apunta a `http://localhost:4000/api` (ver `src/environments/environment.ts`) — ajusta esa URL si el
backend corre en otro host/puerto.

## Desarrollo

```bash
npm start   # ng serve, http://localhost:4200
```

Necesita el backend (`../backend`) corriendo y con al menos un usuario creado a mano en la BD (todavía no hay
endpoint de registro — ver README del backend) para poder hacer login.

## Estructura

```
src/app/
  core/
    models/       interfaces TS que reflejan las respuestas del backend
    services/     un servicio HTTP por dominio (organizations, locations, screens, media, playlists, schedules, audit)
                  + auth.service (login/sesión) y workspace.service (organización/restaurante seleccionados)
    interceptors/ inyecta el JWT en cada request, desloguea en 401
    guards/       auth.guard protege las rutas del panel
  layout/         shell.ts — sidebar + topbar + selector de organización/restaurante
  pages/          una carpeta por pantalla (login, dashboard, organizations, locations, screens, media, playlists, schedules, audit)
```

## Notas / pendiente

- El selector de organización/restaurante en la topbar (`WorkspaceService`) es el contexto que usan el resto de
  páginas — sin organización seleccionada, Pantallas/Media/Playlists/Programaciones no muestran nada.
- El editor de Playlists reordena con botones ◀ ▶ en vez de drag & drop (el mockup usa drag & drop; se dejó
  fuera del MVP por tiempo, pero el backend ya soporta reorder completo vía `POST /playlists/:id/items/reorder`).
- No hay gestión de `ScreenGroups` en la UI todavía (el backend lo soporta) — las Programaciones solo permiten
  elegir entre "una pantalla concreta" o "todo el restaurante".
- No hay página de gestión de usuarios todavía.

## Building

```bash
ng build
```
