import "./style.css";
import { onLog, log } from "./logger";
import { renderPairingForm } from "./pairing";
import { Renderer } from "./renderer";
import { ResolvedItem, Scheduler, ZoneLayout } from "./scheduler";
import { clearSession, loadSession } from "./session";

const root = document.querySelector<HTMLDivElement>("#app")!;

interface ZoneHandle {
  el: HTMLElement;
  renderer: Renderer;
  emptyEl: HTMLElement;
}

function renderPlayerShell() {
  root.innerHTML = `
    <div id="zones"></div>
    <div id="status" class="status"></div>
    <button id="fullscreen-btn" class="fullscreen-btn" title="Pantalla completa (tecla F)">⛶</button>
  `;
  return {
    zonesContainer: root.querySelector<HTMLDivElement>("#zones")!,
    status: root.querySelector<HTMLDivElement>("#status")!,
  };
}

function startPlayerView(): void {
  const session = loadSession();
  if (!session) return;
  const screenIdLabel = session.screenId.slice(0, 8);

  const { zonesContainer, status } = renderPlayerShell();
  const displayLabel = new URLSearchParams(location.search).get("displayLabel");
  const zones = new Map<string, ZoneHandle>();
  const zoneItemInfo = new Map<string, string>();
  let recentLogs: readonly string[] = [];
  let diagnosticsVisible = false;

  function refreshDiagnostics(): void {
    if (!diagnosticsVisible) return;
    const header = displayLabel ? `Monitor ${displayLabel} · Pantalla ${screenIdLabel}…` : `Pantalla ${screenIdLabel}…`;
    status.textContent = [header, ...zoneItemInfo.values(), "", ...recentLogs.slice(-8)].join("\n");
  }

  onLog((lines) => {
    recentLogs = lines;
    refreshDiagnostics();
  });

  function applyLayout(el: HTMLElement, layout: ZoneLayout): void {
    el.style.left = `${layout.x}%`;
    el.style.top = `${layout.y}%`;
    el.style.width = `${layout.width}%`;
    el.style.height = `${layout.height}%`;
    el.style.zIndex = String(layout.zIndex);
  }

  function ensureZone(zoneId: string, layout: ZoneLayout): ZoneHandle {
    let handle = zones.get(zoneId);
    if (handle) return handle;

    const el = document.createElement("div");
    el.className = "zone";
    applyLayout(el, layout);

    const slidesEl = document.createElement("div");
    slidesEl.className = "zone-slides";
    el.appendChild(slidesEl);

    // El mensaje amistoso de "sin programación" solo tiene sentido a pantalla
    // completa (zona "full"); con varias zonas, una vacía simplemente queda en
    // negro para no amontonar texto superpuesto.
    const emptyEl = document.createElement("div");
    emptyEl.className = "empty";
    emptyEl.style.display = "none";
    if (zoneId === "full") {
      emptyEl.innerHTML = `
        <div class="empty-title">Sin programación activa</div>
        <div class="empty-sub">Esperando una Playlist asignada por Schedule…</div>
      `;
    }
    el.appendChild(emptyEl);

    zonesContainer.appendChild(el);

    const renderer = new Renderer(slidesEl, (index, total) => {
      zoneItemInfo.set(zoneId, `  zona ${zoneId.slice(0, 8)}… · item ${index + 1}/${total}`);
      refreshDiagnostics();
    });

    handle = { el, renderer, emptyEl };
    zones.set(zoneId, handle);
    return handle;
  }

  const scheduler = new Scheduler(session, {
    onZoneUpdate: (zoneId, layout, items: ResolvedItem[] | null) => {
      const handle = ensureZone(zoneId, layout);
      if (!items || items.length === 0) {
        handle.renderer.setItems([]);
        handle.emptyEl.style.display = "flex";
        zoneItemInfo.delete(zoneId);
        refreshDiagnostics();
        return;
      }
      handle.emptyEl.style.display = "none";
      handle.renderer.setItems(items);
    },
    onZoneLayoutChanged: (zoneId, layout) => {
      const handle = zones.get(zoneId);
      if (!handle) return; // aún no existe (se resolverá como alta normal en el próximo onZoneUpdate)
      applyLayout(handle.el, layout);
    },
    onZoneRemoved: (zoneId) => {
      const handle = zones.get(zoneId);
      if (!handle) return;
      handle.renderer.stop();
      handle.el.remove();
      zones.delete(zoneId);
      zoneItemInfo.delete(zoneId);
      refreshDiagnostics();
    },
    onAuthError: () => {
      log("Token revocado desde el panel admin: volviendo a pedir emparejamiento");
      scheduler.stop();
      zones.forEach((z) => z.renderer.stop());
      clearSession();
      renderPairingForm(root, startPlayerView);
    },
  });
  scheduler.start();

  // Panel de diagnóstico deliberadamente oculto por defecto: no debe verse
  // superpuesto sobre el contenido real de cara al cliente del restaurante.
  // Se activa a propósito con la tecla "i" para soporte remoto.
  window.addEventListener("keydown", (e) => {
    if (e.key === "i") {
      diagnosticsVisible = !diagnosticsVisible;
      status.classList.toggle("diagnostics", diagnosticsVisible);
      status.textContent = "";
      refreshDiagnostics();
    }
    if (e.key === "f") document.documentElement.requestFullscreen().catch(() => {});
  });

  root.querySelector<HTMLButtonElement>("#fullscreen-btn")!.addEventListener("click", () => {
    document.documentElement.requestFullscreen().catch(() => {});
  });
}

function boot(): void {
  if (loadSession()) {
    startPlayerView();
  } else {
    renderPairingForm(root, startPlayerView);
  }
}

boot();
