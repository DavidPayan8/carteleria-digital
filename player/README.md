# Player — Cartelería Digital

Cliente web que corre en la pantalla física: emparejamiento por código, polling de la playlist activa y reproducción en bucle. TypeScript + Vite, sin framework (arranque ligero, importante en hardware embebido).

## Estructura

```
src/
  types.ts          tipos compartidos (Session, PlaylistDto, ...)
  config.ts          URL del backend, fija por .env (VITE_API_BASE)
  api.ts            cliente HTTP tipado (pairScreen, fetchCurrentPlaylist)
  session.ts        persistencia del emparejamiento (localStorage)
  scheduler.ts       polling + detección de cambios de versión + fallback offline
  mediaCache.ts      caché de blobs de media en IndexedDB (keyed por item.id, no por URL)
  playlistCache.ts   última playlist conocida (localStorage), para arrancar sin red
  renderer.ts        cola de reproducción: precarga solo actual+siguiente, crossfade, loop
  pairing.ts         vista de emparejamiento
  logger.ts          buffer de logs recientes (para el panel de diagnóstico)
  app.ts             orquesta todo lo anterior
```

## Desarrollo

```bash
npm install
cp .env.example .env   # completar VITE_API_BASE con la URL real del backend
npm run dev             # http://localhost:5173, hot reload
```

## Producción (en el dispositivo)

```bash
npm install
cp .env.example .env   # VITE_API_BASE del backend real, antes de compilar
npm run build            # genera dist/ (bundle estático) con esa URL horneada dentro
npm run preview          # sirve dist/ en http://localhost:5500
```

`dist/` es un sitio 100% estático: se puede copiar a cualquier hosting o servir con cualquier servidor de archivos (nginx, `serve`, etc.), no necesita Node en producción salvo para `vite preview`.

**La URL del backend no es editable desde la pantalla** — se fija una vez en `.env` al compilar (`VITE_API_BASE`), no aparece en el formulario de emparejamiento. El cliente/instalador solo ve el código de 6 dígitos.

## Layouts multi-zona

`/player/current-playlist` puede devolver `layout: "single"` (una playlist a pantalla completa, el caso de
siempre) o `layout: "zones"` (la pantalla está dividida en regiones desde el panel admin, cada una con su
propia playlist/horario). El player normaliza ambos casos internamente a "N zonas" (una pantalla sin zonas
configuradas se trata como una única zona `full` al 100%), así que el resto del código (caché, renderer) no
distingue los dos casos. Cada zona corre su propio `Scheduler`+`Renderer` independiente: si solo cambia el
contenido de una zona, las demás siguen reproduciendo sin interrupción; si solo cambia la posición/orden de
una zona (se movió en el editor), se reposiciona sin reiniciar su reproducción en curso.

## Resiliencia offline

- Cada media de la playlist se descarga una vez y se cachea en IndexedDB, indexado por el `id` del item (no por la URL: las URLs son SAS de Azure con firma que expira y cambia en cada poll).
- Si el poll al backend falla (sin red, backend caído) y la pantalla **ya estaba reproduciendo algo**, no pasa nada: el player sigue el bucle con lo que tiene cacheado.
- Si el poll falla y el player **arranca en frío sin conexión** (ej. reinicio del dispositivo sin wifi), recurre a la última playlist conocida guardada en `localStorage` y a los blobs ya cacheados.
- Cuando cambia la playlist, se podan del caché los items que ya no pertenecen a la versión vigente.

## Diagnóstico en pantalla

Deliberadamente **no** hay ningún overlay visible por defecto sobre el contenido — es una pantalla de cara al cliente del restaurante, no un panel de debug. Para soporte remoto:

- Tecla **`i`**: muestra/oculta un panel con el item en reproducción y los últimos logs.
- Tecla **`f`** o el botón discreto de la esquina: activa pantalla completa (Fullscreen API; requiere un gesto del usuario, los navegadores no permiten activarla sola al cargar).

## Despliegue recomendado en el dispositivo (mini PC / Raspberry Pi)

Chromium en modo kiosko, arrancando solo al encender:

```bash
chromium --kiosk --noerrdialogs --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --disable-pinch --overscroll-history-navigation=0 \
  http://localhost:5500
```

Recomendado envolver el arranque en un servicio `systemd` con `Restart=always`, y deshabilitar salvapantallas/suspensión del SO. Si más adelante hace falta gestión remota a mayor escala (reinicio remoto, monitorización centralizada de muchas pantallas), se puede empaquetar este mismo `dist/` en una app Electron sin tocar el código del player.

## PC con varios monitores (varios HDMI = varias pantallas)

Para ese caso, en vez de Chromium en modo kiosko a pelo, usar [`../player-shell`](../player-shell): abre una
ventana kiosko por monitor detectado, cada una emparejada a un `Screen` distinto, sin tocar nada de este
proyecto (carga la misma URL, cada ventana con su propia sesión aislada).
