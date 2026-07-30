# Player Shell — Cartelería Digital

Envoltorio Electron para desplegar el [player web](../player) en un PC con varios monitores conectados por HDMI (un HDMI = un `Screen` independiente en el sistema). No modifica el player en absoluto: solo abre una ventana kiosko por cada monitor detectado y la apunta a la misma URL del player.

## Qué resuelve

- **Numeración de pantallas**: los monitores se numeran de izquierda a derecha según su posición física en el escritorio extendido (la misma lógica que usa Windows en *Configuración > Pantalla*). Cada ventana carga el player con `?displayLabel=N`, así que durante el emparejamiento aparece un rótulo **"Pantalla N"** — el instalador ve directamente, mirando el monitor, qué código de emparejamiento introducir ahí. No hace falta ninguna configuración manual de mapeo.
- **Sesiones aisladas por monitor**: cada ventana usa una `session.partition` distinta (`persist:screen-1`, `persist:screen-2`, ...), así que cada una guarda su propio emparejamiento sin pisar el de las demás, aunque las tres carguen exactamente la misma URL. Sin esto, abrir 3 ventanas del mismo navegador compartiría `localStorage` y el emparejamiento de una pisaría el de las otras.
- **Recuperación automática**: si el proceso de una ventana muere o deja de responder, se reabre sola — no hay forma de que una pantalla se quede en negro indefinidamente sin intervención manual.
- **Reconexión de monitores en caliente**: si una TV se apaga/enciende por la noche (pierde HDMI) sin reiniciar el PC, el shell detecta el cambio (`display-added`/`display-removed`/`display-metrics-changed`) y recrea solo la ventana afectada — recupera automáticamente su mismo número de pantalla y, por tanto, su mismo emparejamiento (la partición de sesión vive en disco, no se pierde). Un simple cambio de resolución no destruye la ventana, solo la reposiciona. La numeración se asigna una vez por monitor físico y se conserva mientras el proceso siga vivo; si un monitor se sustituye permanentemente por otro, el nuevo recibe el siguiente número libre (no reutiliza huecos).

## Desarrollo

```bash
npm install
npm run build

# Modo ventana normal (no kiosko), para probar sin invadir el monitor de desarrollo:
PLAYER_SHELL_WINDOWED=1 npx electron ./dist/main.js

# Modo kiosko real (el que se usa en producción):
npx electron ./dist/main.js
```

> **Importante**: hay que pasarle la ruta explícita `./dist/main.js`, no solo `.` — con algunos `npx`/PowerShell, `electron .` no resuelve bien el `main` de `package.json` y acaba abriendo la app de bienvenida por defecto de Electron en vez de la nuestra.
>
> Alternativa más corta, hace build + arranque en un solo paso: `npm start` (usa internamente esta misma ruta explícita).

Por defecto apunta a `http://localhost:5500` (el player servido en local). Para apuntar a otra URL:

```bash
PLAYER_URL=https://player.tudominio.com npx electron ./dist/main.js
```

## Despliegue en el PC del cliente

1. Instalar el player (`player/`) como servicio local (`npm run preview`, o servido con nginx/IIS) o apuntar `PLAYER_URL` a una instancia alojada centralmente.
2. Colocar un acceso directo a `player-shell` (o al `.exe` empaquetado, ver más abajo) en la carpeta de Inicio de Windows (`shell:startup`) para que arranque solo al encender el PC.
3. Arrancar: detecta los 3 monitores automáticamente y abre una ventana kiosko en cada uno. La primera vez, cada ventana pedirá su propio código de emparejamiento (créalo desde el panel admin, uno por pantalla).

## Pendiente / siguiente paso natural

Empaquetar con `electron-builder` para generar un instalador/`.exe` distribuible en vez de correr `electron .` desde el código fuente — no se ha hecho en esta pasada para mantener el alcance acotado, pero es una adición pequeña sobre esta base.
