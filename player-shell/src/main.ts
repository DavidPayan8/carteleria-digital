import { app, BrowserWindow, Display, screen } from "electron";

// URL del player web (el mismo proyecto de player/, sin cambios). En producción
// apunta al build servido localmente o alojado centralmente; configurable por
// si el player no vive en localhost:5500 en el dispositivo real.
const PLAYER_URL = process.env.PLAYER_URL ?? "http://localhost:5500";

// Escape hatch para desarrollo: PLAYER_SHELL_WINDOWED=1 abre ventanas normales
// en vez de kiosko a pantalla completa, para poder probar sin tomar el control
// de todo el monitor de desarrollo.
const WINDOWED = process.env.PLAYER_SHELL_WINDOWED === "1";

const windowsByDisplayId = new Map<number, BrowserWindow>();

// Numeración de pantallas ESTABLE durante toda la vida del proceso: se asigna
// una vez por display.id (de izquierda a derecha, la primera vez que se ve
// cada monitor) y se conserva aunque ese monitor se desconecte y reconecte
// más tarde (ej. una TV que se apaga por la noche sin reiniciar el PC). Así
// recupera su misma partición de sesión — y su mismo emparejamiento — sin
// intervención manual. El coste es que la numeración puede tener huecos si
// un monitor se sustituye permanentemente por otro distinto; se prioriza
// estabilidad frente a una numeración siempre perfectamente consecutiva.
const displayNumbers = new Map<number, number>();
let nextDisplayNumber = 1;

function displaysOrderedLeftToRight(): Display[] {
  return screen.getAllDisplays().slice().sort((a, b) => a.bounds.x - b.bounds.x);
}

function getOrAssignDisplayNumber(display: Display): number {
  const existing = displayNumbers.get(display.id);
  if (existing) return existing;
  const assigned = nextDisplayNumber++;
  displayNumbers.set(display.id, assigned);
  return assigned;
}

function createWindowForDisplay(display: Display, displayNumber: number): void {
  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: WINDOWED ? Math.min(960, display.bounds.width) : display.bounds.width,
    height: WINDOWED ? Math.min(600, display.bounds.height) : display.bounds.height,
    kiosk: !WINDOWED,
    frame: WINDOWED,
    autoHideMenuBar: true,
    webPreferences: {
      // Partición de sesión aislada por pantalla: cada ventana guarda su
      // propio emparejamiento (localStorage/IndexedDB) sin pisar el de las
      // demás, aunque todas carguen la misma URL.
      partition: `persist:screen-${displayNumber}`,
    },
  });

  win.loadURL(`${PLAYER_URL}?displayLabel=${displayNumber}`);
  windowsByDisplayId.set(display.id, win);

  // Un kiosko de cara al cliente no debe quedarse con la pantalla en negro:
  // si el proceso de render muere o deja de responder, se reabre la ventana.
  win.webContents.on("render-process-gone", () => {
    windowsByDisplayId.delete(display.id);
    createWindowForDisplay(display, displayNumber);
  });
  win.on("unresponsive", () => win.reload());
  win.on("closed", () => windowsByDisplayId.delete(display.id));
}

/**
 * Reconcilia las ventanas con los monitores realmente conectados ahora mismo:
 * cierra las de monitores desconectados, crea las que falten, y reposiciona
 * (sin recrear, sin perder el emparejamiento) las que solo cambiaron de
 * resolución/posición. Se llama al arrancar y cada vez que Electron detecta
 * un cambio en la configuración de pantallas.
 */
function reconcileDisplays(): void {
  const displays = displaysOrderedLeftToRight();
  const currentIds = new Set(displays.map((d) => d.id));

  for (const [displayId, win] of [...windowsByDisplayId]) {
    if (!currentIds.has(displayId)) {
      if (!win.isDestroyed()) win.destroy();
      windowsByDisplayId.delete(displayId);
    }
  }

  for (const display of displays) {
    const displayNumber = getOrAssignDisplayNumber(display);
    const existing = windowsByDisplayId.get(display.id);
    if (existing && !existing.isDestroyed()) {
      existing.setBounds({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
      });
    } else {
      createWindowForDisplay(display, displayNumber);
    }
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    reconcileDisplays();
    screen.on("display-added", reconcileDisplays);
    screen.on("display-removed", reconcileDisplays);
    screen.on("display-metrics-changed", reconcileDisplays);
  });

  // No es una app de escritorio normal: si por lo que sea se cierran todas
  // las ventanas (crash, usuario con Alt+F4), se vuelven a abrir en vez de
  // salir de la aplicación.
  app.on("window-all-closed", () => {
    reconcileDisplays();
  });
}
