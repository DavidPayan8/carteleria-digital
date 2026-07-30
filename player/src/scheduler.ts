import { AuthError, fetchCurrentPlaylist } from "./api";
import { log } from "./logger";
import { ensureCached, getCachedObjectUrl, prune } from "./mediaCache";
import { loadLastZones, saveLastZones } from "./playlistCache";
import type { CurrentPlaylistResponse, NormalizedZone, PlaylistItemDto, Session } from "./types";

export interface ResolvedItem extends PlaylistItemDto {
  /** blob: URL si el item está cacheado localmente; si no, la URL firmada (SAS) tal cual llegó. */
  playbackUrl: string;
}

export interface ZoneLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface SchedulerCallbacks {
  /** Se llama solo para la(s) zona(s) cuyo contenido cambió; el resto sigue reproduciendo sin interrupción. */
  onZoneUpdate(zoneId: string, layout: ZoneLayout, items: ResolvedItem[] | null): void;
  /** Cambió solo la posición/tamaño/orden de la zona (ej. se movió en el editor), no su contenido: reposicionar sin reiniciar la reproducción en curso. */
  onZoneLayoutChanged(zoneId: string, layout: ZoneLayout): void;
  /** La zona ya no existe (se borró o cambió el layout): quitar su contenedor. */
  onZoneRemoved(zoneId: string): void;
  onAuthError(): void;
}

function layoutKey(zone: NormalizedZone): string {
  return `${zone.x}|${zone.y}|${zone.width}|${zone.height}|${zone.zIndex}`;
}

/**
 * Una pantalla sin zonas configuradas se trata como una única zona "full" a
 * pantalla completa — así el resto del player no distingue los dos casos.
 */
function normalizeToZones(data: CurrentPlaylistResponse): NormalizedZone[] {
  if (data.layout === "zones") {
    return data.zones.map((z) => ({
      id: z.id,
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height,
      zIndex: z.zIndex,
      playlist: z.playlist,
    }));
  }
  return [{ id: "full", x: 0, y: 0, width: 100, height: 100, zIndex: 0, playlist: data.playlist }];
}

async function resolveItems(items: PlaylistItemDto[]): Promise<ResolvedItem[]> {
  await Promise.all(items.map((item) => ensureCached(item.id, item.url)));
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      playbackUrl: (await getCachedObjectUrl(item.id)) ?? item.url,
    })),
  );
}

export class Scheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private intervalSeconds: number;
  private lastPollFailed = false;
  /** Versión actualmente mostrada por zona (null = zona sin playlist activa). */
  private zoneVersions = new Map<string, string | null>();
  /** Última posición/tamaño/orden aplicado por zona, para detectar cambios de layout aunque el contenido no cambie. */
  private zoneLayouts = new Map<string, string>();

  constructor(
    private readonly session: Session,
    private readonly callbacks: SchedulerCallbacks,
  ) {
    this.intervalSeconds = session.pollingIntervalSeconds;
  }

  start(): void {
    void this.poll();
    this.timer = setInterval(() => void this.poll(), this.intervalSeconds * 1000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async poll(): Promise<void> {
    try {
      const data = await fetchCurrentPlaylist(this.session.apiBase, this.session.token);

      if (this.lastPollFailed) {
        log("Conexión con el backend recuperada");
        this.lastPollFailed = false;
      }

      if (data.pollingIntervalSeconds && data.pollingIntervalSeconds !== this.intervalSeconds) {
        this.intervalSeconds = data.pollingIntervalSeconds;
        this.restartTimer();
      }

      const zones = normalizeToZones(data);
      saveLastZones(zones);
      void prune(zones.flatMap((z) => z.playlist?.items.map((i) => i.id) ?? []));

      await this.applyZones(zones);
    } catch (err) {
      if (err instanceof AuthError) {
        this.callbacks.onAuthError();
        return;
      }
      this.lastPollFailed = true;
      log(`Sin conexión con el backend (${(err as Error).message})`);
      await this.fallbackToLastKnownIfIdle();
    }
  }

  private async applyZones(zones: NormalizedZone[]): Promise<void> {
    const seenIds = new Set(zones.map((z) => z.id));
    for (const existingId of this.zoneVersions.keys()) {
      if (!seenIds.has(existingId)) {
        this.zoneVersions.delete(existingId);
        this.zoneLayouts.delete(existingId);
        this.callbacks.onZoneRemoved(existingId);
      }
    }

    for (const zone of zones) {
      const newVersion = zone.playlist?.version ?? null;
      const newLayoutKey = layoutKey(zone);
      const contentChanged = this.zoneVersions.get(zone.id) !== newVersion || !this.zoneVersions.has(zone.id);
      const layoutChanged = this.zoneLayouts.get(zone.id) !== newLayoutKey;
      if (!contentChanged && !layoutChanged) continue; // sin cambios, no toca nada

      const layout = { x: zone.x, y: zone.y, width: zone.width, height: zone.height, zIndex: zone.zIndex };
      this.zoneLayouts.set(zone.id, newLayoutKey);

      if (!contentChanged) {
        // Solo se movió/redimensionó/reordenó: reposicionar sin interrumpir la reproducción en curso.
        this.callbacks.onZoneLayoutChanged(zone.id, layout);
        continue;
      }

      this.zoneVersions.set(zone.id, newVersion);
      if (!zone.playlist) {
        this.callbacks.onZoneUpdate(zone.id, layout, null);
        continue;
      }
      const items = await resolveItems(zone.playlist.items);
      this.callbacks.onZoneUpdate(zone.id, layout, items);
    }
  }

  /** Solo actúa si nunca llegó a reproducir nada: si ya hay algo en pantalla, se deja tal cual. */
  private async fallbackToLastKnownIfIdle(): Promise<void> {
    if (this.zoneVersions.size > 0) return;
    const last = loadLastZones();
    if (!last || last.length === 0) return;
    log("Reproduciendo la última configuración conocida en caché");
    await this.applyZones(last);
  }

  private restartTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => void this.poll(), this.intervalSeconds * 1000);
  }
}
